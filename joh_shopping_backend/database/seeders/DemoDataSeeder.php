<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\Staff;
use App\Support\Sequence;
use App\Support\StoreSettings;
use Carbon\CarbonImmutable;
use Database\Seeders\Concerns\SeedsCatalog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Loads the frontend's demo data (database/seeders/data/seed.json, exported by
 * joh_shopping_frontend/scripts/export-backend-seed.ts) so both apps share the
 * same ids, orders and demo accounts.
 *
 * All timestamps are shifted so the newest seed record lands at "now", which
 * keeps dashboards, coupons and flash sales current whenever you re-seed.
 *
 * Demo logins: amina@example.co.tz / Password@123 (customer),
 * admin@johshopping.co.tz / Admin@123, sales@johshopping.co.tz / Sales@123.
 */
class DemoDataSeeder extends Seeder
{
    use SeedsCatalog;

    /** @var array<string, mixed> */
    private array $seed;

    private int $shift = 0;

    private string $now;

    /**
     * @param  bool  $storeOnly  Only the store setup (categories, brands, attributes,
     *                           shipping, pickup stores, pages, settings); no products,
     *                           customers, staff, orders or marketing data.
     */
    public function run(bool $storeOnly = false): void
    {
        $this->seed = json_decode((string) file_get_contents(database_path('seeders/data/seed.json')), true, flags: JSON_THROW_ON_ERROR);
        $this->shift = CarbonImmutable::now()->getTimestamp() - CarbonImmutable::parse($this->seed['seedNow'])->getTimestamp();
        $this->now = now()->toDateTimeString();

        DB::transaction(function () use ($storeOnly): void {
            $this->catalog($storeOnly);
            $this->storeSetup();

            if ($storeOnly) {
                Sequence::set('orders', 10239);
                Sequence::set('returns', 5099);

                return;
            }

            $this->people();
            $this->sales();
            $this->backOffice();
        });

        StoreSettings::save($this->seed['settings']);
    }

    private function catalog(bool $storeOnly): void
    {
        $this->insert('categories', $this->seed['categories'], fn (array $c): array => [
            'id' => $c['id'],
            'slug' => $c['slug'],
            'name' => $this->json($c['name']),
            'description' => $this->json($c['description']),
            'parent_id' => $c['parentId'],
            'icon' => $c['icon'],
            'art' => $c['art'],
            'active' => $c['active'],
            'sort_order' => $c['sortOrder'],
            'created_at' => $this->now,
            'updated_at' => $this->now,
        ]);

        $this->insert('brands', $this->seed['brands'], fn (array $b): array => [
            'id' => $b['id'],
            'slug' => $b['slug'],
            'name' => $b['name'],
            'country' => $b['country'],
            'active' => $b['active'],
            'created_at' => $this->now,
            'updated_at' => $this->now,
        ]);

        // The clean store's products and banners come from StoreCatalogSeeder.
        if (! $storeOnly) {
            foreach ($this->seed['products'] as $p) {
                $this->seedProduct($p, $this->at($p['createdAt']));
            }
        }

        $this->insert('attribute_values', $this->seed['attributes'], fn (array $a): array => [
            'id' => $a['id'],
            'type' => $a['type'],
            'value' => $a['value'],
            'label' => isset($a['label']) ? $this->json($a['label']) : null,
            'hex' => $a['hex'] ?? null,
            'created_at' => $this->now,
            'updated_at' => $this->now,
        ]);
    }

    /**
     * Shipping zones, pickup stores and policy pages.
     */
    private function storeSetup(): void
    {
        $this->insert('shipping_zones', $this->seed['zones'], fn (array $z): array => [
            'id' => $z['id'],
            'name' => $z['name'],
            'regions' => $this->json($z['regions']),
            'standard_fee' => $z['standardFee'],
            'express_fee' => $z['expressFee'],
            'free_above' => $z['freeAbove'],
            'standard_days' => $z['standardDays'],
            'express_days' => $z['expressDays'],
            'active' => $z['active'],
            'created_at' => $this->now,
            'updated_at' => $this->now,
        ]);

        $this->insert('pickup_stores', $this->seed['stores'], fn (array $s): array => [
            'id' => $s['id'],
            'name' => $s['name'],
            'region' => $s['region'],
            'address' => $s['address'],
            'phone' => $s['phone'],
            'hours' => $this->json($s['hours']),
            'map_url' => $s['mapUrl'],
            'created_at' => $this->now,
            'updated_at' => $this->now,
        ]);

        $this->insert('pages', $this->seed['pages'], fn (array $p): array => [
            'id' => $p['id'],
            'slug' => $p['slug'],
            'title' => $this->json($p['title']),
            'body' => $this->json($p['body']),
            'published' => $p['published'],
            'created_at' => $this->at($p['updatedAt']),
            'updated_at' => $this->at($p['updatedAt']),
        ]);
    }

