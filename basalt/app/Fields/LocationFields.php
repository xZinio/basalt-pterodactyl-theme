<?php

declare(strict_types=1);

namespace Basalt\Fields;

use Pterodactyl\Extensions\Fields;

/** The country whose flag a location's servers show on their overview. */
final class LocationFields extends Fields
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return ['flag' => ['nullable', 'string', 'regex:/^[a-zA-Z]{2}$/']];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return ['flag' => 'country code'];
    }
}
