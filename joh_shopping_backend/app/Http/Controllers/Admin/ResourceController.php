<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ApiResource;
use App\Support\ActivityLogger;
use App\Support\StorefrontCache;
use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Generic back-office CRUD, the server side of the frontend's lib/api/core.ts:
 *
 *   GET    /api/admin/{resource}?page=&perPage=&search=&sort=-createdAt&filter[status]=paid
 *   GET    /api/admin/{resource}?all=1          (unpaginated, for selects)
 *   GET    /api/admin/{resource}/{id}
 *   POST   /api/admin/{resource}
 *   PATCH  /api/admin/{resource}/{id}           (partial update)
 *   DELETE /api/admin/{resource}/{id}
 *   DELETE /api/admin/{resource}  { ids: [] }   (bulk)
 *
 * Input and output use the frontend's camelCase field names. Every mutation is
 * written to the activity log.
 *
 * @template TModel of Model
 */
abstract class ResourceController extends Controller
{
    /**
     * Singular noun for activity-log entries, e.g. "coupon".
     */
    protected string $noun = 'record';

    protected string $defaultSort = '-createdAt';

    /**
     * Whether changes show on the storefront (triggers a storefront cache refresh).
     */
    protected bool $affectsStorefront = false;

    /**
     * @return class-string<TModel>
     */
    abstract protected function model(): string;

    /**
     * @return class-string<ApiResource>
     */
    abstract protected function resource(): string;

    /**
     * Validation rules (camelCase keys). On PATCH every top-level rule becomes "sometimes".
     *
     * @param  TModel|null  $model
     * @return array<string, mixed>
     */
    abstract protected function rules(Request $request, ?Model $model): array;

    /**
     * Human label for the activity log.
     *
     * @param  TModel  $model
     */
    abstract protected function label(Model $model): string;

    /**
     * @return Builder<TModel>
     */
    protected function query(): Builder
    {
        return ($this->model())::query();
    }

    /**
     * Sortable fields: camelCase name → column, or a closure(Builder, 'asc'|'desc').
     *
     * @return array<string, string|Closure>
     */
    protected function sortable(): array
    {
        return ['createdAt' => 'created_at'];
    }

    /**
     * Filterable fields: camelCase name → column, or a closure(Builder, string $value).
     *
     * @return array<string, string|Closure>
     */
    protected function filterable(): array
    {
        return [];
    }

    /**
     * Columns matched by ?search= (JSON paths like "name->en" allowed).
     *
     * @return list<string>
     */
    protected function searchable(): array
    {
        return [];
    }

    /**
     * Copy validated input onto the model. Default: camelCase → snake_case.
     *
     * @param  TModel  $model
     * @param  array<string, mixed>  $data
     */
    protected function fill(Model $model, array $data): void
    {
        foreach ($data as $key => $value) {
            $model->setAttribute(Str::snake($key), $value);
        }
    }

    /**
     * Hook for relations (variants, permissions, items) after the row is saved.
     *
     * @param  TModel  $model
     * @param  array<string, mixed>  $data
     */
    protected function afterSave(Model $model, array $data, bool $created): void {}

    /**
     * Throw a ValidationException to block deleting this row.
     *
     * @param  TModel  $model
     */
    protected function ensureDeletable(Model $model): void {}

    /**
     * Relations/counts to load before serialising.
     *
     * @param  Builder<TModel>  $query
     * @return Builder<TModel>
     */
    protected function withRelations(Builder $query): Builder
    {
        return $query;
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = $this->withRelations($this->query());

        $this->applySearch($query, trim((string) $request->query('search', '')));
        $this->applyFilters($query, (array) $request->query('filter', []));
        $this->applySort($query, (string) $request->query('sort', $this->defaultSort));

        $resource = $this->resource();

        if ($request->boolean('all')) {
            return $resource::collection($query->limit(2000)->get());
        }

        $perPage = min(100, max(1, (int) $request->query('perPage', 10)));

        return $resource::collection($query->paginate($perPage)->withQueryString());
    }

    public function show(string $id): JsonResource
    {
        $resource = $this->resource();

        return new $resource($this->withRelations($this->query())->findOrFail($id));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules($request, null));
        $modelClass = $this->model();

        /** @var TModel $model */
        $model = DB::transaction(function () use ($modelClass, $data): Model {
            $model = new $modelClass;
            $this->fill($model, $data);
            $model->save();
            $this->afterSave($model, $data, true);

            return $model;
        });

