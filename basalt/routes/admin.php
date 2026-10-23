<?php

declare(strict_types=1);

use Basalt\Http\VersionController;
use Illuminate\Support\Facades\Route;

// Mounted at /api/admin/extensions/basalt behind the admin API's root administrator authentication.
Route::get('/version', VersionController::class);
