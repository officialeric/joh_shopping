<?php

namespace App\Http\Resources;

use App\Models\Page;
use Illuminate\Http\Request;

/**
 * @mixin Page
 */
class PageResource extends ApiResource
{
    protected function fields(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'body' => $this->body,
            'updatedAt' => self::iso($this->updated_at),
            'published' => $this->published,
        ];
    }
}