    private function people(): void
    {
        $demoUsers = collect($this->seed['users'])->keyBy('id');
        $sharedPassword = Hash::make(Str::random(32));

        $this->insert('users', $this->seed['customers'], fn (array $c): array => [
            'id' => $c['id'],
            'name' => $c['name'],
            'email' => $c['email'],
            'phone' => $c['phone'],
            'email_verified_at' => $this->at($c['createdAt']),
            'password' => $demoUsers->has($c['id']) ? Hash::make($demoUsers[$c['id']]['password']) : $sharedPassword,
            'status' => $c['status'],
            'region' => $c['region'],
            'newsletter' => $c['newsletter'],
            'two_factor' => (bool) ($demoUsers[$c['id']]['twoFactor'] ?? false),
            'preferences' => null,
            'orders_count' => $c['ordersCount'],
            'total_spent' => $c['totalSpent'],
            'last_order_at' => $this->at($c['lastOrderAt'] ?? null),
            'created_at' => $this->at($c['createdAt']),
            'updated_at' => $this->at($c['createdAt']),
        ]);

        $logins = collect($this->seed['adminUsers'])->keyBy('id');

        foreach ($this->seed['staff'] as $s) {
            $login = $logins->get($s['id']);
            $staff = Staff::create([
                'id' => $s['id'],
                'name' => $s['name'],
                'email' => $login['email'] ?? $s['email'],
                'phone' => $s['phone'],
                'password' => $s['status'] === 'invited' ? null : ($login ? $login['password'] : 'Staff@123'),
                'status' => $s['status'],
                'last_active_at' => $this->at($s['lastActiveAt'] ?? null),
                'created_at' => $this->at($s['createdAt']),
                'updated_at' => $this->at($s['createdAt']),
            ]);
            $staff->syncRoles([Role::findOrFail($s['roleId'])]);
        }

        $this->insert('addresses', $this->seed['addresses'], fn (array $a): array => [
            'id' => $a['id'],
            'user_id' => $a['customerId'],
            'label' => $a['label'],
            'full_name' => $a['fullName'],
            'phone' => $a['phone'],
            'region' => $a['region'],
            'district' => $a['district'],
            'street' => $a['street'],
            'landmark' => $a['landmark'] ?? null,
            'is_default' => $a['isDefault'],
            'created_at' => $this->now,
            'updated_at' => $this->now,
        ]);

        $this->insert('saved_payment_methods', $this->seed['savedPayments'], fn (array $p): array => [
            'id' => $p['id'],
            'user_id' => $p['customerId'],
            'method' => $p['method'],
            'label' => $p['label'],
            'is_default' => $p['isDefault'],
            'created_at' => $this->now,
            'updated_at' => $this->now,
        ]);

        $this->insert('notifications', $this->seed['notifications'], fn (array $n): array => [
            'id' => $n['id'],
            'type' => 'seeded',
            'notifiable_type' => 'user',
            'notifiable_id' => $n['customerId'],
            'data' => $this->json(Arr::only($n, ['title', 'body', 'type', 'href'])),
            'read_at' => $n['read'] ? $this->at($n['createdAt']) : null,
            'created_at' => $this->at($n['createdAt']),
            'updated_at' => $this->at($n['createdAt']),
        ]);
    }

