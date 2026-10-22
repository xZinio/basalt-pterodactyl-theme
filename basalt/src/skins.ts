import { skin, type ThemeSkins } from '@pterodactyl/sdk/theme';

/** The 1px light rim every button carries inside its border. */
const rim = 'shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_22%,transparent)]';

/**
 * Class recipes by primitive. Classic's recipes are the starting point: most parts extend them with
 * `below(...)`, which swaps classic's conflicting classes (its radius and shadow) for these.
 */
export const skins: ThemeSkins = {
    Button: skin('Button', {
        root: (state, below) => below(`rounded-md ${rim}`),
    }),
    NewButton: skin('NewButton', {
        root: (state, below) => below('rounded-md'),
    }),

    Card: skin('Card', {
        root: ({ titled }, below) => below(titled ? 'shadow-card' : 'p-4 shadow-card'),
    }),
    ChartCard: skin('ChartCard', {
        root: (state, below) => below('shadow-card'),
    }),
    ListRow: skin('ListRow', {
        root: (state, below) => below('rounded-md shadow-card'),
    }),
    Stat: skin('Stat', {
        root: ({ variant }, below) => below(variant === 'tile' ? 'shadow-card' : ''),
        icon: ({ variant }, below) => below(variant === 'tile' ? 'shadow-card' : ''),
    }),
    Table: skin('Table', {
        root: (state, below) => below('shadow-card'),
    }),

    Input: skin('Input', {
        root: (state, below) => below('rounded-md'),
    }),
    TextArea: skin('TextArea', {
        root: (state, below) => below('rounded-md'),
    }),
    NumberInput: skin('NumberInput', {
        input: (state, below) => below('rounded-md'),
    }),

    Alert: skin('Alert', {
        root: (state, below) => below('border-l border-solid shadow-card'),
    }),

    Dialog: skin('Dialog', {
        root: (state, below) => below('rounded-lg ring-1 ring-border shadow-overlay'),
        footer: (state, below) => below('rounded-b-lg'),
        backdrop: (state, below) => below('bg-black/55 backdrop-blur-[2px]'),
    }),
    DropdownMenu: skin('DropdownMenu', {
        root: (state, below) => below('rounded-md shadow-overlay'),
    }),
    DropdownMenuItem: skin('DropdownMenuItem', {
        root: (state, below) => below('rounded-md'),
    }),
    Tooltip: skin('Tooltip', {
        root: (state, below) => below('rounded-md border border-border shadow-raised text-xs'),
    }),
};
