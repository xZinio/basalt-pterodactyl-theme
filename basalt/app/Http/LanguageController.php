<?php

declare(strict_types=1);

namespace Basalt\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Pterodactyl\Models\User;

/**
 * The language the panel is shown in for the signed-in user, among those installed on the panel.
 * The client API has no endpoint for it, so the account page's language picker saves through here.
 */
final class LanguageController
{
    public function show(Request $request): JsonResponse
    {
        return new JsonResponse($this->read($request->user()));
    }

    public function update(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $data = $request->validate([
            'language' => ['required', 'string', Rule::in(array_keys($user->getAvailableLanguages()))],
        ]);

        $user->forceFill(['language' => $data['language']])->save();

        return new JsonResponse($this->read($user));
    }

    /** @return array{language: string, languages: array<string, string>} */
    private function read(User $user): array
    {
        // Each language named in itself, as a picker should show it.
        return ['language' => $user->language, 'languages' => $user->getAvailableLanguages(true)];
    }
}