    private function sales(): void
    {
        $this->insert('coupons', $this->seed['coupons'], fn (array $c): array => [
            'id' => $c['id'],
            'code' => $c['code'],
            'type' => $c['type'],
            'value' => $c['value'],
            'min_spend' => $c['minSpend'],
            'max_discount' => $c['maxDiscount'] ?? null,
            'usage_limit' => $c['usageLimit'],
            'used' => $c['used'],
            'starts_at' => $this->at($c['startsAt']),
            'expires_at' => $this->at($c['expiresAt']),
            'active' => $c['active'],
            'description' => $this->json($c['description']),
            'created_at' => $this->at($c['startsAt']),
            'updated_at' => $this->at($c['startsAt']),
        ]);

        foreach ($this->seed['flashSales'] as $f) {
            DB::table('flash_sales')->insert([
                'id' => $f['id'],
                'name' => $this->json($f['name']),
                'starts_at' => $this->at($f['startsAt']),
                'ends_at' => $this->at($f['endsAt']),
                'active' => $f['active'],
                'created_at' => $this->now,
                'updated_at' => $this->now,
            ]);
            $this->insert('flash_sale_items', $f['items'], fn (array $i): array => [
                'flash_sale_id' => $f['id'],
                'product_id' => $i['productId'],
                'sale_price' => $i['salePrice'],
                'quantity' => $i['quantity'],
                'sold' => $i['sold'],
                'created_at' => $this->now,
                'updated_at' => $this->now,
            ]);
        }

        $customerIds = collect($this->seed['customers'])->pluck('id')->flip();

        $this->insert('orders', $this->seed['orders'], fn (array $o): array => [
            'id' => $o['id'],
            'number' => $o['number'],
            'user_id' => $customerIds->has($o['customerId']) ? $o['customerId'] : null,
            'customer_name' => $o['customerName'],
            'customer_email' => $o['customerEmail'],
            'customer_phone' => $o['customerPhone'],
            'subtotal' => $o['subtotal'],
            'discount' => $o['discount'],
            'shipping_fee' => $o['shippingFee'],
            'total' => $o['total'],
            'coupon_code' => $o['couponCode'] ?? null,
            'status' => $o['status'],
            'payment_status' => $o['paymentStatus'],
            'payment_method' => $o['paymentMethod'],
            'delivery_method' => $o['deliveryMethod'],
            'address' => isset($o['address']) ? $this->json($o['address']) : null,
            'region' => $o['address']['region'] ?? null,
            'pickup_store_id' => $o['pickupStoreId'] ?? null,
            'courier' => isset($o['courier']) ? $this->json($o['courier']) : null,
            'notes' => $o['notes'] ?? null,
            'locale' => 'sw',
            'created_at' => $this->at($o['createdAt']),
            'updated_at' => $this->at(collect($o['timeline'])->last()['at'] ?? $o['createdAt']),
        ]);

        $this->insert('order_items', collect($this->seed['orders'])->flatMap(fn (array $o) => collect($o['items'])->map(fn (array $i): array => [
            'order_id' => $o['id'],
            'product_id' => $i['productId'],
            'variant_id' => $i['variantId'],
            'name' => $i['name'],
            'variant_label' => $i['variantLabel'],
            'price' => $i['price'],
            'qty' => $i['qty'],
            'imei' => isset($i['imei']) ? $this->json($i['imei']) : null,
        ]))->all());

        $this->insert('order_events', collect($this->seed['orders'])->flatMap(fn (array $o) => collect($o['timeline'])->map(fn (array $e): array => [
            'order_id' => $o['id'],
            'status' => $e['status'],
            'note' => $e['note'] ?? null,
            'by' => $e['by'] ?? null,
            'at' => $this->at($e['at']),
        ]))->all());

        $this->insert('payments', $this->seed['payments'], fn (array $p): array => [
            'id' => $p['id'],
            'reference' => $p['reference'],
            'order_id' => $p['orderId'],
            'method' => $p['method'],
            'gateway' => $p['method'] === 'cod' ? 'cod' : 'sandbox',
            'gateway_reference' => null,
            'amount' => $p['amount'],
            'refunded' => $p['refunded'],
            'status' => $p['status'],
            'payer_phone' => $p['payerPhone'] ?? null,
            'card_last4' => $p['cardLast4'] ?? null,
            'meta' => null,
            'paid_at' => in_array($p['status'], ['paid', 'refunded', 'partially_refunded'], true) ? $this->at($p['createdAt']) : null,
            'created_at' => $this->at($p['createdAt']),
            'updated_at' => $this->at($p['createdAt']),
        ]);

        $this->insert('return_requests', $this->seed['returns'], fn (array $r): array => [
            'id' => $r['id'],
            'number' => $r['number'],
            'type' => $r['type'],
            'order_id' => $r['orderId'],
            'user_id' => $customerIds->has($r['customerId']) ? $r['customerId'] : null,
            'customer_name' => $r['customerName'],
            'product_name' => $r['productName'],
            'imei' => $r['imei'] ?? null,
            'reason' => $r['reason'],
            'details' => $r['details'],
            'status' => $r['status'],
            'resolution' => $r['resolution'] ?? null,
            'created_at' => $this->at($r['createdAt']),
            'updated_at' => $this->at($r['updatedAt']),
        ]);

        $customersByName = collect($this->seed['customers'])->pluck('id', 'name');
        $this->insert('reviews', [...$this->seed['reviews'], ...$this->seed['catalogReviews']], fn (array $r): array => [
            'id' => $r['id'],
            'product_id' => $r['productId'],
            'user_id' => str_starts_with($r['id'], 'rev-') ? ($customersByName[$r['customerName']] ?? null) : null,
            'customer_name' => $r['customerName'],
            'rating' => $r['rating'],
            'title' => $r['title'],
            'body' => $r['body'],
            'verified' => $r['verified'],
            'helpful' => $r['helpful'],
            'status' => $r['status'],
            'reply' => $r['reply'] ?? null,
            'created_at' => $this->at($r['createdAt']),
            'updated_at' => $this->at($r['createdAt']),
        ]);

        $this->insert('product_questions', $this->seed['questions'], fn (array $q): array => [
            'id' => $q['id'],
            'product_id' => $q['productId'],
            'user_id' => null,
            'question' => $q['question'],
            'answer' => $q['answer'] ?? null,
            'asked_by' => $q['askedBy'],
            'published' => true,
            'created_at' => $this->at($q['createdAt']),
            'updated_at' => $this->at($q['createdAt']),
        ]);

        $orderIds = collect($this->seed['orders'])->pluck('id', 'number');
        $this->insert('serials', $this->seed['serials'], fn (array $s): array => [
            'id' => $s['id'],
            'imei' => $s['imei'],
            'product_id' => $s['productId'],
            'product_name' => $s['productName'],
            'variant_label' => $s['variantLabel'],
            'status' => $s['status'],
            'order_id' => isset($s['orderNumber']) ? ($orderIds[$s['orderNumber']] ?? null) : null,
            'order_number' => $s['orderNumber'] ?? null,
            'customer_name' => $s['customerName'] ?? null,
            'sold_at' => $this->at($s['soldAt'] ?? null),
            'warranty_until' => $this->at($s['warrantyUntil'] ?? null),
            'received_at' => $this->at($s['receivedAt']),
            'created_at' => $this->at($s['receivedAt']),
            'updated_at' => $this->at($s['soldAt'] ?? $s['receivedAt']),
        ]);

        $lastOrder = collect($this->seed['orders'])->map(fn (array $o): int => (int) preg_replace('/\D/', '', $o['number']))->max();
        $lastReturn = collect($this->seed['returns'])->map(fn (array $r): int => (int) preg_replace('/\D/', '', $r['number']))->max();
        Sequence::set('orders', $lastOrder);
        Sequence::set('returns', $lastReturn);
    }

