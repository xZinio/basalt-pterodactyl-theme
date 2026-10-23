<?php

declare(strict_types=1);

use Basalt\Http\ManifestController;
use Illuminate\Support\Facades\Route;

// Mounted at /extensions/basalt in the web group, for guests and signed-in users alike.
Route::get('/manifest.webmanifest', ManifestController::class);
