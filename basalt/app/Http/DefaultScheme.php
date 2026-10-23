<?php

declare(strict_types=1);

namespace Basalt\Http;

use Basalt\ThemeSettings;
use Closure;
use Illuminate\Http\Request;
use Pterodactyl\Services\Themes\ThemeResolver;
use Symfony\Component\HttpFoundation\Response;

/**
 * The Default color mode setting. The panel shows the colour mode a visitor picked, kept in a
 * cookie, and Basalt's first scheme, dark, to everyone else; for them this answers as if they had
 * picked the setting's mode, so "Follow the device" is resolved before any stylesheet applies.
 */
final readonly class DefaultScheme
{
    public function __construct(private ThemeSettings $settings)
    {
    }

    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->cookie(ThemeResolver::SCHEME_COOKIE) === null && $this->settings->active()) {
            $scheme = $this->settings->get('defaultScheme');
            if ($scheme === 'system' || $scheme === 'light') {
                $request->cookies->set(ThemeResolver::SCHEME_COOKIE, $scheme);
            }
        }

        return $next($request);
    }
}
