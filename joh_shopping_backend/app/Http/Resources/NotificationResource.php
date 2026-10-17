<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;

/**
 * An in-app notification (frontend AppNotification).
 *
 * @mixin DatabaseNotification
 */
class NotificationResource extends ApiResource
{
    protected array $optional = ['href'];

    protected function fields(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->data['title'] ?? ['sw' => '', 'en' => ''],
            'body' => $this->data['body'] ?? ['sw' => '', 'en' => ''],
            'type' => $this->data['type'] ?? 'account',
            'read' => $this->read_at !== null,
            'href' => $this->data['href'] ?? null,
            'createdAt' => self::iso($this->created_at),
        ];
    }
}
