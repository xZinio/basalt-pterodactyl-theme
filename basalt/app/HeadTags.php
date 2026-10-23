<?php

declare(strict_types=1);

namespace Basalt;

/**
 * The document head's elements that Basalt's settings decide: the favicon, the installable app's
 * manifest and colour, and the panel name for the browser. Each replaces the panel's own element
 * of the same kind, and none is added while another theme is shown.
 */
final readonly class HeadTags
{
    public function __construct(private ThemeSettings $settings)
    {
    }

    /** @return array<int, array<string, string>> */
    public function __invoke(): array
    {
        if (! $this->settings->active()) {
            return [];
        }

        $tags = [];
        if (($name = $this->settings->text('panelName')) !== null) {
            $tags[] = ['tag' => 'meta', 'name' => 'application-name', 'content' => $name];
        }

        if ($this->settings->get('installableApp') === true) {
            $tags[] = ['tag' => 'link', 'rel' => 'manifest', 'href' => '/extensions/basalt/manifest.webmanifest'];
            $tags[] = ['tag' => 'meta', 'name' => 'theme-color', 'content' => (string) $this->settings->get('appColor')];
            $tags[] = ['tag' => 'meta', 'name' => 'mobile-web-app-capable', 'content' => 'yes'];
        }

        if (($favicon = $this->settings->text('favicon')) !== null) {
            $tags[] = ['tag' => 'link', 'rel' => 'icon', 'href' => $favicon];
            $tags[] = ['tag' => 'link', 'rel' => 'apple-touch-icon', 'href' => $favicon];
        }

        return $tags;
    }
}
