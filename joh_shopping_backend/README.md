# Joh Shopping — Backend API

Laravel 13 API for the Joh Shopping storefront, customer account and admin panel (`../joh_shopping_frontend`). JSON matches the frontend's `types/index.ts` field for field (camelCase, string ids such as `p-ip16pm`, TZS integers). The frontend talks to it through `lib/api/*` and `lib/data/server.ts`.

## Run it

```bash
composer install
cp .env.example .env && php artisan key:generate   # first time only
php artisan migrate:fresh --seed                    # schema + demo data
php artisan storage:link                            # product/banner uploads
php artisan dev                                     # API on :8000, queue worker, logs
php artisan test --compact                          # 52 feature tests
```

Requires PHP 8.3+. SQLite is the default (`database/database.sqlite`). For MySQL, set `DB_CONNECTION=mysql` and the `DB_*` values in `.env`. The migrations work on both.

The application uses East Africa Time (`Africa/Nairobi`, UTC+3) for PHP date/time operations and storefront date display. Set `APP_TIMEZONE` in `.env` to override it for another deployment.

Emails (order updates, password reset, verification, staff invites) go to `storage/logs/laravel.log` while `MAIL_MAILER=log`. Most are queued, so keep `php artisan dev` (or `php artisan queue:work`) running.

### Demo data

`php artisan migrate:fresh --seed` loads the same demo data as the frontend mock: 32 products, 260 orders, IMEIs, returns, coupons and so on. It comes from `database/seeders/data/seed.json`. All dates are shifted so the newest record is "now".

| Area | Login | Password |
|---|---|---|
| Customer | amina@example.co.tz (or 0712 345 678) | Password@123 |
| Admin, Super Admin | admin@johshopping.co.tz | Admin@123 |
| Admin, Sales role | sales@johshopping.co.tz | Sales@123 |
| Other demo staff | e.g. mwanaisha@johshopping.co.tz | Staff@123 |

Coupons: `KARIBU10`, `JOHFREE`, `SIMU50K`. `seed.json` was exported from the frontend's original mock data and is now the canonical demo dataset.

In production, `db:seed` creates only roles and permissions. Create the first admin with:

```bash
php artisan app:create-admin --name="Joseph Mushi" --email=admin@johshopping.co.tz
```

## Auth

Laravel Sanctum with SPA cookie sessions, and two separate guards:

- **Customers** (`users` table, `web` guard): `POST /api/login` takes an email or phone in any Tanzanian format. If the customer turned on two-step verification, the response is `{ "twoFactor": true }` and a 6-digit code is emailed; finish with `POST /api/two-factor-challenge`.
- **Staff** (`staff` table, `admin` guard): `POST /api/admin/login`. `GET /api/admin/user` returns `roleId`, `roleName` and the effective `permissions`.

The SPA must call `GET /sanctum/csrf-cookie` first, then send `credentials: "include"` and the `X-XSRF-TOKEN` header. The frontend origin has to be listed in `SANCTUM_STATEFUL_DOMAINS` and `FRONTEND_URL` (CORS). In production, run the API on a subdomain of the store (e.g. `api.johshopping.co.tz`) and set `SESSION_DOMAIN=.johshopping.co.tz`.

Admin permissions are the frontend's `Permission` keys, stored as Spatie permissions on the `admin` guard. The roles match the mock: Super Admin, Store Manager, Sales, Inventory Officer and Customer Support.

## API overview

All routes are in `routes/api.php`. Errors use Laravel's shape (`{ message, errors: { field: [code] } }`) with the same codes as the mock: `invalid_credentials`, `email_taken`, `wrong_password`, `cannot_cancel`, `invalid_amount`, `out_of_stock` and so on.

