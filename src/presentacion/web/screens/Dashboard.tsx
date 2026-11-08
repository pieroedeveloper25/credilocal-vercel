import { useEffect, useId, useMemo, useState } from 'react';
import { useStore } from '../store';
import { Head } from '../components/ui';
import { num, sol } from '../format';
import { D } from '../../../shared/dominio/decimal';
import { fechaValida, fmtFecha, parseFecha, relojPeru } from '../../../shared/dominio/fechas';
import { resumirDashboard, type MonedaDashboard } from '../dashboard';
import './dashboard.css';

const mesFormato = new Intl.DateTimeFormat('es-PE', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const diaFormato = new Intl.DateTimeFormat('es-PE', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
const mesTexto = (mes: string) => mesFormato.format(parseFecha(`${mes}-01`));
const fechaTexto = (fecha: string) => fmtFecha(parseFecha(fecha));
type Resumen = ReturnType<typeof resumirDashboard>;
interface Serie { label: string; values: string[] }
const series = ['Ventas a crédito', 'Cobros recibidos'];

function Barras({ title, rows, columna, moneda }: { title: string; rows: Serie[]; columna: string; moneda: MonedaDashboard }) {
    const id = useId();
    const max = Math.max(0, ...rows.flatMap(r => r.values.map(Number)));
    const money = (v: string) => sol(D(v), moneda);
    if (!max) return <p className="dash-empty">Sin ventas ni cobros registrados en este período.</p>;
    return <>
        <div className="dash-plot" tabIndex={0} role="region" aria-label={title}><svg viewBox="0 0 620 244" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
            <title id={`${id}-title`}>{title}</title><desc id={`${id}-desc`}>Importes en {moneda}. Los valores exactos están en la tabla de datos.</desc>
            {[0, 0.5, 1].map(f => <g key={f}>
                <line x1="80" x2="610" y1={195 - f * 154} y2={195 - f * 154} className="dash-gridline"/>
                <text x="74" y={199 - f * 154} textAnchor="end" className="dash-axis">{num(D(max).mul(f))}</text>
            </g>)}
            {rows.map((r, i) => {
                const grupo = 530 / rows.length, centro = 80 + grupo * (i + 0.5), ancho = Math.min(25, grupo / 3);
                return <g key={r.label}>{r.values.map((v, j) => {
                    const alto = Number(v) / max * 154;
                    return <rect key={j} x={centro + (j - 1) * (ancho + 3)} y={195 - alto} width={ancho} height={alto} rx="2" className={`dash-bar dash-series-${j}`}>
                        <title>{r.label} · {series[j]} · {money(v)}</title></rect>;
                })}<text x={centro} y="216" textAnchor="middle" className="dash-axis">{r.label}</text></g>;
            })}
        </svg></div>
        <ul className="dash-legend">{series.map((s, i) => <li key={s}><span className={`dash-key dash-series-${i}`} aria-hidden="true"/>{s}</li>)}</ul>
        <details className="dash-data"><summary>Consultar importes</summary><div className="table-scroll" tabIndex={0} role="region" aria-label={title}><table className="tbl">
            <caption>{title} · {moneda}</caption><thead><tr><th scope="col">{columna}</th>{series.map(s => <th scope="col" key={s}>{s}</th>)}</tr></thead>
            <tbody>{rows.map(r => <tr key={r.label}><th scope="row">{r.label}</th>{r.values.map((v, i) => <td className="num" key={i}>{money(v)}</td>)}</tr>)}</tbody>
        </table></div></details>
    </>;
}

function Anillo({ resumen }: { resumen: Resumen }) {
    const { capital, moneda, vigente, vencido } = resumen;
    if (D(capital).isZero()) return <p className="dash-empty">Sin capital pendiente en esta moneda.</p>;
    const pct = D(vigente).div(capital).mul(100).toNumber();
    return <>
        <div className="dash-donut"><svg viewBox="0 0 220 220" role="img" aria-label={`Capital pendiente total: ${sol(D(capital), moneda)}`}>
            <circle cx="110" cy="110" r="78" fill="none" strokeWidth="22" className="dash-ring-base"/>
            <circle cx="110" cy="110" r="78" fill="none" strokeWidth="22" pathLength="100" strokeDasharray={`${pct} ${100 - pct}`} transform="rotate(-90 110 110)" className="dash-ring-value"/>
            <text x="110" y="108" textAnchor="middle" className="dash-donut-value">{sol(D(capital), moneda)}</text>
            <text x="110" y="130" textAnchor="middle" className="dash-axis">Capital pendiente</text>
        </svg></div>
        <dl className="dash-breakdown">{[
            { label: 'Dentro del plazo', importe: vigente, porcentaje: pct },
            { label: 'Con fecha de pago vencida', importe: vencido, porcentaje: 100 - pct },
        ].map((p, i) => <div key={p.label}><dt><span className={`dash-key dash-series-${i}`} aria-hidden="true"/>{p.label} <small>{p.porcentaje.toFixed(1)} %</small></dt>
            <dd className="num">{sol(D(p.importe), moneda)}</dd></div>)}</dl>
    </>;
}

function Agenda({ registros, moneda, vencidos }: { registros: Resumen['proximasObligaciones']; moneda: MonedaDashboard; vencidos?: boolean }) {
    const [todos, setTodos] = useState(false);
    const filas = todos ? registros : registros.slice(0, 3);
    return <section className="card dash-attention">
        <h2>{vencidos ? `${registros.length} ${registros.length === 1 ? 'pago vencido' : 'pagos vencidos'}` : 'Próximos vencimientos'}</h2>
        {registros.length === 0 ? <p>{vencidos ? 'Sin pagos vencidos' : 'Sin pagos programados por vencer'} en {moneda}.</p> : <>
            <p>{vencidos ? 'Revisa el cobro para calcular el total con mora.' : 'Cuotas y pagos únicos pendientes, desde hoy.'}</p>
            <ol className="fecha-agenda">{filas.map(o => <li key={o.id}>
                <div><time dateTime={o.vencimiento}>{fechaTexto(o.vencimiento)}</time><strong>{o.cliente}</strong>
                    <small>{o.cuota ? `Cuota ${o.cuota}` : 'Pago único'} · OP-{Math.abs(o.ventaId)}</small></div>
                <div className="agenda-accion">{!vencidos && <strong className="num">{sol(D(o.importe), moneda)}</strong>}
                    <a className="btn sm" href={`#/${vencidos ? 'pago' : 'estado'}?cliente=${o.clienteId}&periodo=${o.vencimiento.slice(0,7)}`}>{vencidos ? 'Revisar cobro' : 'Ver cuenta'}</a></div>
            </li>)}</ol>
            {registros.length > 3 && <div className="agenda-mas"><small>Mostrando {filas.length} de {registros.length}</small><button type="button" className="btn sm" aria-expanded={todos} onClick={() => setTodos(!todos)}>
                {todos ? 'Mostrar menos' : `Ver los ${registros.length} ${vencidos ? 'pagos vencidos' : 'vencimientos'}`}
            </button></div>}
        </>}
    </section>;
}

export function Dashboard() {
    const { clientes, ventas, obligaciones, pagos, tienda } = useStore();
    const [hoy, setHoy] = useState(() => relojPeru().slice(0, 10));
    const [moneda, setMoneda] = useState<MonedaDashboard>('PEN');
    const [periodo, setPeriodo] = useState(() => hoy.slice(0, 7));
    const [dia, setDia] = useState(hoy);
    const [semanal, setSemanal] = useState(false);
    const [pagina, setPagina] = useState(0);
    useEffect(() => {
        const id = window.setInterval(() => setHoy(relojPeru().slice(0, 10)), 60_000);
        return () => window.clearInterval(id);
    }, []);
    const r = useMemo(() => resumirDashboard({ clientes, ventas, obligaciones, pagos }, moneda, hoy, periodo, tienda?.id, dia),
        [clientes, ventas, obligaciones, pagos, moneda, hoy, periodo, tienda?.id, dia]);
    const dinero = (v: string) => sol(D(v), moneda);
    const ranking = r.cuentas.filter(c => D(c.capital).gt(0)).slice(0,8);
    const maxPagina = Math.max(0, Math.ceil(r.cuentas.length / 10) - 1), actual = Math.min(pagina, maxPagina);
    const dias = r.actividadSemanal.filter(d => d.fecha <= hoy);
    const filas = semanal ? dias.map(d => ({ label: diaFormato.format(parseFecha(d.fecha)), values: [d.ventas, d.cobros] })) :
        r.actividad.map(m => ({ label: mesTexto(m.mes), values: [m.ventas, m.cobros] }));
    const rango = semanal ? `Del ${fechaTexto(r.actividadSemanal[0].fecha)} al ${fechaTexto(dias[dias.length - 1].fecha)}` : `Seis meses hasta ${mesTexto(periodo)}`;
    const cobrado = semanal ? dias.reduce((a, d) => a.plus(d.cobros), D(0)).toFixed(2) : r.cobros;
    return <div className="dashboard">
        <Head title="Resumen del comercio"><a className="btn pri" href="#/venta">Nueva venta a crédito</a></Head>
        <div className="dash-toolbar"><p>Cartera al <strong>{fechaTexto(hoy)}</strong></p>
            <div><label htmlFor="dash-moneda">Moneda</label><select id="dash-moneda" className="in" value={moneda} onChange={e => { setMoneda(e.target.value as MonedaDashboard); setPagina(0); }}>
                <option value="PEN">Soles (PEN)</option><option value="USD">Dólares (USD)</option></select></div></div>
        <div className="dash-metrics">
            <section className="card dash-metric"><h2>Capital pendiente</h2><strong className="num">{dinero(r.capital)}</strong><p>Capital de las compras que los clientes aún deben devolver.</p></section>
            <section className="card dash-metric"><h2>Capital vencido</h2><strong className="num">{dinero(r.vencido)}</strong><p>Parte del capital pendiente cuya fecha de pago ya pasó.</p></section>
            <section className="card dash-metric"><h2>Clientes con saldo</h2><strong className="num">{r.clientesConSaldo}</strong><p>De {r.cuentas.length} cuentas en la moneda elegida.</p></section>
        </div>
        <div className="dash-chart-grid">
            <section className="card dash-chart"><h2>Capital pendiente por cliente</h2><p className="dash-note">Hasta ocho clientes con mayor capital por devolver, sin intereses ni mora.</p>
                {ranking.length ? <ol className="dash-horizontal">{ranking.map(c => <li key={c.id} className="dash-horizontal-row"><div><span>{c.nombre}</span><strong className="num">{dinero(c.capital)}</strong></div>
                    <div className="dash-track" aria-hidden="true"><span style={{ width: `${D(c.capital).div(ranking[0].capital).mul(100)}%` }}/></div></li>)}</ol> : <p className="dash-empty">Sin capital pendiente en esta moneda.</p>}
                <button type="button" className="dash-link" onClick={() => { const target = document.getElementById('dash-cuentas'); target?.scrollIntoView({ block: 'start' }); target?.focus({ preventScroll: true }); }}>Consultar todas las cuentas</button>
            </section>
            <section className="card dash-chart"><h2>Estado de la cartera</h2><p className="dash-note">Capital pendiente de los clientes de la tienda en {moneda}, sin intereses ni mora.</p><Anillo resumen={r}/></section>
        </div>
        <div className="dash-attention-grid"><Agenda key={`v-${moneda}`} registros={r.obligacionesVencidas} moneda={moneda} vencidos/><Agenda key={moneda} registros={r.proximasObligaciones} moneda={moneda}/></div>
        <section className="card dash-chart dash-history"><h2>Ventas a crédito y cobros</h2>
            <div className="dash-toolbar">
                <div><label htmlFor="dash-escala">Vista del historial</label><select className="in" id="dash-escala" value={semanal ? 'semana' : 'mes'} onChange={e => setSemanal(e.target.value === 'semana')}>
                    <option value="mes">Mensual</option><option value="semana">Semanal</option></select></div>
                {semanal ? <div><label htmlFor="dash-semana">Semana que contiene el día</label><input className="in" type="date" id="dash-semana" max={hoy} value={dia} onChange={e => { if (fechaValida(e.target.value) && e.target.value <= hoy) setDia(e.target.value); }}/></div> :
                    <div><label htmlFor="dash-periodo">Mes del historial</label><input className="in" type="month" id="dash-periodo" max={hoy.slice(0, 7)} value={periodo} onChange={e => { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value) && e.target.value <= hoy.slice(0, 7)) setPeriodo(e.target.value); }}/></div>}
            </div>
            <div className="dash-history-summary"><div><span>{semanal ? 'Cobrado en la semana' : `Cobrado en ${mesTexto(periodo)}`}</span><strong className="num">{dinero(cobrado)}</strong></div>
                <p>Pagos recibidos, incluidos capital, intereses y mora.</p></div>
            <p className="dash-note">{rango} · Importes en {moneda}</p>
            <Barras title={`Ventas a crédito y cobros · ${rango}`} rows={filas} columna={semanal ? 'Día' : 'Mes'} moneda={moneda}/>
            {r.pagosSinFecha > 0 && <p className="dash-note">Pagos históricos sin fecha, excluidos de este historial: {r.pagosSinFecha}.</p>}
        </section>
        <section className="card" id="dash-cuentas" tabIndex={-1}><h2>Cuentas de clientes</h2>
            {r.cuentas.length ? <div className="table-scroll" tabIndex={0} role="region" aria-label="Cuentas de clientes"><table className="tbl"><caption>{moneda} · Al {fechaTexto(hoy)}</caption><thead><tr><th scope="col">Cliente</th><th scope="col">Estado</th><th scope="col">Línea autorizada</th><th scope="col">Capital pendiente</th></tr></thead>
                <tbody>{r.cuentas.slice(actual * 10, actual * 10 + 10).map(c => <tr key={c.id}><th scope="row"><a href={`#/estado?cliente=${c.id}`}>{c.nombre}</a><small className="dash-doc">{c.doc}</small></th><td>{c.activo ? 'Activo' : 'De baja'}</td><td className="num">{dinero(c.limite)}</td><td className="num">{dinero(c.capital)}</td></tr>)}</tbody>
            </table></div> : <p className="dash-empty">Todavía no hay clientes en esta moneda. <a href="#/clientes">Ir a clientes</a></p>}
            {r.cuentas.length > 10 && <div className="dash-pagination"><button className="btn sm" disabled={actual === 0} onClick={() => setPagina(actual - 1)}>Anterior</button><span>Página {actual + 1} de {maxPagina + 1}</span><button className="btn sm" disabled={actual >= maxPagina} onClick={() => setPagina(actual + 1)}>Siguiente</button></div>}
        </section>
    </div>;
}
