<?php

declare(strict_types=1);

namespace Basalt\Http;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Lets the studio frame the panel's own pages for its live preview. The panel answers every page
 * with X-Frame-Options: DENY unless a header is already set; a page this panel loads into one of
 * its own frames is answered with SAMEORIGIN instead. Browsers set the Fetch Metadata headers
 * themselves, so another site still cannot frame the panel, and a page opened directly keeps DENY.
 */
final class FramePreview
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($request->headers->get('Sec-Fetch-Dest') === 'iframe' && $request->headers->get('Sec-Fetch-Site') === 'same-origin' && ! $response->headers->has('X-Frame-Options')) {
            $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        }

        return $response;
    }
}
