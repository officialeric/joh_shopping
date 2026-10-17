<div align="center">

<img src="joh_shopping_frontend/public/brand/logo_full.jpeg" alt="Joh Shopping" width="420">

# Joh Shopping

### Simu bora. Bei nzuri. Huduma ya kuaminika.

Tanzania-focused electronics commerce for smartphones, accessories, and the people who use them every day.

<p>
  <a href="#-what-is-joh-shopping">About</a> ·
  <a href="#-features">Features</a> ·
  <a href="#-quick-start">Quick start</a> ·
  <a href="#-demo-accounts">Demo accounts</a> ·
  <a href="#-architecture">Architecture</a>
</p>

</div>

---

## 📱 What is Joh Shopping?

Joh Shopping is a complete, production-minded ecommerce platform for Tanzania. It combines a fast, bilingual storefront with a Laravel API, customer accounts, checkout, order management, inventory tools, and a role-based administration panel.

The experience is designed for East Africa from the ground up:

- **Swahili first**, with English available on every page
- **Tanzanian Shillings (TZS)** throughout the shopping experience
- **Tanzanian phone number** validation and normalisation
- **East Africa Time** (`Africa/Nairobi`, UTC+3)
- **Local payment methods**, including mobile money and cards
- Support for both **new and used phones**, including condition grades and battery health

## ✨ Features

### Storefront

- Responsive, premium red-themed storefront with light and dark mode
- Home page, product catalog, search, filters, sorting, categories, brands, deals, and flash sales
- Product pages with variants, stock status, accessories, compatible products, and recommendations
- Cart with instant totals, coupon support, delivery zones, and pickup stores
- Guest order tracking and authenticated order history
- Wishlist, compare, recently viewed products, stock alerts, reviews, questions, and contact forms
- Bilingual content with Swahili as the default language

### Checkout and payments

- Server-side cart repricing at checkout
- Visa and Mastercard support
- M-Pesa, Mixx by Yas, Airtel Money, HaloPesa, T-Pesa, and AzamPesa support surfaces
- Cash on delivery support, configurable from Admin → Settings
- Payment status polling, pending payments, retry-payment flow, and webhook-ready gateway design
- Sandbox payment driver for development and demonstrations

### Customer accounts

- Registration, login, password reset, email verification, and two-factor challenge support
- Profile, preferences, saved addresses, payment methods, wishlist, notifications, and security pages
- Orders, invoices, delivery tracking, cancellations, returns, warranty information, and product reviews
- Customer-facing notifications for order updates, returns, stock alerts, and account activity

### Admin panel

- Dashboard, sales analytics, reports, and payment summaries
- Product, variant, category, brand, attribute, banner, page, coupon, and flash-sale management
- Inventory management with stock movements and IMEI/serial tracking
- Order, payment, return, customer, review, message, subscriber, and shipping management
- Staff accounts, roles, granular permissions, invitations, and activity logs
- Automatic storefront cache revalidation after catalog changes
- Separate customer and staff authentication guards

## 🧱 Architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│                    Next.js storefront                           │
│  App Router · TypeScript · Tailwind CSS v4 · React Query         │
│  Swahili / English · Customer account · Admin panel              │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                    Sanctum SPA cookies + JSON API
                                │
┌───────────────────────────────▼──────────────────────────────────┐
│                    Laravel API                                  │
│  Laravel 13 · PHP 8.3+ · Sanctum · Spatie Permissions            │
│  Cart pricing · Checkout · Orders · Inventory · Payments         │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                 SQLite for development / MySQL-ready
```

### Repository layout

```text
.
├── joh_shopping_frontend/   Next.js storefront, account, checkout, and admin UI
├── joh_shopping_backend/    Laravel API, database, authentication, and services
├── CLAUDE.md                Project conventions and product decisions
└── README.md                Project overview and setup guide
```

## 🚀 Quick start

### Requirements

- Node.js 20+
- PHP 8.3+
- Composer
- SQLite (default) or MySQL

### 1. Start the API

```bash
cd joh_shopping_backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed
php artisan storage:link
php artisan dev
```

The API runs at `http://localhost:8000`.

### 2. Start the storefront

In a second terminal:

