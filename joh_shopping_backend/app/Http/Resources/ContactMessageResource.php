<?php

namespace App\Http\Resources;

use App\Models\ContactMessage;
use Illuminate\Http\Request;

/**
 * @mixin ContactMessage
 */
class ContactMessageResource extends ApiResource
{
    protected array $optional = ['phone', 'reply', 'repliedAt'];

    protected function fields(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'subject' => $this->subject,
            'message' => $this->message,
            'status' => $this->status,
            'reply' => $this->reply,
            'repliedAt' => self::iso($this->replied_at),
            'createdAt' => self::iso($this->created_at),
        ];
    }
}
