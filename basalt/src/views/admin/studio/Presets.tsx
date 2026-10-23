import { presets, usesPreset, type Preset, type Values } from './model';

/** The palettes, each a card in its own colours with its card, accent and state colours as dots. */
export default function Presets({ values, onPick }: { values: Values; onPick: (preset: Preset) => void }) {
    return (
        <div className='grid grid-cols-2 gap-2.5 p-4'>
            {presets.map((preset) => {
                const { background, text, card, accent, hover, success, danger } = preset.values;

                return (
                    <button
                        key={preset.name}
                        type='button'
                        aria-pressed={usesPreset(values, preset)}
                        onClick={() => onPick(preset)}
                        style={{ backgroundColor: background, color: text }}
                        className='grid cursor-pointer gap-3 rounded-lg border border-[color-mix(in_oklab,currentColor_18%,transparent)] p-3 text-left transition-[transform,border-color] duration-150 hover:-translate-y-px hover:border-[color-mix(in_oklab,currentColor_40%,transparent)]'
                    >
                        <span className='flex gap-1.5'>
                            {[card, accent, hover, success, danger].map((color, index) => (
                                <span key={index} className='size-4 rounded-full shadow-[0_0_0_1px_rgb(255_255_255/0.08)]' style={{ backgroundColor: color }} />
                            ))}
                        </span>
                        <span className='font-medium'>{preset.name}</span>
                    </button>
                );
            })}
        </div>
    );
}