        ActivityLogger::log("created {$this->noun}", $this->label($model));
        $this->refreshStorefront();

        return $this->respond($model)->setStatusCode(201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $model = $this->query()->findOrFail($id);
        $data = $request->validate($this->partial($this->rules($request, $model), $request));

        DB::transaction(function () use ($model, $data): void {
            $this->fill($model, $data);
            $model->save();
            $this->afterSave($model, $data, false);
        });

        ActivityLogger::log("updated {$this->noun}", $this->label($model));
        $this->refreshStorefront();

        return $this->respond($model);
    }

    public function destroy(string $id): JsonResponse
    {
        $model = $this->query()->findOrFail($id);
        $this->ensureDeletable($model);
        $label = $this->label($model);
        $model->delete();

        ActivityLogger::log("deleted {$this->noun}", $label);
        $this->refreshStorefront();

        return response()->json(null, 204);
    }

    public function destroyMany(Request $request): JsonResponse
    {
        $ids = $request->validate(['ids' => ['required', 'array', 'min:1', 'max:500'], 'ids.*' => ['string']])['ids'];
        $models = $this->query()->whereKey($ids)->get();
        $models->each(fn (Model $model) => $this->ensureDeletable($model));

        DB::transaction(fn () => $models->each->delete());

        ActivityLogger::log("deleted {$this->noun}", "{$models->count()} record(s)");
        $this->refreshStorefront();

        return response()->json(null, 204);
    }

    protected function refreshStorefront(): void
    {
        if ($this->affectsStorefront) {
            StorefrontCache::flush();
        }
    }

    /**
     * @param  TModel  $model
     */
    protected function respond(Model $model): JsonResponse
    {
        $resource = $this->resource();
        $fresh = $this->withRelations($this->query())->findOrFail($model->getKey());

        return (new $resource($fresh))->response();
    }

    /**
     * PATCH semantics: validate only the fields that were sent.
     *
     * @param  array<string, mixed>  $rules
     * @return array<string, mixed>
     */
    protected function partial(array $rules, Request $request): array
    {
        foreach ($rules as $key => $rule) {
            if (str_contains($key, '.')) {
                if (! $request->exists(strtok($key, '.'))) {
                    unset($rules[$key]);
                }

                continue;
            }
            $rules[$key] = ['sometimes', ...(is_array($rule) ? $rule : explode('|', $rule))];
        }

        return $rules;
    }

    /**
     * @param  Builder<TModel>  $query
     */
    protected function applySearch(Builder $query, string $search): void
    {
        $columns = $this->searchable();
        if ($search === '' || ! $columns) {
            return;
        }

        $needle = '%'.mb_strtolower($search).'%';
        $query->where(function (Builder $query) use ($columns, $needle): void {
            foreach ($columns as $column) {
                $query->orWhereRaw('LOWER('.$this->columnSql($query, $column).') LIKE ?', [$needle]);
            }
        });
    }

    /**
     * @param  Builder<TModel>  $query
     * @param  array<string, mixed>  $filters
     */
    protected function applyFilters(Builder $query, array $filters): void
    {
        $allowed = $this->filterable();

        foreach ($filters as $field => $value) {
            if (! is_string($value) || $value === '' || $value === 'all' || ! isset($allowed[$field])) {
                continue;
            }

            $target = $allowed[$field];
            if ($target instanceof Closure) {
                $target($query, $value);
            } elseif (in_array($value, ['true', 'false'], true)) {
                $query->where($target, $value === 'true');
            } else {
                $query->where($target, $value);
            }
        }
    }

    /**
     * @param  Builder<TModel>  $query
     */
    protected function applySort(Builder $query, string $sort): void
    {
        $desc = str_starts_with($sort, '-');
        $field = ltrim($sort, '-');
        $column = $this->sortable()[$field] ?? null;

        if ($column instanceof Closure) {
            $column($query, $desc ? 'desc' : 'asc');
        } elseif ($column) {
            $query->orderBy($column, $desc ? 'desc' : 'asc');
        }
        $query->orderBy($query->getModel()->getQualifiedKeyName());
    }

    /**
     * SQL for a column or JSON path, portable across SQLite and MySQL.
     *
     * @param  Builder<TModel>  $query
     */
    private function columnSql(Builder $query, string $column): string
    {
        return $query->getQuery()->getGrammar()->wrap($column);
    }
}
