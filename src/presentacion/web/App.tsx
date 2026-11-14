import { useEffect, useState } from 'react';
import { SessionProvider, useSesion } from './session';
import { StoreProvider } from './store';
import { Shell, ShellCliente } from './components/Shell';
import { CambiarClaveObligatoria } from './components/CambiarClaveObligatoria';
import { Login } from './screens/Login';
import { Dashboard } from './screens/Dashboard';
import { Clientes } from './screens/Clientes';
import { Catalogo } from './screens/Catalogo';
import { Venta } from './screens/Venta';
import { Estado } from './screens/Estado';
import { Pago } from './screens/Pago';
import { Cronograma } from './screens/Cronograma';
import { MiEstado } from './screens/MiEstado';
import { MiCronograma } from './screens/MiCronograma';
import { Tiendas } from './screens/Tiendas';
import { Topes } from './screens/Topes';
import { Auditoria } from './screens/Auditoria';
import { useStore } from './store';
/** Rutas del comercio: dashboard gerencial, clientes, catálogo, ventas y cobros. */
const RUTAS_COMERCIO: Record<string, () => JSX.Element> = { dashboard: Dashboard, clientes: Clientes, catalogo: Catalogo, venta: Venta, estado: Estado, pago: Pago, cronograma: Cronograma };
/** Rutas del cliente: solo su propia cuenta, en lectura. Nunca las pantallas administrativas de arriba. */
const RUTAS_CLIENTE: Record<string, () => JSX.Element> = { 'mi-estado': MiEstado, 'mi-cronograma': MiCronograma };
const rutaActual = () => window.location.hash.replace(/^#\/?/, '') || 'login';
function Cargando({error}: {error?: string}) {
    // Sin texto visible mientras carga: solo el esqueleto. El anuncio para lectores de pantalla queda en aria-label.
    return <main className="loading-view" aria-busy={!error}>
      {error ? <p role="alert">{error}</p> : <div className="skeleton-grid" role="status" aria-label="Cargando CrediLocal"><i/><i/><i/><i/></div>}
      {error ? <button className="btn" onClick={() => window.location.reload()}>Reintentar</button> : null}
    </main>;
}
function Enrutador() {
    const { sesion, restaurando } = useSesion();
    const { clientes, datosListos, errorBase } = useStore();
    const [ubicacion, setRuta] = useState(rutaActual);
    const ruta = ubicacion.split('?')[0];
    useEffect(() => {
        const f = () => setRuta(rutaActual());
        window.addEventListener('hashchange', f);
        return () => window.removeEventListener('hashchange', f);
    }, []);
    // Sin sesión: siempre el acceso, sin importar qué ruta se haya pedido. Antes se espera la respuesta del servidor.
    // Primer ingreso con clave provisional: nada más se carga hasta que la persona la cambie.
    if (sesion?.claveProvisional && !restaurando)
        return <CambiarClaveObligatoria />;
    if (restaurando || (sesion && !datosListos))
        return <Cargando error={errorBase}/>;
    if (!sesion)
        return <Login />;
    if (sesion.rol === 'Superadministrador') {
        if (ruta !== 'tiendas' && ruta !== 'auditoria' && ruta !== 'topes') {
            window.location.hash = '#/tiendas';
            return null;
        }
        return <Shell ruta={ruta}>{ruta === 'auditoria' ? <Auditoria /> : ruta === 'topes' ? <Topes /> : <Tiendas />}</Shell>;
    }
    // Cada rol solo puede entrar a sus propias pantallas; un enlace a la ruta del otro rol redirige a su inicio.
    if (sesion.rol === 'Cliente') {
        const Pantalla = RUTAS_CLIENTE[ruta];
        if (!Pantalla) {
            window.location.hash = '#/mi-estado';
            return null;
        }
        return <ShellCliente ruta={ruta}><Pantalla key={ubicacion} /></ShellCliente>;
    }
    const Pantalla = RUTAS_COMERCIO[ruta];
    if (!Pantalla) {
        window.location.hash = '#/dashboard';
        return null;
    }
    if (!clientes.length && ['venta', 'estado', 'pago'].includes(ruta))
        return <Shell ruta={ruta}><h1>Registre primero un cliente</h1><a className="btn pri" href="#/clientes">Ir a clientes</a></Shell>;
    return <Shell ruta={ruta}><Pantalla key={ubicacion} /></Shell>;
}
export function App() {
    return <SessionProvider><StoreProvider><Enrutador/></StoreProvider></SessionProvider>;
}
