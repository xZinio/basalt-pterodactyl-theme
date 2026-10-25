<?php

declare(strict_types=1);

namespace Basalt\Billing;

use RuntimeException;

/** A billing system could not be reached, refused the credentials, or answered with something unexpected. */
final class BillingException extends RuntimeException
{
}
