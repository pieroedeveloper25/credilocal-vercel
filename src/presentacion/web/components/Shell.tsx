import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { Logo } from './Logo';
import { CambiarClave } from './CambiarClave';
import { ThemeToggle } from './ThemeToggle';
import { useSesion } from '../session';
import { useStore } from '../store';
import { CalendarIcon, CartIcon, CatalogIcon, CreditCardIcon, DashboardIcon, FileTextIcon, LogOutIcon, SlidersIcon, UsersIcon } from './Icons';
interface NavItem { ruta: string; titulo: string; icon: ComponentType<{ size?: number }> }
const COMERCIO: NavItem[] = [
    { ruta: 'dashboard', titulo: 'Dashboard', icon: DashboardIcon }, { ruta: 'clientes', titulo: 'Clientes', icon: UsersIcon },
    { ruta: 'catalogo', titulo: 'Catálogo', icon: CatalogIcon }, { ruta: 'venta', titulo: 'Venta a crédito', icon: CartIcon },
    { ruta: 'estado', titulo: 'Estado de cuenta', icon: FileTextIcon }, { ruta: 'pago', titulo: 'Registrar pago', icon: CreditCardIcon },
    { ruta: 'cronograma', titulo: 'Simulador de cuotas', icon: CalendarIcon },
];
const CLIENTE: NavItem[] = [{ ruta: 'mi-estado', titulo: 'Mi estado de cuenta', icon: FileTextIcon }, { ruta: 'mi-cronograma', titulo: 'Mi cronograma', icon: CalendarIcon }];
const ADMIN: NavItem[] = [{ ruta: 'tiendas', titulo: 'Gestión de tiendas', icon: UsersIcon }, { ruta: 'topes', titulo: 'Topes de tasas', icon: SlidersIcon }, { ruta: 'auditoria', titulo: 'Auditoría', icon: FileTextIcon }];
function Marco({ ruta, children, cliente = false }: { ruta: string; children: ReactNode; cliente?: boolean }) {
    const { sesion, salir } = useSesion();
    const { tienda, clientes, errorBase } = useStore();
    const [plegada, setPlegada] = useState(false);
    const [menu, setMenu] = useState(false);
    const mobileToggle = useRef<HTMLButtonElement>(null);
    const persona = clientes.find(c => c.id === sesion?.clienteId);
    const items = cliente ? CLIENTE : sesion?.rol === 'Superadministrador' ? ADMIN : COMERCIO;
    useEffect(() => { setMenu(false); document.querySelector<HTMLElement>('#contenido h1')?.focus(); }, [ruta]);
    const nombre = cliente ? persona?.nombre ?? 'Portal del cliente' : tienda?.nombre ?? 'Administración del sistema';
    return <div className={plegada ? "app sidebar-compact" : "app"}>
      <a className="skip-link" href="#contenido" onClick={e => { e.preventDefault(); document.getElementById('contenido')?.focus(); }}>Saltar al contenido</a>
      <header className="mobile-bar"><Logo size={28}/><strong>CrediLocal</strong><button type="button" className="btn" ref={mobileToggle} aria-expanded={menu} aria-controls="principal" onClick={() => setMenu(v => !v)}>{menu ? 'Cerrar menú' : 'Menú'}</button></header>
      <nav id="principal" className={`side${menu ? ' mobile-open' : ''}`} aria-label="Principal" onKeyDown={e => { if (e.key === 'Escape' && menu && !e.defaultPrevented) { setMenu(false); mobileToggle.current?.focus(); } }}>
        <div className="side-heading"><a className="brand" href={`#/${items[0].ruta}`} aria-label="CrediLocal, inicio"><Logo size={34}/><div><strong>CrediLocal</strong><small>{cliente ? 'Portal del cliente' : 'Crédito y cobranza'}</small></div></a>
        <button type="button" className="side-toggle" aria-expanded={!plegada} aria-label={plegada ? "Expandir barra lateral" : "Plegar barra lateral"} onClick={() => setPlegada(!plegada)} title={plegada ? "Expandir barra lateral" : "Plegar barra lateral"}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="2.5" y="4" width="19" height="16" rx="3"/><path d="M9 4v16"/><path d={plegada ? "m13 9 3 3-3 3" : "m17 9-3 3 3 3"}/></svg></button></div>
        <div className="side-store"><strong>{nombre}</strong><small>{cliente ? `${persona?.tipoDoc ?? ''} ${persona?.doc ?? ''}` : tienda ? tienda.giro : 'Tiendas y trazabilidad'}</small></div>
        <div className="side-links">{items.map(({ ruta: dest, titulo, icon: Icon }) => <a key={dest} onClick={() => setMenu(false)} href={`#/${dest}`} aria-label={titulo} title={titulo} className={`nav${ruta === dest ? ' on' : ''}`} aria-current={ruta === dest ? 'page' : undefined}><Icon size={20}/><span>{titulo}</span></a>)}</div>
        <div className="foot"><details className="account-menu"><summary aria-label="Mi cuenta" onClick={() => setPlegada(false)}><span className="avatar" aria-hidden="true">{nombre.slice(0, 1).toUpperCase()}</span><span><strong>Mi cuenta</strong><small>{sesion?.rol}</small></span></summary><div className="account-actions"><small className="account-email">{sesion?.correo}</small><CambiarClave/><ThemeToggle etiqueta/><a href="#/login" onClick={salir} className="btn"><LogOutIcon size={16}/> Cerrar sesión</a></div></details></div>
      </nav>
      <main id="contenido" className="main" tabIndex={-1}><div className="app-context"><span>{sesion?.rol}</span></div><div className="wrap page" key={ruta}>{errorBase && <div role="alert" className="notice"><strong>No se pudieron actualizar los datos.</strong> {errorBase} Los datos visibles pueden estar desactualizados.</div>}{children}<BackToTop/></div></main>
    </div>;
}
export function Shell(props: { ruta: string; children: ReactNode }) { return <Marco {...props}/>; }
export function ShellCliente(props: { ruta: string; children: ReactNode }) { return <Marco {...props} cliente/>; }

function BackToTop() {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const update = () => setVisible(window.scrollY > window.innerHeight);
        update();
        window.addEventListener('scroll', update, { passive: true });
        return () => window.removeEventListener('scroll', update);
    }, []);
    return visible ? <button type="button" className="btn back-top" onClick={() => {
        document.getElementById('contenido')?.focus({preventScroll:true});
        window.scrollTo({top:0, behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
    }}>↑ Volver arriba</button> : null;
}
