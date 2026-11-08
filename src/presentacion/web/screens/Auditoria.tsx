import { useEffect, useState } from 'react';
import { api } from '../api';
import { Head } from '../components/ui';
import { SearchField } from '../components/overlays';
import { useStore } from '../store';
import type { Datos } from '../../../shared/dominio/datos';

import './cuenta-consulta.css';

function referenciaComercial(accion: string, detalle = '') {
    const campos = Object.fromEntries(detalle.split(';').map(par => {
        const i = par.indexOf('=');
        return i < 0 ? [par.trim(), ''] : [par.slice(0, i).trim(), par.slice(i + 1).trim()];
    }));
    if (accion === 'REGISTRAR VENTA' && /^\d+$/.test(campos.venta ?? '')) return `OP-${campos.venta}`;
    if (accion === 'REGISTRAR PAGO') return campos.constancia ?? '';
    if (accion === 'EMITIR CORTE') return campos.listado ?? '';
    return accion.match(/^EMITIR CORTE (\d+:\d+:\d{4}-\d{2})$/)?.[1] ?? '';
}

export function Auditoria() {
    const { tiendas } = useStore();
    const [registros, setRegistros] = useState<Datos['auditoria']>([]);
    const [busqueda, setBusqueda] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(true);
    const [revision, setRevision] = useState(0);
    const [pagina, setPagina] = useState(0);
    useEffect(() => {
        let vigente = true;
        setCargando(true); setError('');
        api<Datos['auditoria']>('auditoria').then(datos => {
            if (vigente) setRegistros(datos);
        }).catch(e => {
            if (vigente) setError((e as Error).message);
        }).finally(() => {
            if (vigente) setCargando(false);
        });
        return () => { vigente = false; };
    }, [revision]);
    const consulta = busqueda.trim().toLocaleLowerCase('es');
    const resultados = registros.filter(r => `${r.actor} ${r.accion} ${r.tiendaId ?? ''} ${tiendas.find(t => t.id === r.tiendaId)?.nombre ?? ''} ${referenciaComercial(r.accion, r.detalle)} ${r.detalle ?? ''}`.toLocaleLowerCase('es').includes(consulta)).slice().reverse();
    const totalPaginas = Math.max(1, Math.ceil(resultados.length / 25));
    const actual = Math.min(pagina, totalPaginas - 1);
    const visibles = resultados.slice(actual * 25, (actual + 1) * 25);
    return <>
      <Head title="Auditoría" sub="Consulta de las operaciones registradas. Solo lectura para el superadministrador."/>
      <section className="card auditoria-panel">
        <SearchField id="buscar-auditoria" label="Buscar en auditoría" placeholder="Código de venta, constancia, usuario o tienda" value={busqueda} onChange={v => { setBusqueda(v); setPagina(0); }}/>
        <p className="sub">Busca una venta por su código OP o su número. Para un pago, usa la constancia. Los accesos y cierres de sesión se registran sin referencia comercial.</p>
        {cargando && <p role="status">Consultando operaciones…</p>}
        {error && <div className="notice" role="alert">{error} <button className="btn" onClick={() => setRevision(v => v + 1)}>Reintentar</button></div>}
        {!cargando && !error && <><p className="sub" role="status">{resultados.length} operaciones{consulta ? ' que coinciden con la búsqueda' : ' registradas'}.</p><div className="table-scroll" tabIndex={0} role="region" aria-label="Operaciones registradas">
          <table className="tbl">
            <caption>Operaciones, de la más reciente a la más antigua</caption>
            <thead><tr><th scope="col">Referencia comercial</th><th scope="col">Acción</th><th scope="col">Fecha de registro (Perú)</th><th scope="col">Usuario</th><th scope="col">Tienda</th><th scope="col">Detalle</th></tr></thead>
            <tbody>{visibles.map((r, i) => <tr key={i}>
              <td>{referenciaComercial(r.accion, r.detalle) || (['REGISTRAR VENTA', 'REGISTRAR PAGO', 'EMITIR CORTE'].includes(r.accion) ? 'Sin dato registrado' : 'No aplica')}</td>
              <td>{r.accion}</td><td>{new Date(r.fecha).toLocaleString('es-PE', { timeZone: 'America/Lima' })}</td>
              <td>{r.actor}</td><td>{r.tiendaId === undefined ? 'Sin tienda asociada' : tiendas.find(t => t.id === r.tiendaId)?.nombre ?? `Tienda #${r.tiendaId}`}</td><td>{r.detalle || 'Sin detalle'}</td>
            </tr>)}</tbody>
          </table>
          {!visibles.length && <div className="empty">{consulta ? 'No hay operaciones que coincidan con esta búsqueda.' : 'Aún no hay operaciones registradas.'}{consulta && <button className="btn" onClick={() => { setBusqueda(''); setPagina(0); }}>Limpiar búsqueda</button>}</div>}
        </div>{totalPaginas > 1 && <nav className="actions" aria-label="Páginas de auditoría"><button className="btn" disabled={actual === 0} onClick={() => setPagina(actual - 1)}>Anterior</button><span>Página {actual + 1} de {totalPaginas}</span><button className="btn" disabled={actual + 1 >= totalPaginas} onClick={() => setPagina(actual + 1)}>Siguiente</button></nav>}</>}
      </section>
    </>;
}
