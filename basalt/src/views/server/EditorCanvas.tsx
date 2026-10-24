import { useThemeSettings, type ViewProps } from '@pterodactyl/sdk/theme';
import type { ThemeSettings } from '../../theme-types';

/** The file editor, written left to right or right to left by the File editor direction setting. */
export default function EditorCanvas({ Default, className }: ViewProps<'server.files.editor.canvas'>) {
    const { editorDirection } = useThemeSettings<ThemeSettings>();

    return (
        <div dir={editorDirection === 'rtl' ? 'rtl' : 'ltr'} className='contents'>
            <Default className={className} />
        </div>
    );
}
