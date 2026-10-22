import { skin, type ThemeSkins } from '@pterodactyl/sdk/theme';

/** The 1px light rim every button carries inside its border. */
const rim = 'shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_22%,transparent)]';

/**
 * Class recipes by primitive. Classic's recipes are the starting point: most parts extend them with
 * `below(...)`, which swaps classic's conflicting classes (its radius and shadow) for these. Shadows
 * are written `shadow-(--token)`, the form the class merger knows as a shadow: a bare `shadow-card`
 * would sit beside classic's shadow instead of replacing it.
 */
export const skins: ThemeSkins = {
    Button: skin('Button', {
        root: (state, below) => below(`rounded-md ${rim}`),
    }),
    NewButton: skin('NewButton', {
        root: (state, below) => below('rounded-md'),
    }),

    Card: skin('Card', {
        root: ({ titled }, below) => below(titled ? 'shadow-(--shadow-card)' : 'p-4 shadow-(--shadow-card)'),
    }),
    ChartCard: skin('ChartCard', {
        root: (state, below) => below('shadow-(--shadow-card)'),
    }),
    ListRow: skin('ListRow', {
        root: (state, below) => below('rounded-md shadow-(--shadow-card)'),
    }),
    Stat: skin('Stat', {
        root: ({ variant }, below) => below(variant === 'tile' ? 'shadow-(--shadow-card)' : ''),
    }),
    Table: skin('Table', {
        root: (state, below) => below('shadow-(--shadow-card)'),
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
        root: (state, below) => below('border-l border-solid shadow-(--shadow-card)'),
    }),

    // Classic's dialog on the card shadow, without its ring.
    Dialog: skin('Dialog', {
        root: (state, below) => below('ring-0 shadow-(--shadow-card)'),
    }),
    Tooltip: skin('Tooltip', {
        root: (state, below) => below('rounded-md border border-border shadow-(--shadow-raised) text-xs'),
    }),
};
