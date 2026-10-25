<?php

declare(strict_types=1);

use Basalt\Http\BillingController;
use Basalt\Http\ContentController;
use Basalt\Http\VersionController;
use Illuminate\Support\Facades\Route;

// Mounted at /api/admin/extensions/basalt behind the admin API's root administrator authentication.
Route::get('/version', VersionController::class);
Route::get('/content', [ContentController::class, 'show']);
Route::put('/content/{key}', [ContentController::class, 'update']);
Route::post('/eggs/{egg}/image', [ContentController::class, 'storeImage']);
Route::delete('/eggs/{egg}/image', [ContentController::class, 'destroyImage']);
Route::get('/billing', [BillingController::class, 'show']);
Route::put('/billing', [BillingController::class, 'update']);
Route::post('/billing/test', [BillingController::class, 'test']);
