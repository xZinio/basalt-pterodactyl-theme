import { inPreviewFrame } from '../lib/preview';
import Editor from '../views/admin/studio/Editor';
import SignInPreview from '../views/admin/studio/SignInPreview';

/**
 * Basalt's studio in the admin area. In the studio's own preview frame, the same screen draws the
 * sign-in page instead, which a signed-in administrator could not open.
 */
export default function Studio() {
    return inPreviewFrame() && new URLSearchParams(window.location.search).get('preview') === 'sign-in' ? <SignInPreview /> : <Editor />;
}
