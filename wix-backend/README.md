# Wix backend for the Design Your Pet app

Velo code for the goodwookie.com site. It implements the endpoints in
[`docs/backend-api.md`](../docs/backend-api.md) at
`https://www.goodwookie.com/_functions/dyp/...` and reads and writes the same
`PetDesigns` collection and store products as the website's own Design Your
Pet page.

| File | What |
|---|---|
| `backend/http-functions.js` | The endpoints: `get_dyp`, `post_dyp`, `options_dyp` |
| `backend/dyp/rules.js` | Limits, style and status mapping, product and variant IDs, input checks. No Wix imports, so it's unit-tested (`tests/rules.test.js`) |
| `backend/dyp/designs.js` | Photo upload URLs, creating designs, limits, the design list |
| `backend/dyp/store.js` | Wix checkout, the return into the app, orders |
| `backend/dyp/site.js` | **The bridge to the site's generator. Needs wiring, see below.** |

## Install

1. In the Wix editor, open the code panel (Dev Mode on).
2. **Packages & Apps → npm**: make sure these are installed: `@wix/essentials`,
   `@wix/media`, `@wix/ecom`, `@wix/stores`, `@wix/redirects`.
3. Under **Backend**, create a folder `dyp` and add `rules.js`,
   `designs.js`, `store.js` and `site.js` with the contents of the files here.
4. Add `http-functions.js` to **Backend**. If the site already has one, paste
   in the three `*_dyp` functions and the imports instead of replacing it.
5. Wire `backend/dyp/site.js` to the site's existing checks and generator
   (below).
6. So paid orders are linked even if the customer never returns to the app,
   add this to `backend/events.js` (create it if it doesn't exist; add to it
   if it does):

   ```js
   import { linkOrder } from 'backend/dyp/store';

   export async function wixEcom_onOrderCreated(event) {
     await linkOrder(event.entity);
   }
   ```

   If the site already has a `wixEcom_onOrderCreated`, call `linkOrder` from
   inside it.
7. Publish, then test from the app with
   `EXPO_PUBLIC_API_BASE_URL=https://www.goodwookie.com npx expo start`.
   Before publishing you can test against the test site: the URLs take
   `?rc=test-site`.

## Wiring `site.js`

The app has to use the website's own text check, photo check and generator,
which live in `backend/aiDesign.web.js` and `backend/petDesigns.js` on the
site. `site.js` has three functions to fill in with calls to those:

- `checkText(text)` → `{ ok: true }` or `{ ok: false, message }`
- `checkPhoto(photoUrl)` → `{ result: 'ok' | 'no-pet' | 'rejected' | 'unavailable', message? }`
- `startGeneration(design)` starts the site's generator for a `PetDesigns`
  item already saved as `pending`, and returns quickly. The generator sets the
  final status and `previewArtUrl` / `generatedArtUrl`, as it does for the
  website.

Until they are wired, designs stop with "Photo check unavailable" and nothing
is used up.

## How it maps to the site

- The app's `deviceId` is stored in `PetDesigns.visitorId`, so the website's
  limit functions count app designs the same way.
- Styles: `stamp` → `travelStamp`, `poster` → `travelPoster`,
  `evening` → `eveningPortrait`, `sticker` → `adventureSticker`.
- The app only ever gets `previewArtUrl`, the watermarked preview.
  `generatedArtUrl` (the print file) never leaves the server.
- Checkout uses the live products: Design Your Pet Tee, Design Your Pet
  Hoodie, Bubble-free stickers and Poster. Tee and hoodie variants are found
  by colour and size name, so those names must stay the same in the store
  (Bone, Carolina Blue… and S to 3XL). Sticker and poster variant IDs are in
  `rules.js`.
- The 10% bundle discount is the store's automatic discount. The backend
  doesn't apply it.
- After payment, Wix sends the browser to `/_functions/dyp/return`, which
  sets `orderId` and status `ordered` on the designs and redirects to
  `designyourpet://confirmation?orderId=…`.
- `www.goodwookie.com` must be allowed as a redirect domain for checkout
  callbacks (Settings → Headless settings → Allowed redirect domains) if Wix
  asks for it.

## Checks

From the repository root, `npm test` runs `tests/rules.test.js` together with
the app's tests.
