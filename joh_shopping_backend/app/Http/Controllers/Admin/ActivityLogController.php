<?php

namespace App\Http\Controllers\Admin;

use App\Http\Resources\ActivityLogResource;
use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The audit trail (read-only).
 *
 * @extends ResourceController<ActivityLog>
 */
class ActivityLogController extends ResourceController
{
    protected function model(): string
    {
        return ActivityLog::class;
    }

    protected function resource(): string
    {
        return ActivityLogResource::class;
    }

    protected function label(Model $model): string
    {
        return $model->action;
    }

    protected function searchable(): array
    {
        return ['actor', 'action', 'subject'];
    }

    protected function sortable(): array
    {
        return ['createdAt' => 'created_at', 'actor' => 'actor', 'action' => 'action'];
    }

    protected function filterable(): array
    {
        return ['actor' => 'actor', 'staffId' => 'staff_id', 'action' => 'action'];
    }

    protected function rules(Request $request, ?Model $model): array
    {
        return [];
    }

    /**
     * Distinct actor names, for the activity log's filter.
     */
    public function actors(): JsonResponse
    {
        return response()->json(['data' => ActivityLog::query()->distinct()->orderBy('actor')->pluck('actor')]);
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(['message' => 'The activity log is append-only.'], 405);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        return response()->json(['message' => 'The activity log is append-only.'], 405);
    }

    public function destroy(string $id): JsonResponse
    {
        return response()->json(['message' => 'The activity log is append-only.'], 405);
    }

    public function destroyMany(Request $request): JsonResponse
    {
        return response()->json(['message' => 'The activity log is append-only.'], 405);
    }
}
