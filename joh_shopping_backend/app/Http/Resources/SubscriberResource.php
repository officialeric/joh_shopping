<?php

namespace App\Http\Resources;

use App\Models\Subscriber;
use Illuminate\Http\Request;

/**
 * @mixin Subscriber
 */
class SubscriberResource extends ApiResource
{
    protected function fields(Request $request): array
    {
        return [
            'id' => $this->id,
            'email' => $this->email,
            'source' => $this->source,
            'active' => $this->active,
            'createdAt' => self::iso($this->created_at),
        ];
    }
}
