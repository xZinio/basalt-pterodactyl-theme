<?php

declare(strict_types=1);

use Basalt\Http\PlayersController;
use Basalt\Http\PreferencesController;
use Basalt\Http\ServerMetaController;
use Illuminate\Support\Facades\Route;

// Mounted at /api/client/extensions/basalt behind the client API's authentication and throttle.
Route::get('/preferences', [PreferencesController::class, 'show']);
Route::put('/preferences', [PreferencesController::class, 'update']);
Route::get('/servers', ServerMetaController::class);
Route::get('/players', PlayersController::class);
