import { useSalidaFormulario } from '../useSalidaFormulario';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { Field, Head, Badge } from '../components/ui';
import { ConfirmDialog, PasswordInput, SearchField } from '../components/overlays';
import type { Tienda } from '../../../contexts/identity-and-access/dominio/modelos';
import { validarTienda } from '../../../contexts/identity-and-access/dominio/validaciones';
const nueva = (): Tienda => ({ id: -1, ruc: '', razon: '', nombre: '', giro: '', direccion: '', telefono: '', correo: '', activa: true });
export function Tiendas() {
    const { tiendas, guardarTienda } = useStore();
    const [f, setF] = useState<Tienda>(nueva);
    const [clave, setClave] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [ocupado, setOcupado] = useState(false);
    const [abierto, setAbierto] = useState(false);
    const [confirmar, setConfirmar] = useState<Tienda | null>(null);
    const [q, setQ] = useState('');
    const [pagina, setPagina] = useState(0);
    const titulo = useRef<HTMLHeadingElement>(null);
    const origen = useRef('');
    useEffect(() => { if (abierto) titulo.current?.focus(); else if (origen.current) document.getElementById(origen.current)?.focus(); }, [abierto]);
    const inicial = useRef<Tienda>(f);
    const salida = useSalidaFormulario(abierto && (JSON.stringify(f) !== JSON.stringify(inicial.current) || clave !== ''));
    const abrir = (boton: HTMLButtonElement, tienda = nueva()) => {
        origen.current = boton.id;
        inicial.current = tienda;
        setF(tienda); setClave(''); setMensaje(''); setAbierto(true);
    };
    const volver = () => setAbierto(false);
    const cambiarEstado = async (tienda: Tienda) => {
        setOcupado(true); setMensaje('');
        try { await guardarTienda({ ...tienda, activa: !tienda.activa }); setConfirmar(null); setMensaje('Estado de la tienda actualizado.'); }
        catch (e) { setMensaje((e as Error).message); throw e; }
        finally { setOcupado(false); }
    };
    const set = (k: keyof Tienda, v: string | boolean) => setF(x => ({ ...x, [k]: v }));
    const guardar = async () => { setOcupado(true); setMensaje(''); try {
        validarTienda(f, { tiendas });
        await guardarTienda(f, clave);
        setMensaje('Tienda guardada.');
        setClave('');
        volver();
    }
    catch (e) {
        setMensaje((e as Error).message);
    }
    finally {
        setOcupado(false);
    } };
    const resultados = tiendas.filter(t => `${t.nombre} ${t.razon} ${t.ruc} ${t.correo}`.toLocaleLowerCase('es').includes(q.trim().toLocaleLowerCase('es')));
    const totalPaginas = Math.max(1, Math.ceil(resultados.length / 20));
    const actual = Math.min(pagina, totalPaginas - 1);
    const visibles = resultados.slice(actual * 20, (actual + 1) * 20);
    return <>
    {salida.dialogo}
    <Head title="Gestión de tiendas" sub="Alta y baja de negocios de distintos giros. Cada tienda conserva sus clientes, catálogo y operaciones.">
      {!abierto && <button id="nueva-tienda" className="btn pri" disabled={ocupado} onClick={e => abrir(e.currentTarget)}>Nueva tienda</button>}
    </Head>
    {abierto && <section className="card">
      <button className="btn" disabled={ocupado} onClick={() => salida.pedirSalida(volver)}>Volver a tiendas</button>
      <h2 ref={titulo} tabIndex={-1}>{f.id < 0 ? 'Registrar tienda' : `Editar ${f.nombre}`}</h2>
      <div className="form-grid">
        {([['ruc', 'RUC', '11 dígitos, sin espacios. No puede repetirse.'], ['razon', 'Razón social', 'Nombre legal del establecimiento.'], ['nombre', 'Nombre comercial', 'Nombre que se mostrará en el panel de la tienda.'], ['giro', 'Giro del negocio', 'Ejemplo: bodega, peluquería, panadería o taller.'], ['direccion', 'Dirección', 'Ubicación del establecimiento.'], ['telefono', 'Teléfono', 'Número de contacto, opcional.'], ['correo', 'Correo del administrador', 'Usuario para acceder con el perfil Comercio. No puede pertenecer a otra cuenta.']] as const).map(([k, label, help]) => <Field key={k} id={`t-${k}`} label={label} helpText={help}><input id={`t-${k}`} className="in" value={f[k]} type={k === 'correo' ? 'email' : 'text'} onChange={e => set(k, e.target.value)}/></Field>)}
        {f.id < 0 && <Field id="t-clave" label="Contraseña inicial (obligatoria)" helpText="Entre 8 y 64 caracteres, incluyendo letras y números. Entréguela al administrador del negocio."><PasswordInput id="t-clave" required autoComplete="new-password" value={clave} onChange={e => setClave(e.target.value)}/></Field>}
        <Field id="t-estado" label="Estado de la tienda" helpText="La baja bloquea el acceso de Comercio y de sus clientes. Conserva el historial; puede reactivarse."><select id="t-estado" className="in" value={String(f.activa)} onChange={e => set('activa', e.target.value === 'true')}><option value="true">Activa</option><option value="false">De baja</option></select></Field>
      </div>
      <div className="actions"><button className="btn" disabled={ocupado} onClick={() => salida.pedirSalida(volver)}>Cancelar</button><button className="btn pri" disabled={ocupado} onClick={guardar}>{ocupado ? 'Guardando…' : 'Guardar tienda'}</button></div>
    </section>}
    {mensaje && <p role={mensaje === 'Tienda guardada.' || mensaje === 'Estado de la tienda actualizado.' ? 'status' : 'alert'} className={mensaje === 'Tienda guardada.' || mensaje === 'Estado de la tienda actualizado.' ? 'toast' : 'notice'}>{mensaje}</p>}
    {!abierto && <><SearchField id="buscar-tiendas" label="Buscar tienda" placeholder="Nombre, RUC o correo" value={q} onChange={v => { setQ(v); setPagina(0); }}/><p className="sub" role="status">{resultados.length} tiendas{q.trim() ? ' que coinciden con la búsqueda' : ' registradas'}.</p><div className="table-scroll" tabIndex={0} role="region" aria-label="Tiendas registradas"><table className="tbl"><caption>Tiendas registradas</caption><thead><tr><th>Negocio</th><th>RUC</th><th>Giro</th><th>Administrador</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{visibles.map(t => <tr key={t.id}><td>{t.nombre}</td><td>{t.ruc}</td><td>{t.giro}</td><td>{t.correo}</td><td><Badge tone={t.activa ? 'ok' : 'warn'}>{t.activa ? 'Activa' : 'De baja'}</Badge></td><td><div className="actions"><button id={`editar-tienda-${t.id}`} className="btn sm" disabled={ocupado} aria-label={`Editar ${t.nombre}`} onClick={e => abrir(e.currentTarget, t)}>Editar</button><button className="btn sm" disabled={ocupado} aria-label={`${t.activa ? 'Dar de baja' : 'Reactivar'} ${t.nombre}`} onClick={() => { setMensaje(''); setConfirmar(t); }}>{t.activa ? 'Dar de baja' : 'Reactivar'}</button></div></td></tr>)}</tbody></table></div>
      {!resultados.length && <div className="empty">{tiendas.length ? 'No hay tiendas que coincidan con esta búsqueda.' : 'Aún no hay tiendas registradas.'}{!!tiendas.length && <button className="btn" onClick={() => { setQ(''); setPagina(0); }}>Limpiar búsqueda</button>}</div>}
      {totalPaginas > 1 && <nav className="actions" aria-label="Páginas de tiendas"><button className="btn" disabled={actual === 0} onClick={() => setPagina(actual - 1)}>Anterior</button><span>Página {actual + 1} de {totalPaginas}</span><button className="btn" disabled={actual + 1 >= totalPaginas} onClick={() => setPagina(actual + 1)}>Siguiente</button></nav>}</>}
    <ConfirmDialog open={!!confirmar} title={`${confirmar?.activa ? 'Dar de baja' : 'Reactivar'} ${confirmar?.nombre ?? 'tienda'}`} confirmLabel={confirmar?.activa ? 'Dar de baja' : 'Reactivar tienda'} busy={ocupado} onClose={() => setConfirmar(null)} onConfirm={async () => { if (confirmar) await cambiarEstado(confirmar); }}><p>{confirmar?.activa ? 'Se bloqueará el acceso del comercio y de sus clientes. Los datos y el historial se conservan. Podrás reactivar la tienda.' : 'Se permitirá nuevamente el acceso de las cuentas habilitadas de esta tienda.'}</p></ConfirmDialog>
  </>;
}
