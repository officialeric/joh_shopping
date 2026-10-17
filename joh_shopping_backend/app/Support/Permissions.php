<?php

namespace App\Support;

/**
 * Back-office permission keys. Mirrors `Permission` in the frontend's types/index.ts.
 */
class Permissions
{
    public const SUPER_ADMIN = 'Super Admin';

    public const SUPER_ADMIN_ID = 'role-super';

    public const ALL = [
        'dashboard.view',
        'products.manage',
        'categories.manage',
        'inventory.manage',
        'orders.view',
        'orders.manage',
        'payments.view',
        'payments.refund',
        'returns.manage',
        'customers.manage',
        'staff.manage',
        'roles.manage',
        'promotions.manage',
        'reviews.manage',
        'content.manage',
        'shipping.manage',
        'messages.manage',
        'reports.view',
        'activity.view',
        'settings.manage',
    ];
}
