import './cuenta-consulta.css';
import { useEffect, useState, type KeyboardEvent } from 'react';
import { useStore } from '../store';
import { useSesion } from '../session';
import { ClientPicker } from '../components/overlays';
import { pct7, sol } from '../format';
import { Badge, Field, Head, Money } from '../components/ui';
import { lineaDisponible } from '../../../contexts/customer-management/dominio/lineaCredito';
import { corteDelPeriodo } from '../../../contexts/billing-and-collections/dominio/obligaciones';
import { D } from '../../../shared/dominio/decimal';
import { fechaPagoPeriodo, fmtFecha, parseFecha, relojPeru } from '../../../shared/dominio/fechas';
export function Estado({ clientePropio = false }: {
    clientePropio?: boolean;
} = {}) {
    const { clientes, errorBase } = useStore();
    const { sesion } = useSesion();
    const [ci, setCi] = useState(() => Number(new URLSearchParams(window.location.hash.split('?')[1]).get('cliente') ?? -1));
    useEffect(() => {
        const actualizar = () => {
            const valor = new URLSearchParams(window.location.hash.split('?')[1]).get('cliente');
            if (valor !== null) setCi(Number(valor));
        };
        window.addEventListener('hashchange', actualizar);
        return () => window.removeEventListener('hashchange', actualizar);
    }, []);
    // En el portal nunca se usa el primer cliente como sustituto de la cuenta propia.
    const c = clientes.find(c => c.id === (clientePropio ? sesion?.clienteId : ci));
    return <div className="cuenta-consulta">
      <Head title={clientePropio ? 'Mi estado de cuenta' : 'Estado de cuenta'} sub={clientePropio ? 'Consulta tus compras, cuotas y pagos.' : undefined} />
      {!clientePropio && <div className="card cuenta-selector">{!c && <div><h2>Elige a quién consultar</h2><p className="sub">Podrás revisar su línea de crédito, los próximos pagos y el listado de cada corte.</p></div>}<ClientPicker id="cliente-estado" label="Cliente" clientes={clientes} value={ci} onChange={setCi} includeInactive /></div>}
      {c ? <CuentaCliente key={c.id} c={c} clientePropio={clientePropio} /> : (errorBase || clientePropio || !clientes.length) && <>
        <p className={errorBase ? 'notice' : 'empty'} role={errorBase ? 'alert' : 'status'}>{errorBase || (clientePropio ? 'Aún no hay datos de tu cuenta disponibles. Si acabas de ingresar, espera a que se carguen.' : 'Todavía no hay clientes registrados.')}</p>
      </>}
    </div>;
}
const PESTANAS = [['deuda', 'Pendiente de pago'], ['cuotas', 'Cuotas registradas'], ['corte', 'Listado de pago al corte']] as const;
type Pestana = typeof PESTANAS[number][0];
function CuentaCliente({ c, clientePropio }: { c: ReturnType<typeof useStore>['clientes'][number]; clientePropio: boolean }) {
    const { obligaciones, listados, liquidarDe, emitirListado, pagos, deudaDe } = useStore();
    const parametros = new URLSearchParams(window.location.hash.split('?')[1]);
    const ventaElegida = Number(parametros.get('venta'));
    const [periodo, setPeriodo] = useState(() => /^\d{4}-(0[1-9]|1[0-2])$/.test(parametros.get('periodo') ?? '') ? parametros.get('periodo')! : relojPeru().slice(0, 7));
    const [fecha, setFecha] = useState('');
    const [tab, setTab] = useState<Pestana>(parametros.get('tab') === 'cuotas' ? 'cuotas' : 'deuda');
    const [aviso, setAviso] = useState('');
    const [errorEmision, setErrorEmision] = useState(false);
    const [ocupado, setOcupado] = useState(false);
    useEffect(() => {
        const actualizar = () => {
            const p = new URLSearchParams(window.location.hash.split('?')[1]);
            const mes = p.get('periodo');
            if (mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) setPeriodo(mes);
            if (p.get('tab') === 'cuotas') setTab('cuotas');
            if (p.get('tab') === 'deuda') setTab('deuda');
            setFecha(''); setAviso('');
        };
        window.addEventListener('hashchange', actualizar);
        return () => window.removeEventListener('hashchange', actualizar);
    }, []);
    const prevista = fechaPagoPeriodo(periodo, c.diaPago), real = fecha || prevista;
    let error = '', l: ReturnType<typeof liquidarDe>;
    try {
        l = liquidarDe(c, periodo, real);
    }
    catch (e) {
        error = (e as Error).message;
        l = { lineas: [], capital: D(0), comp: D(0), mora: D(0), total: D(0), vencimiento: parseFecha(prevista), diasMora: 0 };
    }
    const listado = listados.find(x => x.clienteId === c.id && x.periodo === periodo);
    const corte = corteDelPeriodo({ obligaciones }, c, periodo);
    const antesDelCorte = relojPeru() < corte;
    const momentoCorte = (valor: string) => `${fmtFecha(parseFecha(valor.slice(0, 10)))} a las ${valor.slice(11, 16)}`;
    const pagosCliente = pagos.filter(p => p.clienteId === c.id && (p.tiendaId === undefined || p.tiendaId === c.tiendaId))
        .sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? '') || (b.hora ?? '').localeCompare(a.hora ?? ''));
    const comprometido = deudaDe(c), limite = D(c.limite);
    const cuotas = obligaciones.filter(o => o.clienteId === c.id && o.cuota > 0).sort((a, b) => a.vencimiento.localeCompare(b.vencimiento) || a.ventaId - b.ventaId);
    const emitir = async () => { if (ocupado || clientePropio || antesDelCorte || listado) return; setErrorEmision(false); setOcupado(true); try {
        const x = await emitirListado(c.id, periodo);
        setAviso(`Corte guardado: ${x.corte.replace('T', ' ')}. Total ${x.total} ${x.moneda}.`);
        setTab('corte');
    }
    catch (e) {
        setErrorEmision(true); setAviso((e as Error).message);
    }
    finally {
        setOcupado(false);
    } };
    const moverPestana = (e: KeyboardEvent<HTMLButtonElement>, actual: Pestana) => {
        const i = PESTANAS.findIndex(([k]) => k === actual);
        const indice = e.key === 'Home' ? 0 : e.key === 'End' ? PESTANAS.length - 1 : e.key === 'ArrowRight' ? (i + 1) % PESTANAS.length : e.key === 'ArrowLeft' ? (i + PESTANAS.length - 1) % PESTANAS.length : -1;
        if (indice < 0) return;
        e.preventDefault();
        const siguiente = PESTANAS[indice][0];
        setTab(siguiente);
        document.getElementById(`cuenta-tab-${siguiente}`)?.focus();
    };
    return <>
    <div className="head"><div><h2>{c.nombre}</h2><p className="sub">Compras y cuotas pendientes, con intereses y mora separados.</p></div><Badge tone={l.mora.gt(0) ? 'warn' : 'info'}>{l.mora.gt(0) ? 'Con mora' : l.total.gt(0) ? 'Deuda pendiente' : 'Sin deuda exigible'}</Badge></div>
    <section className="card" aria-label="Línea de crédito actual">
      <h3>Línea de crédito actual</h3>
      <dl className="form-grid"><div><dt>Línea autorizada</dt><dd>{sol(limite, c.moneda)}</dd></div>
        <div><dt>Capital pendiente</dt><dd>{sol(comprometido, c.moneda)}</dd></div>
        <div><dt>Crédito disponible</dt><dd>{sol(lineaDisponible(limite, comprometido), c.moneda)}</dd></div></dl>
      {limite.gt(0) && <progress aria-label="Proporción de la línea utilizada" value={Math.min(comprometido.toNumber(), limite.toNumber())} max={limite.toNumber()} style={{width: '100%', accentColor: 'var(--accent)'}}/>}
    </section>
    <div className="card form-grid">
      <div><div className="lbl">Cliente</div><strong>{c.nombre}</strong><p className="sub">{c.tipoDoc} {c.doc} · {c.moneda}</p></div>
      <Field id="per" label="Período a revisar" helpText="Selecciona el mes de vencimiento que quieres consultar. Se incluyen los pagos anteriores todavía pendientes."><input id="per" disabled={ocupado} type="month" className="in" value={periodo} onInput={e => { setPeriodo(/^\d{4}-(0[1-9]|1[0-2])$/.test(e.currentTarget.value) ? e.currentTarget.value : relojPeru().slice(0, 7)); setFecha(''); setAviso(''); }}/></Field>
      <Field id="fr" label="Calcular al" helpText="Incluye todas las obligaciones pendientes hasta la fecha pactada o la fecha consultada, si es posterior. La mora se recalcula por obligación."><input id="fr" type="date" className="in" value={real} onInput={e => setFecha(e.currentTarget.value)}/></Field>
    </div>
    <p className="sub">Vencimiento del período: <strong>{fmtFecha(l.vencimiento)}</strong>. Importe calculado al <strong>{fmtFecha(parseFecha(real))}</strong>. Una consulta posterior incluye las deudas que vencieron hasta esa fecha.</p>
    {error && <p className="notice" role="alert">{error}</p>}
    <div className="form-grid">{([['Capital de las obligaciones', l.capital], ['Interés de la compra', l.comp], ['Mora por atraso', l.mora], ['Total a pagar', l.total]] as const).map(([t, v]) => <section className="stat" key={t}><div className="t">{t}</div><div className="v"><Money value={v} divisa={c.moneda}/></div></section>)}</div>
    <p className="sub">En compras en cuotas, el capital de las obligaciones incluye el interés capitalizado durante la gracia. Por eso puede diferir del capital de compra que utiliza la línea de crédito.</p>
    <div className="card">
      <h3>Listado de pago al corte</h3>
      <p>{listado ? `Emitido para el corte del ${momentoCorte(listado.corte)}.` : antesDelCorte ? `El listado estará disponible desde el ${momentoCorte(corte)}. Mientras tanto puedes consultar la proyección.` : `El corte del ${momentoCorte(corte)} ya pasó. El listado está pendiente de emisión.`}</p>
      <div className="actions">
        {listado && <button type="button" className="btn" onClick={() => { setTab('corte'); document.getElementById('cuenta-tab-corte')?.focus(); }}>Ver listado del corte</button>}
        {!clientePropio && !listado && !antesDelCorte && <button className="btn" disabled={ocupado || !!error} aria-busy={ocupado} onClick={emitir}>{ocupado ? 'Emitiendo…' : 'Emitir listado del corte'}</button>}
        {!clientePropio && <a className="btn pri" href={`#/pago?cliente=${c.id}&periodo=${periodo}`}>Registrar pago</a>}
      </div>
    </div>
    {aviso && <p className={errorEmision ? 'notice' : 'toast'} role={errorEmision ? 'alert' : 'status'}>{aviso}</p>}
    <div className="card flat"><div className="tabs" role="tablist" aria-label="Consultas de la cuenta">{PESTANAS.map(([k, t]) => <button type="button" key={k} id={`cuenta-tab-${k}`} className="tab" role="tab" tabIndex={tab === k ? 0 : -1} aria-selected={tab === k} aria-controls={`cuenta-panel-${k}`} onKeyDown={e => moverPestana(e, k)} onClick={() => setTab(k)}>{t}</button>)}</div>
    <div id="cuenta-panel-deuda" role="tabpanel" aria-labelledby="cuenta-tab-deuda" hidden={tab !== 'deuda'} tabIndex={0}>
    {tab === 'deuda' && <div className="table-scroll" tabIndex={0} role="region" aria-label="Compras pendientes de pago"><table className="tbl"><caption style={{ padding: 16, textAlign: 'left' }}>Compras pendientes de pago, por fecha de compra</caption><thead><tr><th>Compra</th><th>Detalle</th><th>Vence</th><th>Capital</th><th>Interés</th><th>Mora</th><th>Total</th></tr></thead><tbody>{l.lineas.map(o => <tr key={o.id}><td>{fmtFecha(parseFecha(o.fechaCompra))}</td><td>{o.detalle}{o.cuota ? ` · cuota ${o.cuota}` : ''}</td><td>{fmtFecha(parseFecha(o.vencimiento))}</td><td>{sol(D(o.capital), o.moneda)}</td><td>{sol(D(o.comp), o.moneda)}</td><td>{sol(D(o.mora), o.moneda)}</td><td>{sol(D(o.total), o.moneda)}</td></tr>)}</tbody></table>{!l.lineas.length && <p className="empty">No hay obligaciones pendientes para esta consulta.</p>}</div>}
    </div>
    <div id="cuenta-panel-cuotas" role="tabpanel" aria-labelledby="cuenta-tab-cuotas" hidden={tab !== 'cuotas'} tabIndex={0}>
    {tab === 'cuotas' && <div className="table-scroll" tabIndex={0} role="region" aria-label="Cuotas de todos los financiamientos"><table className="tbl"><caption>Cuotas de todos los financiamientos del cliente</caption><thead><tr><th>Venta</th><th>Cuota</th><th>Vence</th><th>Amortización</th><th>Interés</th><th>Cuota</th><th>Estado</th></tr></thead><tbody>{cuotas.map(o => <tr key={o.id} style={o.ventaId === ventaElegida ? { background: 'var(--accent-soft)' } : undefined}><td>OP-{Math.abs(o.ventaId)}</td><td>{o.cuota}</td><td>{fmtFecha(parseFecha(o.vencimiento))}</td><td>{sol(D(o.capital), o.moneda)}</td><td>{sol(D(o.comp), o.moneda)}</td><td>{sol(D(o.capital).plus(o.comp), o.moneda)}</td><td>{o.pagada ? 'Pagada' : 'Pendiente'}</td></tr>)}</tbody></table>{!cuotas.length && <p className="empty">Sin compras en cuotas.</p>}</div>}
    </div>
    <div id="cuenta-panel-corte" role="tabpanel" aria-labelledby="cuenta-tab-corte" hidden={tab !== 'corte'} tabIndex={0}>
    {tab === 'corte' && (listado ? <div className="table-scroll" tabIndex={0} role="region" aria-label="Compras e intereses al corte"><dl className="form-grid" style={{padding: '0 16px'}}>
        <div><dt>Corte emitido</dt><dd>{momentoCorte(listado.corte)}</dd></div>
        <div><dt>Vencimiento</dt><dd>{fmtFecha(parseFecha(listado.fechaPago))}</dd></div>
        <div><dt>Total al corte</dt><dd>{sol(D(listado.total), listado.moneda)}</dd></div>
      </dl><table className="tbl"><caption>Compras e intereses al corte</caption><thead><tr><th>Operación</th><th>Compra</th><th>Detalle</th><th>Vence</th><th>Días</th><th>Tasa</th><th>Concepto</th><th>Importe</th></tr></thead><tbody>{listado.lineas.map((o, i) => <tr key={i}><td>{o.obligacionId}</td><td>{fmtFecha(parseFecha(o.fechaCompra))}</td><td>{o.detalle}</td><td>{o.vencimiento ? fmtFecha(parseFecha(o.vencimiento)) : '—'}</td><td>{o.dias ?? '—'}</td><td>{o.tasa ? `${o.baseTasa} ${pct7(D(o.tasa))}` : o.concepto.startsWith('Capital') ? 'No aplica' : 'Sin dato'}</td><td>{o.concepto}</td><td>{sol(D(o.importe), listado.moneda)}</td></tr>)}</tbody></table></div> : <p className="empty">El corte aún no se ha emitido. Se genera automáticamente al llegar la fecha y hora de corte, con el servicio en funcionamiento.</p>)}
    </div></div>
    <div className="card table-scroll" tabIndex={0} role="region" aria-label="Pagos registrados del cliente"><table className="tbl"><caption>Pagos registrados del cliente</caption><thead><tr><th>Constancia</th><th>Fecha</th><th>Capital</th><th>Interés</th><th>Mora</th><th>Abono</th></tr></thead><tbody>{pagosCliente.map(p => <tr key={p.constancia}><td>{p.constancia}</td><td>{p.fecha ? fmtFecha(parseFecha(p.fecha)) : 'Registro anterior'}</td><td>{sol(D(p.capital), p.moneda ?? c.moneda)}</td><td>{p.comp ? sol(D(p.comp), p.moneda ?? c.moneda) : '—'}</td><td>{p.mora ? sol(D(p.mora), p.moneda ?? c.moneda) : '—'}</td><td>{p.abono ? sol(D(p.abono), p.moneda ?? c.moneda) : '—'}</td></tr>)}{!pagosCliente.length && <tr><td colSpan={6} className="empty">Aún no hay pagos registrados.</td></tr>}</tbody></table></div>
  </>;
}
