# Design Your Pet

The Goodwookie Productions app for iPhone and Android. Customers upload a photo
of their pet, pick one of four styles, and order the artwork on a tee, hoodie,
sticker or poster. It is the mobile version of
[goodwookie.com/design-your-pet](https://www.goodwookie.com/design-your-pet)
and shares that page's generator, limits and store.

- Product rules: [`docs/app-spec.md`](docs/app-spec.md)
- Backend endpoints the Wix site needs: [`docs/backend-api.md`](docs/backend-api.md)
- Privacy policy: [`docs/privacy-policy.md`](docs/privacy-policy.md)
- Screen designs: the Design Your Pet App canvas (linked from the spec)

Built with Expo (SDK 57), Expo Router and TypeScript.

## Run it

```sh
npm install
npx expo start        # then open in Expo Go, a simulator, or press w for web
```

Without configuration the app runs on a **built-in mock backend**
(`src/api/mock.ts`) that follows the real rules: 5 designs and 12 tries in a
rolling 24 hours, one design at a time, text checks, and a checkout that
returns straight to the confirmation screen. Type "Skywalker" as the design
text to see the text rejection.

To use the real website backend once the endpoints in `docs/backend-api.md`
exist:

```sh
EXPO_PUBLIC_API_BASE_URL=https://www.goodwookie.com npx expo start
```

## Checks

```sh
npm test              # unit tests: limits, pricing, mock backend
npm run typecheck
npm run lint
```

## Where things are

| Path | What |
|---|---|
| `src/app/` | Screens (one file per route, Expo Router) |
| `src/app/problem/[code].tsx` | All problem screens, keyed by the error that triggers them |
| `src/components/` | Shared UI, product previews, colour and size pickers |
| `src/data/catalog.ts` | Styles, products, colours, sizes and prices |
| `src/lib/limits.ts` | The rolling 24-hour limit rules and unlock times |
| `src/lib/cart.ts` | Cart totals and the bundle discount estimate |
| `src/api/` | Backend contract, HTTP client and mock |
| `src/state/AppState.tsx` | Device ID, current photo and style, cart, orders |
| `assets/images/` | Style samples, brand logos and Printful mockups |
| `wix-backend/` | Velo code for the goodwookie.com endpoints the app calls |

## Building for the stores

The project is linked to EAS as `@goodwookies-team/goodwookie`
(project ID `d6df67c0-9a83-4bd4-9185-d0e9f026ac7f`, in `app.json`).

Use EAS Build: `npx eas-cli@latest build --platform all`. The bundle ID and
package name are `com.goodwookie.designyourpet`. The listing copy and
screenshots are in the spec and on the canvas.
