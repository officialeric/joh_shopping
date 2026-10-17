<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;

/**
 * A customer as the back office sees it.
 *
 * @mixin User
 */
class CustomerResource extends ApiResource
{
    protected array $optional = ['lastOrderAt'];

    protected function fields(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => (string) $this->phone,
            'status' => $this->status,
            'ordersCount' => $this->orders_count,
            'totalSpent' => $this->total_spent,
            'lastOrderAt' => self::iso($this->last_order_at),
            'region' => (string) $this->region,
            'newsletter' => $this->newsletter,
            'emailVerified' => $this->email_verified_at !== null,
            'createdAt' => self::iso($this->created_at),
            'addresses' => AddressResource::collection($this->whenLoaded('addresses')),
        ];
    }
}
