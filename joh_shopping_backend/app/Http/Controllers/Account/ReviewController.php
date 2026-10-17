<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReviewResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Reviews the signed-in customer has written (any status).
 */
class ReviewController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return ReviewResource::collection($request->user()->reviews()->latest()->get());
    }
}
