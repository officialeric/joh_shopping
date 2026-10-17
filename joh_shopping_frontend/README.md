# Joh Shopping — Frontend

Storefront, customer dashboard and admin panel for **Joh Shopping**, an electronics store (smartphones and accessories) for Tanzania. Built with Next.js 16 (App Router, Cache Components), TypeScript and Tailwind CSS v4. The Laravel 13 backend lives in `../joh_shopping_backend`.

## Run it

The storefront reads everything from the Laravel API, so start that first (see `../joh_shopping_backend/README.md`):

```bash
# terminal 1 — API on http://localhost:8000
cd ../joh_shopping_backend && php artisan migrate:fresh --seed && php artisan dev

# terminal 2 — storefront on http://localhost:3000 (→ /sw)
cp .env.example .env.local   # first time only
npm install
npm run dev
npm run build && npm start   # production; the API must be reachable during the build
```

Requires Node 20+. Use `localhost:3000` (not `127.0.0.1`) so the API's session cookies apply.

### Demo accounts

| Area | Email | Password |
|---|---|---|
| Customer | amina@example.co.tz | Password@123 |
| Admin — Super Admin | admin@johshopping.co.tz | Admin@123 |
| Admin — Sales role (limited permissions) | sales@johshopping.co.tz | Sales@123 |

- Coupons to try: `KARIBU10`, `JOHFREE`, `SIMU50K`
- Guest order tracking: `JOH-10240` + `amina@example.co.tz`
- Admin: `/sw/admin` (or `/en/admin`). To restore the demo data, run `php artisan migrate:fresh --seed` in the backend.
- The demo logins on the sign-in pages are hidden with `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS=false` (do this on a live store).

## Languages & currency

- **Swahili is the default** (`/sw/...`); English at `/en/...`. Visitors without a locale prefix are redirected to their last choice (cookie) or Swahili — see `proxy.ts`.
- All UI strings live in `dictionaries/sw/*` (source of truth) and `dictionaries/en/*` (type-checked against Swahili, so a missing key is a compile error).
- Catalog content is bilingual per field (`{ sw, en }`).
- Prices are TZS, formatted by `formatTZS()`; Tanzanian phone numbers are validated/normalised to `+255…`.

## Structure

```
app/[lang]/
  (shop)/            storefront: home, products, product detail, cart, deals, brands,
                     compare, about, contact, FAQ, policies, track-order
  (shop)/account/    customer dashboard: overview, orders (+detail, invoice), tracking,
                     wishlist, returns & warranty, reviews, notifications, addresses,
                     payment methods, profile, security, settings
  (checkout)/        distraction-free checkout + order confirmation
  (auth)/            login, register, forgot/reset password, verify email
  admin/login        staff sign-in (+ forgot-password, reset-password, accept-invite)
  admin/(panel)/     dashboard, reports, orders, payments, returns, customers, products,
                     categories, brands, attributes, inventory & IMEI, coupons, flash
                     sales, banners, reviews, pages, messages, subscribers, shipping,
                     staff, roles & permissions, activity log, settings
components/          ui/ (design system) · shop/ · account/ · admin/ · layout/ · brand/
dictionaries/        sw + en translations
lib/api/             client for the Laravel API (core: fetch + CSRF, admin CRUD; shop; admin; analytics; errors)
lib/data/            storefront data: server.ts (cached fetch), shop-context.tsx (useShop), catalog.ts (helpers)
lib/cart.ts          instant cart pricing (mirrors the API's CartPricer)
stores/              Zustand stores (cart, wishlist, compare, auth, UI)
types/               domain models shared by every layer
```

## Brand

The official logo is in `public/brand/` (`logo_full.jpeg`, `logo_mini.jpeg`). `components/brand/logo.tsx` uses two files extracted from it: `logo-mark.png` (transparent red emblem) and `logo-wordmark.png` (an alpha mask filled with the text colour, so it works in light and dark mode). `app/icon.png` and `app/apple-icon.png` are the emblem on white.

## How data flows

- **Storefront pages** (server components) call `getShop()` / `getPage()` from `lib/data/server.ts`. One cached request to `GET /api/bootstrap` returns the published catalog, shipping zones, pickup stores, settings, banners and the featured flash sale. It is cached with `"use cache"` (`cacheLife("minutes")`, tag `catalog`), so pages stay static and fast.
- **Client components** read the same data with `useShop()` (provided by the root layout).
- **Admin edits show at once**: after a change that affects the storefront, the API calls `POST /api/revalidate` with `REVALIDATE_SECRET` (must match the API's `STOREFRONT_REVALIDATE_SECRET`). Without it, the catalog refreshes within a minute.
- **Customer and admin screens** call the API directly through `lib/api/*` with React Query. Auth is Laravel Sanctum SPA cookies (customers and staff have separate sessions). `components/auth/auth-sync.tsx` refreshes the cached profile on load and clears it on a 401.
- **Cart totals** are computed instantly in the browser (`lib/cart.ts`, including live flash-sale prices). Coupons are validated by the API, and checkout re-prices everything on the server.
- **Errors** from the API carry codes (`out_of_stock`, `invalid_credentials`…) that `lib/api/errors.ts` turns into Swahili/English messages (`dictionaries/*/common.ts → apiErrors`).

## Not final yet

- **Product images** are SVG device illustrations drawn in each variant's colour (`components/brand/product-art.tsx`). Photos uploaded in Admin → Products (stored by the API) replace them.
- **About-page story, stats and testimonials** are placeholder copy.
- **Account → Security → active sessions** is a static example list; the API doesn't expose sessions yet.
- **Payments** run on the API's sandbox driver until a gateway is chosen. Checkout already handles pending payments (PIN prompt polling) and redirects (3-D Secure).

## Payment logos

Official acceptance marks live in `public/payments/` and are rendered by `components/brand/payment-logos.tsx`. They are trademarks of their owners, shown only to indicate accepted payment methods.

| File | Source |
|---|---|
| `mpesa.svg` | Wikimedia Commons — File:M-PESA LOGO-01.svg |
| `visa.svg` | Wikimedia Commons — File:Visa Inc. logo (2021–present).svg |
| `mastercard.svg` | Wikimedia Commons — File:Mastercard 2019 logo.svg |
| `airtel.svg` | Wikimedia Commons — File:Airtel logo.svg (Airtel Money uses the Airtel brand mark) |
| `mixx.svg` | mixx.co.tz (official site) |
| `halopesa.png` | halopesa.co.tz (official site), resized |
| `tpesa.png` | Official TTCL "T-PESA" app icon (Google Play, publisher TTCL Corporation) |
| `azampesa.png` | azampesa.co.tz (official site) |

Before launch, ask each provider (or your payment gateway) for their merchant brand kit and replace these files with the versions they supply.
