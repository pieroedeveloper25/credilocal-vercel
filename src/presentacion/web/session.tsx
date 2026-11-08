import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { alSesionVencida, api } from './api';
import { clearDrafts } from './drafts';
import type { Sesion } from '../../contexts/identity-and-access/dominio/modelos';
export type { Rol, Sesion } from '../../contexts/identity-and-access/dominio/modelos';
interface SessionApi {
    sesion: Sesion | null;
    /** true mientras se consulta al servidor si la sesión de antes de recargar sigue vigente. */
    restaurando: boolean;
    /** Aviso para el acceso cuando la sesión venció mientras se usaba la aplicación. */
    aviso: string;
    entrar: (s: Sesion) => void;
    salir: () => void;
}
const Ctx = createContext<SessionApi | null>(null);
export const useSesion = () => { const s = useContext(Ctx); if (!s)
    throw new Error('SessionProvider'); return s; };
export function SessionProvider({ children }: {
    children: ReactNode;
}) {
    const [sesion, setSesion] = useState<Sesion | null>(null);
    const [restaurando, setRestaurando] = useState(true);
    const [aviso, setAviso] = useState('');
    const actual = useRef<Sesion | null>(null);
    actual.current = sesion;
    // Si el servidor deja de reconocer la sesión (venció o se cerró desde otro dispositivo), se vuelve al acceso.
    useEffect(() => {
        alSesionVencida(() => {
            if (!actual.current)
                return;
            setAviso('Su sesión venció o se cerró. Ingrese nuevamente.');
            clearDrafts();
            setSesion(null);
        });
        return () => alSesionVencida(undefined);
    }, []);
    // Al cargar o recargar la página, el servidor indica si la cookie sigue siendo una sesión vigente.
    useEffect(() => {
        let vivo = true;
        api<{ sesion: Sesion | null }>('sesion')
            .then(r => { if (vivo && r.sesion) setSesion(s => s ?? r.sesion); })
            .catch(() => undefined)
            .finally(() => { if (vivo) setRestaurando(false); });
        return () => { vivo = false; };
    }, []);
    const entrar = useCallback((s: Sesion) => { clearDrafts(); setAviso(''); setSesion(s); }, []);
    const salir = useCallback(() => { clearDrafts(); setSesion(null); void api('logout', {}).catch(() => undefined); }, []);
    const value = useMemo(() => ({ sesion, restaurando, aviso, entrar, salir }), [sesion, restaurando, aviso, entrar, salir]);
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