```bash
cd joh_shopping_frontend
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The default locale is Swahili at `/sw`; English is available at `/en`.

> Use `localhost:3000`, rather than `127.0.0.1:3000`, so Sanctum session cookies work correctly with the local API.

### Production build

```bash
cd joh_shopping_frontend
npm run build
npm start
```

The Laravel API must be reachable during the build because the storefront loads its catalog from the API.

## 🔐 Demo accounts

The seeded demo dataset includes products, orders, customers, coupons, staff, inventory, and more.

| Area | Login | Password |
| --- | --- | --- |
| Customer | `amina@example.co.tz` | `Password@123` |
| Super Admin | `admin@johshopping.co.tz` | `Admin@123` |
| Sales role | `sales@johshopping.co.tz` | `Sales@123` |

Useful demo data:

- Coupons: `KARIBU10`, `JOHFREE`, `SIMU50K`
- Guest tracking: `JOH-10240` with `amina@example.co.tz`
- Admin panel: `/sw/admin` or `/en/admin`

To restore the demo database:

```bash
cd joh_shopping_backend
php artisan migrate:fresh --seed
```

For a live deployment, set `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS=false` and use real credentials.

## 🌍 Localisation and regional behaviour

- Swahili is the source language for UI translations in `dictionaries/sw/`.
- English translations live in `dictionaries/en/` and are type-checked against Swahili.
- Product and catalog content uses bilingual `{ sw, en }` fields.
- Prices are whole Tanzanian Shillings and are formatted with `formatTZS()`.
- Tanzanian numbers are normalised to the `+255...` format.
- Backend and storefront dates use `Africa/Nairobi` by default.
- Set `APP_TIMEZONE` in the backend `.env` if a deployment needs a different timezone.

## 🧪 Testing and quality

Run the backend feature tests:

```bash
cd joh_shopping_backend
php artisan test --compact
```

Run frontend checks:

```bash
cd joh_shopping_frontend
npx tsc --noEmit
npm run lint
```

The backend uses Laravel feature tests for authentication, catalog, checkout, orders, permissions, and admin workflows. The frontend uses strict TypeScript, ESLint, and Next.js production builds.

## 💳 Payments and production readiness

The included payment driver is a sandbox for development. Before accepting real payments, integrate a provider and configure its credentials securely.

Potential Tanzanian gateway integrations include:

- Selcom
- AzamPay
- ClickPesa
- Pesapal
- DPO

For deployment:

1. Serve the Laravel API from a secure API subdomain.
2. Set `FRONTEND_URL`, `SANCTUM_STATEFUL_DOMAINS`, and `SESSION_DOMAIN`.
3. Use MySQL or a managed production database.
4. Configure a real mail provider and supervised queue worker.
5. Set `APP_DEBUG=false`.
6. Disable demo accounts.
7. Replace the sandbox payment driver with a verified gateway.
8. Keep `STOREFRONT_REVALIDATE_SECRET` and `REVALIDATE_SECRET` identical and private.

## 🗺️ Project status

### Complete

- Storefront, checkout, authentication, customer account, and admin panel
- Role-based permissions and activity logging
- Catalog, stock, serial/IMEI, order, return, and coupon workflows
- API integration with no static mock catalog layer
- Bilingual UI and Tanzania-specific currency, phone, payment, and timezone handling

### Planned before launch

- Production payment gateway integration
- Real product photography and uploaded catalog media
- Final About-page content
- Live active-session management in the customer security area
- Production deployment and observability

## 📚 Further documentation

- [Frontend README](joh_shopping_frontend/README.md)
- [Backend README](joh_shopping_backend/README.md)
- [Project conventions](CLAUDE.md)

## 🤝 Contributing

Keep changes focused and consistent with the existing architecture. Before opening a pull request:

1. Run the relevant backend tests.
2. Run the frontend TypeScript and lint checks.
3. Confirm API response shapes still match `joh_shopping_frontend/types/`.
4. Check both `/sw` and `/en`.
5. Verify customer and role-specific admin permissions where applicable.

## 📄 License

No open-source license has been selected for this project yet. All rights are reserved unless a separate license is provided by the project owner.

---

<div align="center">

Built for Tanzania with ❤️  
**Joh Shopping**

</div>
