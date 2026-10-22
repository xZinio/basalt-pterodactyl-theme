<?php

declare(strict_types=1);

namespace Basalt\Fields;

use Pterodactyl\Extensions\Fields;

/** The artwork an egg's servers show behind their dashboard cards and on their overview. */
final class EggFields extends Fields
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return ['banner' => ['nullable', 'string', 'max:2048', 'regex:#^(https?://|/(?!/))#i']];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return ['banner' => 'card artwork'];
    }
}
