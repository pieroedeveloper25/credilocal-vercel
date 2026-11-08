import { useEffect, useState } from 'react';
// Solo memoria de la pestaña: nunca cookies, claves ni almacenamiento compartido.
const drafts = new Map<string, unknown>();
export const clearDrafts = () => drafts.clear();
export function useDraft<T>(key: string, initial: () => T, enabled = true) {
    const [value, setValue] = useState<T>(() => drafts.has(key) ? drafts.get(key) as T : initial());
    useEffect(() => { if (enabled) drafts.set(key, value); else drafts.delete(key); }, [key, value, enabled]);
    return [value, setValue] as const;
}
