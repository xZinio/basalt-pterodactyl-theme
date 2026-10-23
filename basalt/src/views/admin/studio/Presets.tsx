import { presets, usesPreset, type Preset, type Values } from './model';

/** The palettes, each a card in its own background with its card, accent and state colours as dots. */
export default function Presets({ values, onPick }: { values: Values; onPick: (preset: Preset) => void }) {
    return (
        <div className='grid grid-cols-2 gap-2.5 p-4'>
            {presets.map((preset) => (
                <button
                    key={preset.name}
                    type='button'
                    aria-pressed={usesPreset(values, preset)}
                    onClick={() => onPick(preset)}
                    style={{ backgroundColor: preset.values.background }}
                    className='grid cursor-pointer gap-3 rounded-lg border border-[#fafafa]/18 p-3 text-left text-[#fafafa] transition-[transform,border-color] duration-150 hover:-translate-y-px hover:border-[#fafafa]/40'
                >
                    <span className='flex gap-1.5'>
                        {[
                            preset.values.card,
                            preset.values.accent,
                            // The light accent, as the theme mixes it from the accent.
                            `color-mix(in srgb, ${preset.values.accent} 80%, white)`,
                            'var(--success)',
                            'var(--destructive)',
                        ].map((color, index) => (
                            <span key={index} className='size-4 rounded-full shadow-[0_0_0_1px_rgb(255_255_255/0.08)]' style={{ backgroundColor: color }} />
                        ))}
                    </span>
                    <span className='font-medium'>{preset.name}</span>
                </button>
            ))}
        </div>
    );
}