    private function backOffice(): void
    {
        foreach ($this->seed['banners'] as $b) {
            $this->seedBanner($b);
        }

        $this->insert('contact_messages', $this->seed['messages'], fn (array $m): array => [
            'id' => $m['id'],
            'name' => $m['name'],
            'email' => $m['email'],
            'phone' => $m['phone'] ?? null,
            'subject' => $m['subject'],
            'message' => $m['message'],
            'status' => $m['status'],
            'reply' => null,
            'replied_at' => null,
            'created_at' => $this->at($m['createdAt']),
            'updated_at' => $this->at($m['createdAt']),
        ]);

        $this->insert('subscribers', collect($this->seed['subscribers'])->unique('email')->values()->all(), fn (array $s): array => [
            'id' => $s['id'],
            'email' => $s['email'],
            'source' => $s['source'],
            'active' => $s['active'],
            'created_at' => $this->at($s['createdAt']),
            'updated_at' => $this->at($s['createdAt']),
        ]);

        $this->insert('stock_movements', $this->seed['stockMovements'], fn (array $m): array => [
            'id' => $m['id'],
            'product_id' => $m['productId'],
            'variant_id' => $m['variantId'],
            'product_name' => $m['productName'],
            'variant_label' => $m['variantLabel'],
            'type' => $m['type'],
            'qty' => $m['qty'],
            'reason' => $m['reason'],
            'by' => $m['by'],
            'staff_id' => null,
            'created_at' => $this->at($m['createdAt']),
            'updated_at' => $this->at($m['createdAt']),
        ]);

        $staffByName = collect($this->seed['staff'])->pluck('id', 'name');
        $this->insert('activity_logs', $this->seed['activity'], fn (array $a): array => [
            'id' => $a['id'],
            'staff_id' => $staffByName[$a['actor']] ?? null,
            'actor' => $a['actor'],
            'action' => $a['action'],
            'subject' => $a['subject'],
            'meta' => $a['meta'] ?? null,
            'ip' => $a['ip'],
            'created_at' => $this->at($a['createdAt']),
            'updated_at' => $this->at($a['createdAt']),
        ]);
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @param  (callable(array<string, mixed>, int): array<string, mixed>)|null  $map
     */
    private function insert(string $table, array $rows, ?callable $map = null): void
    {
        $mapped = $map ? array_map($map, $rows, array_keys($rows)) : $rows;

        foreach (array_chunk($mapped, 200) as $chunk) {
            DB::table($table)->insert($chunk);
        }
    }

    /**
     * A seed timestamp moved forward by the seed→now offset, as a UTC DB string.
     */
    private function at(?string $iso): ?string
    {
        return $iso ? CarbonImmutable::parse($iso)->utc()->addSeconds($this->shift)->toDateTimeString() : null;
    }

    private function json(mixed $value): string
    {
        return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    }
}
