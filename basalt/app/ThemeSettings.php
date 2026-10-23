<?php

declare(strict_types=1);

namespace Basalt;

use Pterodactyl\Services\Extensions\ExtensionManifest;
use Pterodactyl\Services\Themes\ThemeRepository;
use Pterodactyl\Services\Themes\ThemeSetting;

/** Basalt's theme settings as the backend reads them: saved values, or the manifest's defaults. */
final readonly class ThemeSettings
{
    public function __construct(private ThemeRepository $themes, private ExtensionManifest $manifest)
    {
    }

    /** Whether Basalt is the theme the panel shows. */
    public function active(): bool
    {
        return $this->themes->active() === $this->manifest->id;
    }

    /** A setting's value; an image setting reads as its public URL, or null while there is none. */
    public function get(string $key): mixed
    {
        return $this->themes->settings($this->manifest)->get(ThemeSetting::KEY_PREFIX.$key);
    }

    /** A text setting's value, or null while it is empty. */
    public function text(string $key): ?string
    {
        $value = $this->get($key);

        return is_string($value) && mb_trim($value) !== '' ? mb_trim($value) : null;
    }
}
