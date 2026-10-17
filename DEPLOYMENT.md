# Deploying Joh Shopping

Two apps on one server:

| Site | App | Runs as |
| --- | --- | --- |
| `https://johshopping.com` | Next.js storefront + admin (`joh_shopping_frontend`) | PM2 → Node on `127.0.0.1:3000`, behind Nginx |
| `https://api.johshopping.com` | Laravel API (`joh_shopping_backend`) | Nginx + PHP-FPM, plus a queue worker for emails |

Both must share the parent domain (`johshopping.com`) because customers and staff sign in with cookies (Sanctum).
Email keeps using the existing mail server (`mail.johshopping.com`), so **do not change the MX records**.

Ready-made files are in [`deploy/`](deploy): Nginx sites, the queue-worker service, the PM2 config and `deploy.sh`.

---

## 1. What you need

- A VPS with **Ubuntu 24.04, 2 GB RAM or more** (the storefront build needs it), e.g. from a local or international provider.
- DNS `A` records pointing to the server: `johshopping.com`, `www.johshopping.com`, `api.johshopping.com`.
- The SMTP password for `support@johshopping.com`.

## 2. Install the software (once)

```bash
sudo apt update && sudo apt install -y nginx mysql-server git unzip certbot python3-certbot-nginx
sudo add-apt-repository -y ppa:ondrej/php && sudo apt install -y \
  php8.4-fpm php8.4-cli php8.4-mysql php8.4-mbstring php8.4-xml php8.4-curl php8.4-zip php8.4-gd php8.4-intl php8.4-bcmath
curl -sS https://getcomposer.org/installer | sudo php -- --install-dir=/usr/local/bin --filename=composer
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash - && sudo apt install -y nodejs && sudo npm i -g pm2
```

Allow photo uploads up to 8 MB in `/etc/php/8.4/fpm/php.ini` (`upload_max_filesize = 8M`, `post_max_size = 10M`), then `sudo systemctl restart php8.4-fpm`.

## 3. Database

```bash
sudo mysql -e "CREATE DATABASE joh_shopping CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'joh_shopping'@'localhost' IDENTIFIED BY 'a-long-random-password';
GRANT ALL ON joh_shopping.* TO 'joh_shopping'@'localhost';"
```

## 4. Code and settings

```bash
sudo mkdir -p /var/www && sudo chown $USER:www-data /var/www
git clone <your-repo-url> /var/www/joh_shopping && cd /var/www/joh_shopping

cp joh_shopping_backend/.env.production.example joh_shopping_backend/.env
cp joh_shopping_frontend/.env.production.example joh_shopping_frontend/.env.production.local
openssl rand -hex 32   # use the same value for STOREFRONT_REVALIDATE_SECRET (API) and REVALIDATE_SECRET (storefront)
```

Fill in the API `.env`: `DB_PASSWORD`, `MAIL_PASSWORD`, `ADMIN_PASSWORD` (the Super Admin's first password) and `STOREFRONT_REVALIDATE_SECRET`. Fill in `REVALIDATE_SECRET` in the storefront file.

## 5. First install of the API

```bash
cd /var/www/joh_shopping/joh_shopping_backend
composer install --no-dev --optimize-autoloader
php artisan key:generate --force
php artisan migrate --seed --force      # store setup, starter catalog, banners and the Super Admin
php artisan storage:link
sudo chown -R $USER:www-data storage bootstrap/cache && sudo chmod -R ug+rwX storage bootstrap/cache
php artisan optimize
```

Then remove `ADMIN_PASSWORD` from `.env` (sign in and change the password in the admin), and run `php artisan optimize` again.

## 6. Web server and HTTPS

```bash
sudo cp /var/www/joh_shopping/deploy/nginx/*.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/api.johshopping.com.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/johshopping.com.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.johshopping.com -d johshopping.com -d www.johshopping.com
```

## 7. Background jobs (emails)

Order confirmations, status updates and admin alerts are sent by the queue worker.

```bash
sudo cp /var/www/joh_shopping/deploy/systemd/joh-queue.service /etc/systemd/system/
sudo systemctl enable --now joh-queue
( crontab -l 2>/dev/null; echo "* * * * * cd /var/www/joh_shopping/joh_shopping_backend && php artisan schedule:run >> /dev/null 2>&1" ) | crontab -
```

## 8. Storefront

The build reads the catalog from the API, so the API must already be live (step 5–6).

```bash
cd /var/www/joh_shopping/joh_shopping_frontend
npm ci && npm run build
pm2 start /var/www/joh_shopping/deploy/ecosystem.config.cjs && pm2 save && pm2 startup
```

Open `https://johshopping.com` and the admin at `https://johshopping.com/sw/admin/login`.

## 9. Updating later

```bash
cd /var/www/joh_shopping && git pull && bash deploy/deploy.sh
```

After editing the API `.env`, run `php artisan optimize && php artisan queue:restart` (settings are cached, and the worker keeps old values until restarted). After editing the storefront env, rebuild (`npm run build && pm2 reload joh-storefront`).

---

## Before going live

- [ ] **Payments.** Only a test (sandbox) driver exists. On production it is switched off, so M-Pesa/Mixx/Airtel/card are hidden at checkout until a real gateway (Selcom, AzamPay or ClickPesa; Pesapal or DPO for cards) is added. Meanwhile you can enable **Cash on delivery** in Admin → Settings.
- [ ] **Product photos.** Products show illustrations until photos are added (Admin → Products → Media).
- [ ] **Homepage copy.** The testimonials (`dictionaries/*/shop.ts`) and the "25K+ customers / 26 regions / 4.8★ / 3 stores" figures (`app/[lang]/(shop)/page.tsx`) are sample content: replace them with real ones or remove them. The About page is also placeholder text.
- [ ] **Store details** in Admin → Settings: phone, WhatsApp, address, payment methods.
- [ ] **Demo logins** are hidden (`NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS=false`); never set `SEED_DEMO_DATA=true` on the live database.
- [ ] **Backups**: a nightly `mysqldump joh_shopping` plus a copy of `joh_shopping_backend/storage/app/public` (uploaded photos), kept off the server.
- [ ] Submit `https://johshopping.com/sitemap.xml` in Google Search Console.

## Shared hosting (cPanel) instead of a VPS

The API runs on normal PHP hosting (point `api.johshopping.com` at `joh_shopping_backend/public`). The storefront needs Node.js 20.9+: only possible if the host offers "Setup Node.js App". Without a long-running process, replace the queue service with a cron job every minute:
`php artisan queue:work --stop-when-empty --max-time=55`. A small VPS is simpler and more reliable.
