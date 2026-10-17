# Joh Shopping

Electronics ecommerce (smartphones + accessories) for Tanzania.

- `joh_shopping_frontend/`: Next.js 16.4 (App Router, Cache Components), TypeScript, Tailwind v4. **Built and wired to the API** (the mock layer is gone). See its `README.md` for run commands, demo accounts and how data flows.
- `joh_shopping_backend/`: Laravel 13 API (Sanctum SPA cookies, Spatie permissions, SQLite by default, MySQL-ready). **Built and tested.** See its `README.md`.

## Product decisions (approved by the owner)

- Currency TZS (`formatTZS`, non-breaking space). Phones are normalised to `+255…`.
- Swahili is the default language (`/sw`), English is at `/en`. Every UI string is in `dictionaries/sw/*` (source of truth) and `dictionaries/en/*`, typed against Swahili. Catalog fields are bilingual `{ sw, en }`.
- Payments: Visa/Mastercard plus all TZ mobile money (M-Pesa, Mixx by Yas, Airtel Money, HaloPesa, T-Pesa, AzamPesa). Official logos are in `public/payments/`. COD is supported but off by default (Admin → Settings).
- Sells new and used phones (grade A/B/C, battery health).
- Look and feel: clean, premium, red palette (tokens in `app/globals.css`), light and dark mode.
- Official logo is in `frontend/public/brand/`. `components/brand/logo.tsx` uses an extracted transparent emblem plus a wordmark mask that follows the text colour.

## Current state

- Storefront, checkout, auth, customer account (12 sections) and admin (25 pages, role-based permissions, activity log) are complete.
- `npm run build` passes (268 pages) but needs the API running (`php artisan dev`). `tsc` and `eslint` are clean apart from two react-hook-form warnings.
- Backend: 52 feature tests passing (`php artisan test --compact`). `php artisan migrate:fresh --seed` gives a clean store: setup data, the starter catalog (`StoreCatalogSeeder`: 29 products, at least 4 per category, plus hero/promo/category banners) and only the Super Admin (support@johshopping.com). `php artisan db:seed --class=StoreCatalogSeeder` adds any missing starter rows to a live database and never overwrites existing ones. `SEED_DEMO_DATA=true` loads the full demo from `database/seeders/data/seed.json`. `php artisan app:reset-for-testing --force` wipes back to the clean state.
- Browser end-to-end checks passed for login, coupon, checkout, account orders, registration and email verification, admin dashboard and orders, product edit → storefront refresh, and Sales-role permissions.
- Nothing is committed to git yet. The frontend has its own nested `.git`.
- Backend runs on MySQL (`joh_shopping`). Email sends over SMTP (mail.johshopping.com, as support@johshopping.com). The store domain is johshopping.com.
- Placeholders still in place: Account → Security "active sessions" list, About-page copy, homepage testimonials and stats, product photos (illustrations until uploaded), and the sandbox payment driver. On production the sandbox is off (`PAYMENTS_ALLOW_SANDBOX`), so card and mobile money stay hidden until a real gateway exists.
- Hosting: see `DEPLOYMENT.md` and `deploy/` (VPS: Nginx + PHP-FPM + PM2 + systemd queue worker; `.env.production.example` in both apps).

## Conventions in the frontend

- There is no Prettier config, and the code is hand-wrapped at about 200 columns. Never run bare `prettier --write` on existing files, because it reflows them to 80 columns. Use `--print-width 200`, and only on new files.
- Mobile homepage: products first. The hero is compact, trust and category rows are scroll strips, and promo and category banners are hidden below `md`.

- Storefront server components get data from `getShop()`/`getPage()` (`lib/data/server.ts`, `"use cache"` + tag `catalog`). Client components use `useShop()`. Never import catalog data statically.
- Customer and admin calls go through `lib/api/*` (`api()`/`apiData()` handle the Sanctum CSRF cookie and credentials). Admin collections map to `/api/admin/{resource}` via `lib/api/core.ts`.
- Show API errors with `apiErrorMessage(err, t)` / `apiFieldErrors(err, t)` (`lib/api/errors.ts`). Codes live in `dictionaries/*/common.ts → apiErrors`.
- Cart pricing (`lib/cart.ts`) must mirror the backend `CartPricer`. Pass `now` from `useNow()`, never `Date.now()` in render.
- Admin CRUD screens use `components/admin/crud-page.tsx`, `data-table.tsx` and `form-dialog.tsx`. Permissions are the `Permission` keys in `types/index.ts`.
- Charts follow the dataviz skill: one series per chart, validated `--chart-1/2` tokens, no dual axes.
- Product/banner photos go through `components/admin/image-manager.tsx` (queue → `image-crop-dialog.tsx` crop/rotate/resize with react-easy-crop → canvas in `lib/image-tools.ts` → upload). Saved photos are re-opened via `GET /api/admin/uploads/file` for CORS.
- Maintenance mode: `components/layout/maintenance-gate.tsx` wraps the shop, checkout and auth layouts. Signed-in staff still see the store with a banner.

Next.js 16 Cache Components rules (Suspense, Date, no locale via `useParams`):
- Read time with `useMounted`/`useNow` from `lib/hooks.ts`, not `Date.now()` during render.
- Wrap URL-dependent hooks in `<Suspense>`. The locale comes from `LocaleProvider`, never `useParams`.
- Auth shells render hidden children while the session is unknown.
- No setState inside effects. Initialize state from props in a child component instead.

If the dev server shows stale renders, kill it, `rm -rf .next/dev`, and restart.

## Conventions in the backend

- JSON mirrors `types/index.ts` exactly: camelCase, prefixed string ids (`HasPrefixedId`), whole-TZS integers, optional keys omitted when null (`ApiResource::$optional`).
- Two guards: `web` for customers (`users`) and `admin` for staff (`staff`, Spatie roles with string ids like `role-super`). Pass `Role` models to `syncRoles`, because strings are treated as role names.
- Admin CRUD controllers extend `Admin\ResourceController` and declare rules, search, filter and sort maps. Mutations log to `activity_logs`.
- Error messages are the mock's codes (`invalid_credentials`, `out_of_stock`, …), so frontend dictionaries can map them.
- Checkout always re-prices on the server (`CartPricer`), including live flash-sale prices.
- Revenue is net of refunds (`AnalyticsService::NET_TOTAL`). Setting a return to `refunded` refunds the order's payment once (`return_requests.refund_amount`).
- Mail: published templates in `resources/views/vendor/mail` (red theme). `EmbedMailLogo` attaches `public/brand/email-logo.png` as `cid:joh-logo`. Restart `php artisan dev` after editing `.env`, because the queue worker inherits the old env.
- Follow the Boost guidelines in `joh_shopping_backend/CLAUDE.md` and run `vendor/bin/pint --dirty --format agent` after PHP edits.

## Likely next steps

Take the owner's feedback and make small adjustments, commit, then pick and add a real payment gateway driver (Selcom, AzamPay or ClickPesa for mobile money; Pesapal or DPO for cards) and deploy (API on a subdomain with `SESSION_DOMAIN`, set `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS=false`).
