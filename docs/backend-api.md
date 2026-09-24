# Backend API for the Design Your Pet app

The app talks to the goodwookie.com Wix site through a small set of
[HTTP functions](https://dev.wix.com/docs/velo/apis/wix-http-functions/introduction).
They should wrap the logic the website already uses (`aiDesign.web.js`,
`petDesigns.js`), so the app and the site share one generator, one set of
limits and one store.

The app's side of this contract is `src/api/types.ts` (interface) and
`src/api/http.ts` (client). Until these endpoints exist, the app runs on the
built-in mock in `src/api/mock.ts`, which follows the same rules.

## Setup

- All endpoints live under one Wix HTTP function prefix, `dyp`:
  `https://www.goodwookie.com/_functions/dyp/...`
  In `backend/http-functions.js` that means exporting `get_dyp` and `post_dyp`
  and routing on `request.path`.
- The app sets `EXPO_PUBLIC_API_BASE_URL=https://www.goodwookie.com` to switch
  from the mock to these endpoints.
- Every request carries `deviceId`, the random ID the app stores per install
  (the "device identifier" in the privacy policy). It is **not**
  authentication. Treat it like the website's visitor ID: use it to scope
  designs, limits and order lookups, never to grant access to anything else.

## Errors

Any non-2xx response has this body:

```json
{ "error": { "code": "LIMIT_REACHED", "message": "optional human text", "unlocksAt": "2026-09-24T20:14:00Z" } }
```

| `code` | HTTP | When | App screen |
|---|---|---|---|
| `UPLOAD_FAILED` | 400 / 500 | Photo missing, unreadable or failed to store. No design record is created. | Upload failed |
| `CHECKER_UNAVAILABLE` | 503 | The photo checker is temporarily down. Uses nothing. | Photo check unavailable |
| `NO_PET` | 422 | No animal found. The photo is deleted. Uses a try, not a design. | No pet found |
| `PHOTO_REJECTED` | 422 | Photo fails the content check. `message` is shown to the customer (for example "It looks like there may be a child in it."). Uses a try, not a design. | Photo not accepted |
| `TEXT_REJECTED` | 422 | Text fails the check (profanity, protected names or titles). | Shown inline on the style screen |
| `DESIGN_FAILED` | 422 | Generation failed after the silent retry, or couldn't be cleaned up for print. Uses a try, not a design. | Design failed |
| `LIMIT_REACHED` | 429 | 5 successful designs in the rolling 24 hours. `unlocksAt` = oldest successful design + 24 h. | Limit reached |
| `TRIES_LIMIT` | 429 | 12 attempts in the rolling 24 hours. `unlocksAt` = oldest attempt + 24 h. | 12 tries |
| `STUDIO_BUSY` | 503 | Site-wide ceiling of 180 designs an hour. Uses nothing. | Studio busy |
| `DESIGN_IN_PROGRESS` | 409 | This device already has a design being made. | Inline notice on the style screen |

Times are ISO 8601 strings in UTC. The app shows them in the customer's local
time.

## Endpoints

### `POST /_functions/dyp/photos`

Multipart form: `deviceId`, `photo` (JPEG or PNG from the phone camera or
library). Stores the photo. Creates no design record, so it uses nothing.

```json
{ "photoId": "..." }
```

Errors: `UPLOAD_FAILED`.

### `POST /_functions/dyp/designs`

```json
{ "deviceId": "...", "photoId": "...", "style": "stamp | poster | evening | sticker", "text": "up to 18 characters, stamp and poster only" }
```

In this order:

1. Reject with `DESIGN_IN_PROGRESS` if the device has a design still being made
   (one in progress at a time).
2. Check the limits (`LIMIT_REACHED`, `TRIES_LIMIT`, `STUDIO_BUSY`).
3. Create the design record (this is what counts toward the 12).
4. Check the text and the photo (`TEXT_REJECTED`, `CHECKER_UNAVAILABLE`,
   `NO_PET`, `PHOTO_REJECTED`). Delete rejected and no-pet photos straight
   away.
5. Start generation and return immediately.

```json
{ "designId": "..." }
```

Generation runs in the background; the app polls the next endpoint.

### `GET /_functions/dyp/design?deviceId=…&designId=…`

```json
{
  "id": "...",
  "style": "stamp",
  "text": "Biscuit",
  "status": "processing | ready | flagged | ordered | failed | rejected",
  "createdAt": "2026-09-24T19:02:11Z",
  "previewUrl": "https://… watermarked preview only"
}
```

`previewUrl` is `null` until the design is ready. **Only the watermarked
preview is ever returned.** The print-quality file stays on the server.
Return 404 with `DESIGN_FAILED` if the design doesn't belong to the device.

### `GET /_functions/dyp/designs?deviceId=…`

Designs from the last 7 days that came out successfully (ready, flagged or
ordered), newest first:

```json
{ "designs": [ { "...": "same shape as above" } ] }
```

### `GET /_functions/dyp/limits?deviceId=…`

```json
{
  "available": 3,
  "nextDesignAt": "2026-09-24T20:14:00Z",
  "blockedBy": null,
  "unlocksAt": null
}
```

- `available`: successful designs left in the rolling 24 hours (0–5),
  from `countGoodDesignsForVisitor`.
- `nextDesignAt`: oldest successful design in the last 24 hours + 24 h, or
  `null`.
- `blockedBy`: `"in-progress" | "designs" | "tries" | null`.
- `unlocksAt`: unlock time for the limit in `blockedBy`, or `null`.

The rules match `src/lib/limits.ts`, which has tests for them.

### `POST /_functions/dyp/checkout`

```json
{
  "deviceId": "...",
  "returnUrl": "designyourpet://confirmation",
  "lines": [
    { "kind": "single", "designId": "...", "quantity": 1, "choice": { "product": "hoodie", "color": "Carolina Blue", "size": "XL" } },
    { "kind": "bundle", "designId": "...", "choices": [
      { "product": "tee", "color": "White", "size": "L" },
      { "product": "hoodie", "color": "Bone", "size": "L" },
      { "product": "sticker", "size": "4x4" },
      { "product": "poster", "size": "16x16" }
    ] }
  ]
}
```

Builds a Wix checkout from the same store products and options the website's
Add To Cart uses ("Design Your Pet Tee", "Design Your Pet Hoodie", stickers,
posters), each line tied to its design. Record the `deviceId` on the order
(for example in a custom field) so `orders` can check ownership later.

The 10% bundle discount is the store's **automatic discount**; the backend
doesn't apply it and the app only displays it.

```json
{ "checkoutUrl": "https://…" }
```

The app opens `checkoutUrl` in a secure in-app browser. After payment, Wix
must redirect to `returnUrl` with the order ID:
`designyourpet://confirmation?orderId=…`. With Wix Headless this is the
`thankYouPageUrl` callback of a redirect session; check the current Wix
eCommerce docs for the exact call. If the customer closes checkout without
paying, nothing happens and the app keeps the cart.

### `GET /_functions/dyp/orders?deviceId=…&ids=a,b,c`

Returns only orders placed with this `deviceId`:

```json
{
  "orders": [
    {
      "id": "...",
      "number": "10042",
      "createdAt": "2026-09-23T18:40:00Z",
      "status": "in-review | printing | shipped | delivered",
      "title": "Buy them all bundle",
      "itemCount": 5,
      "totalCents": 12795,
      "trackingUrl": "https://… once shipped",
      "previewUrl": "https://… watermarked"
    }
  ]
}
```

`number` is the real Wix order number, without the `#`; the app adds it.
Never generate one in the app.

## Privacy

Everything here follows `docs/privacy-policy.md`: photos go to Gemini only to
make the design and run safety checks, rejected photos are deleted straight
away, unordered designs and their photos are deleted after 7 days, and the
print file is sent only to Printful.
