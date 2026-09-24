# Design Your Pet app: build spec

The mobile version of the Design Your Pet page on goodwookie.com
(https://www.goodwookie.com/design-your-pet). A customer uploads a photo of
their pet, picks a style, and orders the artwork on a tee, hoodie, sticker or
poster.

The app shares its generator, limits and store with the website. The
website's generator (`aiDesign.web.js`) is the source of truth; where this
spec and that code disagree, the code wins and this file should be updated.

Design canvas (screens, copy, layout):
https://claude.ai/artifact/LCuV9ETQ3znW6MzhWTWgJn

## Flow

| # | Screen | Canvas file | Notes |
|---|---|---|---|
| 1 | Welcome | `Main.dc.html` | Badge logo, sample designs, "Get started". |
| 2 | Step 1: Add your photo | `Upload.dc.html` | Take or choose a photo; photo tips; confirm "I own this photo and there are no children in it." |
| 3 | Steps 2–3: Style and text | `Style.dc.html` | Pick one of four styles. Optional text, up to 18 characters, only for Travel Stamp and Travel Poster. |
| 4 | Step 4: Generate | `Generating.dc.html` | About a minute. |
| 5 | Step 5: Pick your product | `Result.dc.html` | Design shown on a tee; "Try another style", "Use a new photo"; product list; bundle card. |
| 6 | Product options | `Product.dc.html` | Product tabs, colour, size, price per size. |
| 7 | Buy them all | `Bundle.dc.html` | One of each product, 10% off. |
| 8 | Cart | `Cart.dc.html` | Shows the discount once Wix applies it. |
| 9 | Review and pay | `Checkout.dc.html` | Hands off to Wix checkout. |
| 10 | Order confirmed | `Confirmation.dc.html` | Shown when the customer returns from Wix checkout. |
| – | Your designs | `Gallery.dc.html` | Designs made in the last 24 hours; tapping one does not use a generation. |
| – | My orders | `Orders.dc.html` | Status: In review, Printing, Shipped, Delivered; tracking once shipped. |

"Try another style" reuses the same photo. The customer does not upload again.

## Styles

Travel Stamp, Travel Poster, Evening Portrait, Adventure Sticker.
Text (max 18 characters) is allowed on Travel Stamp and Travel Poster only.
Works for any animal. Two or three pets in one photo is fine; more than that
switches to portrait heads.

## Products and prices

All prices are Printful retail prices in USD. Shipping is free on everything.

| Product | Printful item | Options | Price |
|---|---|---|---|
| T-Shirt | Bella + Canvas 3001, unisex jersey short sleeve tee | White, Natural, Ash, Heather Dust, Athletic Heather; S–3XL | S–XL $24.00, 2XL $26.50, 3XL $29.00 |
| Hoodie | Cotton Heritage M2580, unisex premium pullover hoodie | Bone, Carbon Grey, Carolina Blue, Khaki, Lavender, Light Pink, Oatmeal Heather, Sky Blue, White; S–3XL | S–XL $54.50, 2XL $57.00, 3XL $59.50 |
| Sticker | Kiss-cut, bubble-free sticker | 3″×3″, 4″×4″, 5.5″×5.5″ | 3″ and 4″ $10.50, 5.5″ $11.00 |
| Poster | Matte paper poster, square | 12″×12″, 16″×16″, 18″×18″ | 12″ $22.00, 16″ $26.50, 18″ $27.50 |

The tee and hoodie carry the Goodwookie script logo on the left sleeve
(already on the Printful mockups).

### Buy them all bundle

- One tee, one hoodie, one sticker and one poster with the same design.
- 10% off the total of those four items.
- The discount is an automatic discount set up in the Wix store, triggered by
  the purchase conditions. The app does not calculate or apply it; it only
  displays it once Wix has applied it to the cart.
- The bundle screen may show an estimate (cheapest $99.90, most expensive
  $114.30) so the customer knows what to expect.
- If the store switches to a coupon code instead, the cart needs a field to
  enter it.

## Generation limits

The app and the website share the same limits. Do not change them in the app
alone.

- **5 successful designs in any rolling 24 hours.** Each design stops counting
  24 hours after it was made. There is no midnight reset.
- **Next unlock time** = the oldest successful design in the last 24 hours
  + 24 hours, shown in the customer's local time
  (for example "Your next free design unlocks at 8:14 PM").
- **Only successful designs count.** A design that fails, can't be cleaned up
  for printing, or errors does not use one up.
- **12 attempts a day**, successful and failed together. This is an
  anti-abuse cap; a normal customer should never reach it.
  Message: "That's 12 tries today, which is the limit."
  (Whether this window is also rolling 24 hours is still to be confirmed.)

### What does and doesn't count

| Situation | Counts toward the 5? | Counts toward the 12? |
|---|---|---|
| Successful design | Yes | Yes |
| Design fails or errors | No | Yes |
| Upload fails (photo uploads before a design record exists) | No | No |
| No animal found in the photo (photo is deleted) | No | To confirm |
| Photo fails the content check | No | To confirm |
| Photo checker unavailable | No | No |

## Error states

Show each screen when its error happens, not from a button.

| Trigger | Screen | Key message |
|---|---|---|
| Upload fails | `UploadError.dc.html` | "Your photo didn't finish uploading … Nothing was used up." |
| Photo checker unavailable | `CheckerDown.dc.html` | "Try again in a minute. Nothing was used up." |
| No animal found in the photo | `NoPetFound.dc.html` | "We couldn't find a pet in this photo … it won't count toward your 5 designs today." |
| Photo fails the content check | `PhotoRejected.dc.html` | States the reason; repeats the ground rules; "This won't count toward your 5 designs today." |
| Text rejected (profanity, protected names or titles) | `TextRejected.dc.html` | Blocks Generate until fixed; offers "Generate without text". |
| Design fails | `GenerateFailed.dc.html` | "This one didn't work out, so it won't count toward your 5 designs today." |
| 5 designs in 24 hours | `LimitReached.dc.html` | "Your next free design unlocks at [local time]." |
| 12 attempts | `TriesLimit.dc.html` | "That's 12 tries today, which is the limit." |

### Photo ground rules (from the website)

- Upload photos you own: your own pet, your own picture. No one else's
  photography, other artists' work, or images with logos, characters or brands.
- No photos of children, yours or anyone else's. Pets only, or pets with adults
  who have agreed to be there.
- Keep it decent: no nudity, violence, hateful imagery, or anything illegal.
- Uploads are checked automatically, and every order is reviewed by hand before
  it's printed.

## Checkout and orders

- The app does not take payment. "Continue to secure checkout" sends the
  customer to Wix checkout, which collects the shipping address and payment.
- Payment methods: credit and debit cards, PayPal, Apple Pay, Google Pay.
  Which ones appear depends on the customer's device and browser.
- Tax is added in Wix checkout.
- **Order number:** the real Wix order number, shown with a `#` in front
  (for example "Order #10042"). Wix numbers orders in sequence. Read it from the
  order; never generate one in the app.
- **Order date:** the order's creation date in the customer's local time,
  short format (for example "Sep 23, 2026").
- Order statuses shown: In review → Printing → Shipped → Delivered.
  Tracking appears once shipped.
- Support contact: info@goodwookie.com.

## Data retention

Designs that aren't ordered are deleted automatically after a few days.

## Brand

- Colours: ink navy `#16202A`, cream `#EFE3C6`, aged cream `#D9C8A2`,
  gold `#C79A3E`, bronze `#7A5A28`, slate `#31404C`, rust `#A85433`.
  Error text on cream uses a darker rust, `#8E4226`, for contrast.
- Type: Oswald (display), Alfa Slab One (heavy statements), Barlow (body).
- App icon: the paw, mountain and sunset mark on cream. An alternate icon uses
  the round Chewy portrait on navy.
- The customer's pet is always the subject of the artwork. Chewy appears only
  in brand assets and sample designs.

## Open questions

- Is the 12-attempt window a rolling 24 hours?
- Do "no pet found" and "photo rejected" count toward the 12 attempts?
- Screens that still say "today" for the 5-design limit ("4 of 5 free designs
  left today") should probably say "in the last 24 hours" to match the rolling
  window.
- Confirm the bundle discount is set up in Wix as an automatic discount, not a
  coupon code.