| Area | Endpoints |
|---|---|
| Catalog | `GET /api/bootstrap` (everything the storefront caches), `/api/home`, `/products` (same filters/sorts as `queryProducts`), `/products/{slug}` (+ related, compatible, bought together), `/categories`, `/brands`, `/catalog/facets`, `/deals`, `/flash-sale`, `/banners`, `/pages/{slug}`, `/shipping/zones`, `/pickup-stores`, `/settings` |
| Cart & checkout | `POST /api/cart/quote`, `POST /api/orders`, `GET /api/orders/lookup/{number}`, `POST /api/track`, `GET /api/payments/{reference}/status`, `POST /api/orders/{number}/retry-payment` |
| Engagement | reviews, questions, stock alerts, `POST /api/contact`, `POST /api/newsletter` |
| Account | `/api/user` (profile, password, preferences, delete), `/api/account/orders` (+ cancel), `/api/addresses`, `/api/notifications`, `/api/payment-methods`, `/api/returns`, `/api/account/reviews`, `/api/wishlist` |
| Admin | `/api/admin/{resource}` CRUD for orders, payments, returns, customers, products, attributes, categories, brands, stock-movements, serials, coupons, flash-sales, banners, pages, reviews, questions, messages, subscribers, shipping-zones, pickup-stores, staff, roles, activity; actions for order status/courier/IMEIs, refunds, inventory adjust, message reply, staff invite; `/api/admin/analytics/{dashboard,sales,counts}`, `/api/admin/payments-summary`, `/api/admin/activity-actors`, `/api/admin/settings`, `/api/admin/uploads` |

Admin lists accept `?page=&perPage=&search=&sort=-createdAt&filter[status]=paid` (or `?all=1`) and return `{ data, meta: { current_page, last_page, per_page, total, from, to } }`. `PATCH` updates only the fields you send. `DELETE /api/admin/{resource}` with `{ "ids": [...] }` deletes in bulk. Every change is written to the activity log.

## Storefront cache refresh

The storefront caches the catalog (`GET /api/bootstrap`) for a minute. After admin changes that show on the store (products, categories, brands, banners, flash sales, coupons, pages, shipping, reviews, settings, stock adjustments), the API posts to `STOREFRONT_REVALIDATE_URL` (default `{FRONTEND_URL}/api/revalidate`) with the header `X-Revalidate-Secret: STOREFRONT_REVALIDATE_SECRET`. That secret must equal the frontend's `REVALIDATE_SECRET`. The call runs after the response is sent and never fails the admin request. Leave the secret empty to rely on the 1-minute refresh.

## What the server enforces

- **Prices come from the database.** Checkout re-prices the cart, including live flash-sale prices, coupons and zone shipping, and ignores client totals.
- **Stock** is locked and reserved at checkout. Cancelling restocks and refunds. Every change goes to the stock ledger (`stock_movements`).
- **Coupons**: validity window, usage limit and minimum spend. Usage is counted per order.
- **Payment methods** follow Admin → Settings. Cash on delivery is off by default and is marked paid when the order is delivered.
- **Orders** can be cancelled by the customer only while pending or confirmed. Cancelled and returned orders can't be reopened.
- **IMEIs** can't be sold on two orders. The warranty starts on delivery, using the product's warranty length.
- **Staff**: nobody can suspend or delete themselves or change their own role, and the last active Super Admin can't be removed.
- **Notifications** (bilingual, in the customer's language) go out by email and in-app: order placed and status changes, return updates, back in stock, low stock and new-order alerts for the store.

## Payments

`app/Services/Payments` defines a `PaymentGateway` interface. The only driver so far is **sandbox**, which confirms payments instantly, matching the storefront's simulated PIN prompt and 3-D Secure. With `PAYMENTS_SANDBOX_AUTO_CONFIRM=false`, payments stay pending until you post `{ reference, status }` to `POST /api/payments/webhooks/sandbox`.

To go live, pick a gateway (Selcom, AzamPay or ClickPesa for mobile money; Pesapal or DPO for cards), add a driver class to `config/payments.php`, and point the provider's callback at `POST /api/payments/webhooks/{driver}`. The sandbox driver refuses to run in production.

## Layout

```
app/Http/Controllers/Shop      public storefront (catalog, content, cart, checkout, engagement)
app/Http/Controllers/Account   signed-in customer
app/Http/Controllers/Admin     back office; most extend ResourceController (generic CRUD)
app/Http/Resources             JSON in the frontend's shapes
app/Services                   CartPricer, CheckoutService, OrderService, InventoryService,
                               AnalyticsService, Payments/
app/Notifications              bilingual mail + in-app notifications
app/Support                    StoreSettings, Permissions, Phone (+255), Sequence, ActivityLogger
database/seeders               roles/permissions, demo data from data/seed.json
```

## Before going live

- Set `APP_ENV=production`, `APP_DEBUG=false`, MySQL credentials, a real mailer, `QUEUE_CONNECTION=database` (or redis) with a supervised `queue:work`, and HTTPS.
- Configure the chosen payment gateway and turn off sandbox.
- Run `php artisan migrate --force`, `php artisan db:seed --force` (roles only), `php artisan app:create-admin` and `php artisan storage:link`.
