<?php

namespace App\Http\Controllers\Admin;

use App\Http\Resources\ContactMessageResource;
use App\Models\ContactMessage;
use App\Notifications\ContactReply;
use App\Support\ActivityLogger;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;

/**
 * Contact-form inbox.
 *
 * @extends ResourceController<ContactMessage>
 */
class MessageController extends ResourceController
{
    protected string $noun = 'message';

    protected function model(): string
    {
        return ContactMessage::class;
    }

    protected function resource(): string
    {
        return ContactMessageResource::class;
    }

    protected function label(Model $model): string
    {
        return "{$model->name}: {$model->subject}";
    }

    protected function searchable(): array
    {
        return ['name', 'email', 'subject', 'message'];
    }

    protected function sortable(): array
    {
        return ['createdAt' => 'created_at', 'status' => 'status', 'name' => 'name'];
    }

    protected function filterable(): array
    {
        return ['status' => 'status'];
    }

    protected function rules(Request $request, ?Model $model): array
    {
        return [
            'status' => ['required', Rule::in(['new', 'read', 'replied', 'archived'])],
        ];
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Messages arrive through the contact form.'], 405);
    }

    /**
     * Email a reply to the sender and mark the message replied.
     */
    public function reply(Request $request, ContactMessage $message): ContactMessageResource
    {
        $data = $request->validate(['reply' => ['required', 'string', 'max:5000']]);

        Notification::route('mail', $message->email)->notify(new ContactReply($message, $data['reply']));
        $message->update(['status' => 'replied', 'reply' => $data['reply'], 'replied_at' => now()]);

        ActivityLogger::log('replied to message', "{$message->name}: {$message->subject} — ".mb_substr($data['reply'], 0, 40));

        return new ContactMessageResource($message);
    }
}
