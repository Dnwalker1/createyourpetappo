# Design Your Pet app: backend API

The app talks to the live goodwookie.com backend. It's a set of Wix HTTP
functions that share the website's generator, limits, store and Printful
fulfilment. The app's side of the contract is `src/api/types.ts`, with the
client in `src/api/http.ts` and its tests in `src/api/http.test.ts`.

Base URL: `https://www.goodwookie.com/_functions` (published site only).

## Configuring the app

| Variable | Value |
|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | `https://www.goodwookie.com`. Without it the app runs on the built-in mock (`src/api/mock.ts`). |
| `EXPO_PUBLIC_DESIGN_APP_KEY` | The `DESIGN_APP_KEY` secret from the Wix Secrets Manager. |

Keep the key out of git. Locally, put it in `.env.local`, which git ignores.
For EAS builds, make it an EAS environment variable for the `development`,
`preview` and `production` environments. Anything built into an app can be
read out of it, so the key keeps out casual callers. It doesn't authenticate
anyone.

## Requests

Every request sends:
- `X-Device-Id`: the random UUID the app keeps per install.
- `X-App-Key`: the key above.

Contrary to the first version of this reference, the live site requires the
key on `/products` too; only `/ping` answers without it.

Handled outcomes, success or failure, come back as HTTP 200 with
`{ ok: true, ... }` or `{ ok: false, code, message }`. Only these use other
statuses: 400 `device_missing`, 401 `bad_app_key`, 500 `server_error`.

## Endpoints

| Method + path | Body | Success returns |
|---|---|---|
| GET `/ping` | – | `{ ok, time }` |
| GET `/products` | – | products, styles, `maxTextLength: 18` |
| GET `/allowance` | – | `{ allowance }` |
| POST `/uploadUrl` | `{ mimeType }` (jpeg/png/heic/heif/webp) | `{ uploadUrl }`. The limits are checked first. |
| POST `/designs` | `{ fileId, style, text?, includePeople?, peopleConsent? }` | `{ designId, style }` |
| GET `/designs` | – | `{ designs:[{designId,style,text,previewUrl,createdAt,expiresAt}], inProgressDesignId, allowance }` |
| GET `/designs/<designId>` | – | `{ designId, status, reason, includePeople, style, text, previewUrl, allowance? }` |
| POST `/mockups` | `{ designId, productKey, color?, size }` | `{ taskKey }` (the app doesn't use this; it draws its own previews) |
| GET `/mockups/<taskKey>` | – | `{ status, mockupUrl, mockupUrls }` |
| POST `/checkout` | `{ items:[{designId,productKey,color?,size,quantity}] }` | `{ checkoutId, checkoutUrl, summary }` |
| GET `/checkout/<checkoutId>` | – | `{ completed, orderNumber }` |
| GET `/orders` | – | `{ orders:[{orderNumber,placedAt,total,stage,stages,trackingUrl,items}] }` |

`allowance` = `{ designsUsed, designsLeft, designsLimit: 5, designUnlockAt,
triesUsed, triesLeft, triesLimit: 12, tryUnlockAt }`. The app reads
`GET /designs` for its limits, because that answer also carries
`inProgressDesignId`.

Product keys, colours and sizes match `src/data/catalog.ts`. The one
difference is poster sizes: the backend writes `12×12` with a
multiplication sign, and the client converts the app's `12x12`. Prices are
in dollars.

## Photo upload

1. POST `/uploadUrl` returns `uploadUrl`.
2. `PUT {uploadUrl}?filename=pet.<ext>` with the raw bytes. Wix returns
   `{ file: { id } }`.
3. POST `/designs` with `fileId`. On `upload_not_ready`, the client waits
   `retryAfterMs` and asks again (up to 15 times). That uses nothing.

## Styles in answers

Requests send the style key (`stamp`, `poster`, `evening`, `sticker`), but the
live backend answers with the display name (`"style": "Evening Portrait"`).
The client accepts the key, the display name or the website key
(`eveningPortrait`) through `styleIdFrom` in `src/data/catalog.ts`. An
unreadable style used to crash the result and Your designs screens.

## Design status

The generating screen polls `GET /designs/<id>` every 2 s.

| status | App status | Screen |
|---|---|---|
| `working` | processing | Generating |
| `ready` | ready | Result |
| `no_pet` | rejected | No pet found |
| `photo_rejected` | rejected | Photo not accepted, with a line for `reason`: `child`, `famous`, `too_many` (over 6 people and pets) or `content` (general wording) |
| `checker_down` | failed | Photo check unavailable. The photo is kept, so "Try again" reuses it. |
| `failed` | failed | Design failed |

None of the failures count toward the 5; every attempt counts toward the 12.

## Error codes

| code | App |
|---|---|
| `limit_designs` | `LIMIT_REACHED`: Limit reached, with `unlockAt` in local time |
| `limit_tries` | `TRIES_LIMIT`: 12 tries |
| `studio_busy` | `STUDIO_BUSY`: Studio busy |
| `one_at_a_time` | The client carries on with the returned `designId` (Generating) |
| `text_rejected` | `TEXT_REJECTED`: shown on the style screen |
| `text_checker_down` | `TEXT_CHECKER_DOWN`: "Try again in a minute" on the style screen |
| `upload_not_ready` | Retried silently |
| `bad_photo`, `bad_photo_type`, `upload_unavailable` | `UPLOAD_FAILED`: Upload failed |
| `people_consent_needed` | `PEOPLE_CONSENT_NEEDED`: the style screen shows the consent box again |
| `design_unavailable`, `bad_choice`, `bad_product` | `CART_ITEM_UNAVAILABLE`: notice on the checkout screen |
| anything else | `NETWORK`: generic "try again" |

## People in the photo

- The style screen has a switch, "Include the people in my photo", off by
  default. When it's on, a checkbox appears: "Everyone in this photo is 18 or
  older and agreed to be in the design." Generate stays disabled until it's
  ticked, and turning the switch off unticks it. Choosing a new photo resets
  both.
- The app sends `includePeople: true, peopleConsent: true` only when both are
  on; otherwise it sends neither.
- The server refuses any photo that appears to include a child, switch on or
  off, so the upload screen's "no children" promise still holds.

## Checkout

1. The app keeps its own cart and sends it as items. A bundle becomes four
   items with quantity 1; Wix applies the automatic 10% bundle discount.
2. The app opens `checkoutUrl`: on iOS in the in-app Safari sheet
   (`WebBrowser.openBrowserAsync`), on Android in the phone's own browser
   (`Linking.openURL`), because some browsers' custom tabs (Edge) keep asking
   to "open the external app" while the Wix checkout loads. The customer pays
   on the Wix checkout.
3. The app asks `GET /checkout/<checkoutId>`, a few times over about 5 s,
   when the browser closes (iOS) or when the app comes back to the
   foreground (Android, where `openBrowserAsync` returns as soon as the
   browser opens). There's also an "I've paid, check my order" button.
   - `completed: true`: Confirmation with the real `orderNumber`, and the
     cart is cleared.
   - otherwise: the cart is kept.
4. Fulfilment is the website's: `events.js` turns the paid order into a
   Printful draft.

## Orders

`GET /orders` returns every order placed from the device. `stage` is
matched by word (review, print, ship, deliver) onto the app's four steps,
and `total` in dollars becomes cents.
