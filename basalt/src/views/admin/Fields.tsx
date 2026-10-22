import { Input, Label, Select, type FormExtension, type SelectOption } from '@pterodactyl/sdk';
import Flag, { countryName, flagCodes } from '../../components/Flag';

type EggValues = { banner: string | null };
type LocationValues = { flag: string | null };

/** The artwork behind an egg's servers: on their dashboard cards and the banner of their dashboard. */
export const EggArtwork: FormExtension<EggValues, 'admin.egg'> = ({ field }) => {
    const banner = field('banner');
    const help = `${banner.id}-help`;
    const url = banner.value?.trim() ?? '';

    return (
        <div className='flex flex-col gap-3'>
            <div>
                <Label htmlFor={banner.id}>Card artwork</Label>
                <Input
                    id={banner.id}
                    value={banner.value ?? ''}
                    placeholder='https://example.com/artwork.jpg'
                    aria-describedby={help}
                    aria-invalid={banner.error ? true : undefined}
                    $hasError={!!banner.error}
                    onChange={(event) => banner.setValue(event.target.value.trim() === '' ? null : event.target.value)}
                />
                <p id={help} className={banner.error ? 'input-help error' : 'input-help'}>
                    {banner.error ??
                        "An image URL, or a path on this panel. The egg's servers show it behind their dashboard cards and on their banner; leave it empty for none."}
                </p>
            </div>
            {url && !banner.error && <img src={url} alt='' className='aspect-[6/1] w-full max-w-md rounded-md border border-border object-cover' />}
        </div>
    );
};

const none = '';

const countries: SelectOption[] = [
    { value: none, label: 'No flag', textLabel: 'No flag' },
    ...flagCodes
        .map((code) => ({ code, name: countryName(code) }))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(({ code, name }) => ({
            value: code,
            textLabel: name,
            label: (
                <span className='flex items-center gap-2'>
                    <Flag code={code} />
                    {name}
                </span>
            ),
        })),
];

/** The country a location is in: its servers' dashboards show the flag and the country's name. */
export const LocationFlag: FormExtension<LocationValues, 'admin.location'> = ({ field }) => {
    const flag = field('flag');
    const help = `${flag.id}-help`;

    return (
        <div>
            <Label htmlFor={flag.id}>Country</Label>
            <Select
                id={flag.id}
                value={flag.value?.toLowerCase() ?? none}
                options={countries}
                searchPlaceholder='Search countries'
                hasError={!!flag.error}
                aria-describedby={help}
                onChange={(value) => flag.setValue(value === none ? null : String(value))}
            />
            <p id={help} className={flag.error ? 'input-help error' : 'input-help'}>
                {flag.error ?? "Its servers' dashboards show this country's flag and name for the location."}
            </p>
        </div>
    );
};
