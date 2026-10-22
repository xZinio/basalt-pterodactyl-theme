import { useLocalState } from './local';

/** Keyboard shortcuts are on unless the user turned them off on their account page. */
export const useShortcutsEnabled = () => useLocalState('basalt.shortcuts', true);
