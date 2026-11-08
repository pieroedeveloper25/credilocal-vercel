import { useEffect, useRef, useState } from 'react';
import { Dialog } from './components/overlays';

/** Ningún valor del formulario (incluidas las contraseñas) sale de su pantalla. */
export function useSalidaFormulario(modificado: boolean) {
    const siguiente = useRef<(() => void) | null>(null);
    const autorizado = useRef(false);
    const [pendiente, mostrar] = useState(false);
    function pedirSalida(accion: () => void) {
        if (!modificado) { accion(); return; }
        siguiente.current = accion;
        mostrar(true);
    }
    useEffect(() => {
        if (!modificado) return;
        const origen = location.href;
        const antesDeSalir = (e: BeforeUnloadEvent) => {
            if (!autorizado.current) { e.preventDefault(); e.returnValue = ''; }
        };
        const enlace = (e: MouseEvent) => {
            const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
            if (!(a instanceof HTMLAnchorElement) || e.defaultPrevented || e.button !== 0 ||
                e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || a.target && a.target !== '_self' ||
                a.hasAttribute('download') || a.classList.contains('skip-link') || a.href === location.href || autorizado.current) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            pedirSalida(() => a.click());
        };
        // Se escucha antes del enrutador para mantener montado el editor si el usuario cancela.
        const cambioHash = (e: Event) => {
            if (autorizado.current || location.href === origen) return;
            e.stopImmediatePropagation();
            const destino = location.href;
            history.pushState(null, '', origen);
            pedirSalida(() => location.replace(destino));
        };
        window.addEventListener('beforeunload', antesDeSalir);
        document.addEventListener('click', enlace, true);
        window.addEventListener('popstate', cambioHash, true);
        window.addEventListener('hashchange', cambioHash, true);
        return () => {
            autorizado.current = false;
            window.removeEventListener('beforeunload', antesDeSalir);
            document.removeEventListener('click', enlace, true);
            window.removeEventListener('popstate', cambioHash, true);
            window.removeEventListener('hashchange', cambioHash, true);
        };
    }, [modificado]);
    const cerrar = () => { siguiente.current = null; mostrar(false); };
    const dialogo = <Dialog open={pendiente} title="¿Salir sin guardar?" onClose={cerrar}>
        <p>Se perderán los cambios realizados en este formulario.</p>
        <div className="acciones">
          <button type="button" className="btn" autoFocus onClick={cerrar}>Seguir editando</button>
          <button type="button" className="btn pri" onClick={() => {
              const continuar = siguiente.current;
              cerrar();
              autorizado.current = true;
              continuar?.();
          }}>Salir sin guardar</button>
        </div>
    </Dialog>;
    return { pedirSalida, dialogo };
}
