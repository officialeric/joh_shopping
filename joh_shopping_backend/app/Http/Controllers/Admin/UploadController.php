<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Image uploads for products and banners. Returns a public URL to store in
 * `images[]` / `image`. Run `php artisan storage:link` once per server.
 */
class UploadController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=4000,max_height=4000'],
            'folder' => ['nullable', 'in:products,banners,brands'],
        ]);

        $folder = $request->input('folder', 'products');
        $path = $request->file('file')->store("uploads/{$folder}", 'public');
        ActivityLogger::log('uploaded image', $path);

        return response()->json(['data' => ['path' => $path, 'url' => Storage::disk('public')->url($path)]], 201);
    }
}
