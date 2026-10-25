<?php

declare(strict_types=1);

namespace Basalt;

/**
 * The document head's elements that Basalt's settings decide: the panel name for the browser,
 * what search results and shared links show (title, description, image, canonical address), the
 * installable app's manifest and colour, and the favicon. Each replaces the panel's own element
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
        $name = $this->settings->text('panelName');
        if ($name !== null) {
            $tags[] = ['tag' => 'meta', 'name' => 'application-name', 'content' => $name];
        }

        array_push($tags, ...$this->sharing($name ?? (string) config('app.name')));

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

    /**
     * The SEO and social settings as Open Graph and X cards, the description and the canonical
     * address; nothing while none of them is set.
     *
     * @return list<array<string, string>>
     */
    private function sharing(string $site): array
    {
        $title = $this->line('seoTitle');
        $description = $this->line('metaDescription');
        $image = $this->absolute($this->settings->text('shareImage'));
        $canonical = $this->https($this->settings->text('canonicalUrl'));
        $handle = $this->line('twitterHandle');
        if ($title === null && $description === null && $image === null && $canonical === null) {
            return [];
        }

        $tags = [['tag' => 'meta', 'property' => 'og:type', 'content' => 'website']];
        if ($site !== '') {
            $tags[] = ['tag' => 'meta', 'property' => 'og:site_name', 'content' => $site];
        }
        if ($title !== null) {
            $tags[] = ['tag' => 'meta', 'property' => 'og:title', 'content' => $title];
            $tags[] = ['tag' => 'meta', 'name' => 'twitter:title', 'content' => $title];
        }
        $tags[] = ['tag' => 'meta', 'name' => 'twitter:card', 'content' => $image !== null ? 'summary_large_image' : 'summary'];
        if ($handle !== null) {
            $tags[] = ['tag' => 'meta', 'name' => 'twitter:site', 'content' => str_starts_with($handle, '@') ? $handle : '@'.$handle];
        }
        if ($description !== null) {
            $tags[] = ['tag' => 'meta', 'name' => 'description', 'content' => $description];
            $tags[] = ['tag' => 'meta', 'property' => 'og:description', 'content' => $description];
            $tags[] = ['tag' => 'meta', 'name' => 'twitter:description', 'content' => $description];
        }
        if ($image !== null) {
            $tags[] = ['tag' => 'meta', 'property' => 'og:image', 'content' => $image];
            $tags[] = ['tag' => 'meta', 'name' => 'twitter:image', 'content' => $image];
        }
        if ($canonical !== null) {
            $tags[] = ['tag' => 'link', 'rel' => 'canonical', 'href' => $canonical];
            $tags[] = ['tag' => 'meta', 'property' => 'og:url', 'content' => $canonical];
        }

        return $tags;
    }

    /** A text setting on one line: a head element's value cannot hold line breaks. */
    private function line(string $key): ?string
    {
        $value = $this->settings->text($key);

        return $value === null ? null : preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $value);
    }

    /** A well-formed https address without credentials, or null. */
    private function https(?string $url): ?string
    {
        if ($url === null || filter_var($url, FILTER_VALIDATE_URL) === false || str_contains($url, '\\')) {
            return null;
        }
        $parts = parse_url($url);

        return is_array($parts) && ($parts['scheme'] ?? '') === 'https' && ! isset($parts['user']) && ! isset($parts['pass']) ? $url : null;
    }

    /** An uploaded file's address on this panel, made absolute for the sites a link is shared on. */
    private function absolute(?string $path): ?string
    {
        if ($path === null || preg_match('~^https?://~i', $path) === 1) {
            return $path;
        }

        return rtrim((string) config('app.url'), '/').'/'.ltrim($path, '/');
    }
}
