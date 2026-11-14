import './operaciones.css';
import { useEffect, useMemo, useState } from 'react';
import { ClientPicker, ConfirmDialog, Dialog, SearchField } from '../components/overlays';
import { useDraft } from '../drafts';
import { useStore } from '../store';
import { leer, num, pct7, sol as dinero } from '../format';
import { Field, Head, Seg, Tick, idx, tipId } from '../components/ui';
import { convertirTasas, generarCronogramaFrances, liquidarFinDeMes, tceaCuotas, tceaFinDeMes } from '../../../contexts/credit-origination/dominio/motor';
import { compraPermitida, lineaDisponible } from '../../../contexts/customer-management/dominio/lineaCredito';
import { D, Decimal, r2 } from '../../../shared/dominio/decimal';
import { fechaValida, fmtFecha, parseFecha, relojPeru } from '../../../shared/dominio/fechas';
import { activo, horaValida } from '../../../shared/dominio/validaciones';
interface Item {
    sku: string;
    cant: string;
    precio: string;
}
type Modal = 'Fin de mes' | 'Cuotas';
export function Venta() {
    const { clientes, productos, deudaDe, registrarVenta } = useStore();
    const [hecho, setHecho] = useState<number | null>(null);
    const clienteRuta = Number(new URLSearchParams(window.location.hash.split('?')[1]).get('cliente') ?? -1);
    const [ci, setCi] = useDraft('venta-cliente', () => clienteRuta, hecho === null);
    const [fecha, setFecha] = useDraft('venta-fecha', () => relojPeru().slice(0, 10), hecho === null);
    const [hora, setHora] = useDraft('venta-hora', () => relojPeru().slice(11), hecho === null);
    const [error, setError] = useState('');
    const [ocupado, setOcupado] = useState(false);
    const [items, setItems] = useDraft<Item[]>('venta-items', () => [], hecho === null);
    const [busqueda, setBusqueda] = useState('');
    const [mensajeCatalogo, setMensajeCatalogo] = useState('');
    const [modal, setModal] = useDraft<Modal>('venta-modalidad', () => 'Fin de mes', hecho === null);
    const [n, setN] = useDraft('venta-cuotas', () => 3, hecho === null);
    const [catalogo, setCatalogo] = useState(false), [seleccion, setSeleccion] = useState<string[]>([]), [limiteCatalogo, setLimiteCatalogo] = useState(20);
    const [descartar, setDescartar] = useState(false), [confirmar, setConfirmar] = useState(false);
    useEffect(() => { if (clienteRuta >= 0) setCi(clienteRuta); }, [clienteRuta, setCi]);
    const cl = clientes.find(c => c.id === ci);
    const sol = (d: Parameters<typeof dinero>[0]) => dinero(d, cl?.moneda);
    const limite = D(cl?.limite ?? 0);
    const deuda = cl ? deudaDe(cl) : D(0);
    const disp = lineaDisponible(limite, deuda);
    const nMax = Math.min(n, cl?.plazo ?? n);
    const consulta = busqueda.trim().toLocaleLowerCase('es');
    const compatibles = productos.filter(p => activo(p) && (p.modalidad === 'Ambas' || p.modalidad === modal)
        );
    const resultados = compatibles.filter(p => `${p.nombre} ${p.sku}`.toLocaleLowerCase('es').includes(consulta));
    const filas = items.map((it) => {
        const p = productos.find((x) => x.sku === it.sku)!;
        const sub = (leer(it.cant) ?? D(0)).mul(p?.credito ?? 0);
        return { it, p, sub };
    });
    const P = r2(filas.reduce((a, f) => a.plus(f.sub), D(0)));
    const fechaOk = fechaValida(fecha);
    const excede = !!cl && P.gt(0) && !compraPermitida(limite, deuda, P);
    const invalidos = filas.some(f => !f.p || !activo(f.p) || f.p.modalidad !== 'Ambas' && f.p.modalidad !== modal || !/^\d+(\.\d+)?$/.test(f.it.cant) || !leer(f.it.cant)?.gt(0));
    const futura = `${fecha}T${hora}` > relojPeru();
    const bloqueado = !cl || futura || P.lte(0) || excede || !fechaOk || !horaValida(hora) || !activo(cl) || invalidos || ocupado || hecho !== null;
    const sim = useMemo(() => {
        if (!cl || P.lte(0) || !fechaOk)
            return null;
        try {
            const t = convertirTasas(cl.tipoC, cl.valC, cl.capC);
            const fc = parseFecha(fecha);
            const reloj = { hora, horaCorte: cl.horaCorte };
            if (modal === 'Fin de mes')
                return { tipo: 'fin' as const, t, r: liquidarFinDeMes({ ...reloj, capital: P, fechaCompra: fc, diaCorte: cl.diaCorte, diaPago: cl.diaPago, tedComp: t.ted, tedMora: t.ted, fechaRealPago: fc }) };
            return { tipo: 'cuotas' as const, t, c: generarCronogramaFrances({ ...reloj, capital: P, fechaCompra: fc, diaCorte: cl.diaCorte, diaPago: cl.diaPago, ted: t.ted, tem: t.tem, nMeses: nMax }) };
        }
        catch (e) {
            return { tipo: 'error' as const, mensaje: (e as Error).message };
        }
    }, [P, fecha, fechaOk, modal, nMax, cl, hora]);
    const upd = (i: number, k: keyof Item, v: string) => { setItems((l) => l.map((x, j) => (j === i ? { ...x, [k]: v } : x))); setHecho(null); };
    const agregarSeleccion = () => {
        const elegidos = compatibles.filter(p => seleccion.includes(p.sku));
        setItems(actuales => {
            const nuevos = [...actuales];
            for (const p of elegidos) {
                const i = nuevos.findIndex(it => it.sku === p.sku);
                if (i < 0) nuevos.push({ sku: p.sku, cant: '1', precio: p.credito });
                else nuevos[i] = { ...nuevos[i], cant: (leer(nuevos[i].cant) ?? D(0)).plus(1).toString() };
            }
            return nuevos;
        });
        setMensajeCatalogo(`${elegidos.length} productos añadidos al detalle.`); setCatalogo(false); setHecho(null);
    };
    const registrar = async () => {
        if (!cl || bloqueado || sim?.tipo === 'error')
            return;
        setOcupado(true);
        setError('');
        try {
            const v = await registrarVenta({ clienteId: cl.id, fecha, hora, capital: P.toString(), modalidad: modal, n: nMax, detalle: filas.map((f) => (f.p?.nombre ?? f.it.sku)).join(' + '), items: items.map(it => ({ sku: it.sku, cantidad: it.cant })) });
            setHecho(v.id);
            // La compra ya consume la línea: vaciar el detalle evita descontarla dos veces en «Disponible».
            setItems([]);
            setMensajeCatalogo('');
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setOcupado(false);
        }
    };
    return (<>
      <Head title="Nueva venta a crédito" sub="Elige cliente y productos. Revisa las fechas y los importes antes de registrar."/>
      {hecho === null && items.length > 0 && <div className="draft-banner"><span>Borrador sin registrar. Se conserva al cambiar de pantalla en esta sesión; se pierde al recargar o cerrar sesión.</span><button type="button" className="btn sm" onClick={() => setDescartar(true)}>Descartar borrador</button></div>}
      <ConfirmDialog open={descartar} title="¿Descartar esta venta sin registrar?" onClose={() => setDescartar(false)} confirmLabel="Descartar borrador" onConfirm={() => { setItems([]); setCi(-1); setFecha(relojPeru().slice(0, 10)); setHora(relojPeru().slice(11)); setError(''); }}><p>Se quitarán el cliente y los productos de este borrador. Las operaciones ya registradas se conservan.</p></ConfirmDialog>
      <ConfirmDialog open={confirmar} title="Registrar esta venta" onClose={() => setConfirmar(false)} busy={ocupado} confirmLabel="Registrar venta" onConfirm={registrar}><p>{cl?.nombre} · Capital {sol(P)} · {modal === 'Cuotas' ? `${nMax} cuotas` : 'Pago único (Fin de mes)'}. Revisa la simulación antes de confirmar.</p></ConfirmDialog>
      <Dialog open={catalogo} title="Agregar productos del catálogo" wide onClose={() => setCatalogo(false)}>
        <SearchField id="catalogo-venta" label="Buscar producto por nombre o código" value={busqueda} onChange={v => { setBusqueda(v); setLimiteCatalogo(20); }}/>
        <p className="sub" role="status">{resultados.length} productos activos para {modal === 'Cuotas' ? 'Cuotas' : 'Pago único (Fin de mes)'}. Precios a crédito{cl ? ` en ${cl.moneda}` : ''}.</p>
        <div className="catalog-picker">{resultados.slice(0, limiteCatalogo).map(p => <label key={p.sku} className={`product-option${seleccion.includes(p.sku) ? ' selected' : ''}`}><input type="checkbox" checked={seleccion.includes(p.sku)} onChange={e => { const checked = e.currentTarget.checked; setSeleccion(xs => checked ? [...xs, p.sku] : xs.filter(x => x !== p.sku)); }}/>{p.imagen ? <img src={p.imagen} alt="" loading="lazy"/> : <span className="product-no-image">Sin imagen</span>}<strong>{p.nombre}</strong><span>{p.sku} · {p.unidad}</span><b>{sol(D(p.credito))}</b></label>)}</div>
        {!resultados.length && <p className="empty">No hay coincidencias. Cambia la búsqueda o revisa las modalidades de los productos.</p>}
        {resultados.length > limiteCatalogo && <button type="button" className="btn" onClick={() => setLimiteCatalogo(x => x + 20)}>Mostrar más productos</button>}
        <div className="acciones"><button type="button" className="btn" onClick={() => setCatalogo(false)}>Cancelar</button><button type="button" className="btn pri" disabled={!seleccion.some(sku => compatibles.some(p => p.sku === sku))} onClick={agregarSeleccion}>Añadir seleccionados ({seleccion.filter(sku => compatibles.some(p => p.sku === sku)).length})</button></div>
      </Dialog>
      <div className="sale-layout ops-sale">
        <div className="col rv" style={{ ...idx(1), flex: 1, minWidth: 'min(420px, 100%)', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div style={{ gridColumn: '1 / -1' }}><Field id="cli" label="Cliente" help="cliente"><ClientPicker id="cli" label="Comprador" clientes={clientes} value={ci} onChange={id => { setCi(id); setHecho(null); }}/></Field></div>
            <Field id="fec" label="Fecha de compra" help="fecha" error={fechaOk ? '' : 'Ingrese una fecha válida'}>
              <input id="fec" className="in num" type="date" value={fecha} onInput={(e) => { setFecha(e.currentTarget.value); setHecho(null); }} aria-describedby={tipId('fec')}/>
            </Field>
            <Field id="horaCompra" label="Hora de compra" helpText="Hora local de Perú. Se compara con la hora de corte del cliente para asignar el ciclo."><input id="horaCompra" className="in" type="time" value={hora} onInput={e => { setHora(e.currentTarget.value); setHecho(null); }}/></Field>
            {cl && <>
              <p className="sub">Corte: día {cl.diaCorte}, a las {cl.horaCorte ?? '23:59'}.</p>
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="kv"><span>Crédito disponible ahora</span><strong>{sol(disp)}</strong></div>
                {P.gt(0) && <div className="kv"><span>Disponible después de esta compra</span><strong>{excede ? 'Compra supera el límite' : sol(lineaDisponible(limite, deuda.plus(P)))}</strong></div>}
              </div>
            </>}
          </div>

          <div className="card flat">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
              <span style={{ fontWeight: 600 }}>Detalle de ítems</span>
              <button type="button" className="btn" onClick={() => { setBusqueda(''); setSeleccion([]); setLimiteCatalogo(20); setCatalogo(true); }}>Agregar del catálogo</button><span className="sr" role="status">{mensajeCatalogo}</span>
            </div>
            <div className="ops-table"><table className="tbl">
              <caption className="sr">Ítems de la compra</caption>
              <thead><tr><th scope="col">Producto</th><th scope="col" className="r" style={{ minWidth: 140 }}>Cantidad<details className="ops-column-help"><summary>Ayuda</summary><span id="venta-cantidad-ayuda">Admite hasta ocho enteros y dos decimales. Usa + o − para variar una unidad.</span></details></th><th scope="col" className="r" style={{ width: 140 }}>Precio a crédito</th><th scope="col" className="r" style={{ width: 130 }}>Subtotal</th><th scope="col" style={{ width: 56 }}><span className="sr">Quitar</span></th></tr></thead>
              <tbody>
                {filas.map((f, i) => (<tr key={`${f.it.sku}-${i}`} className="row-in">
                    <td style={{ fontWeight: 500 }}>{(f.p?.nombre ?? f.it.sku)}</td>
                    <td className="r"><div className="quantity-control">
                      <button type="button" aria-label={`Disminuir cantidad de ${f.p?.nombre ?? f.it.sku}`} disabled={!(leer(f.it.cant)?.gt(1))} onClick={() => upd(i, 'cant', D(f.it.cant).minus(1).toString())}>−</button>
                      <input id={`cantidad-${i}`} className="in num" inputMode="decimal" aria-label={`Cantidad de ${f.p?.nombre ?? f.it.sku}`} aria-describedby="venta-cantidad-ayuda" value={f.it.cant} onChange={e => {
                        const valor = e.currentTarget.value.replace(',', '.');
                        if (/^\d{0,8}(?:\.\d{0,2})?$/.test(valor)) upd(i, 'cant', valor);
                      }}/>
                      <button type="button" aria-label={`Aumentar cantidad de ${f.p?.nombre ?? f.it.sku}`} disabled={(leer(f.it.cant) ?? D(0)).gt('99999998.99')} onClick={() => upd(i, 'cant', (leer(f.it.cant) ?? D(0)).plus(1).toString())}>+</button>
                    </div></td>
                    <td className="r num">{f.p ? sol(D(f.p.credito)) : '—'}</td>
                    <td className="r"><Tick value={num(f.sub)}/></td>
                    <td className="r"><button type="button" className="btn sm" aria-label={`Quitar ${(f.p?.nombre ?? f.it.sku)}`} onClick={() => { setItems((l) => l.filter((_, j) => j !== i)); setHecho(null); }}>Quitar</button></td>
                  </tr>))}
              </tbody>
              <tfoot><tr><td colSpan={3} className="r">Capital total (P)</td><td className="r num">{num(P)}</td><td /></tr></tfoot>
            </table></div>
            {filas.length === 0 && <div className="empty">Agregue al menos un producto para simular.</div>}
          </div>

          <div className="card" style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <Field id="modal" label="Modalidad de pago" help="modal"><Seg<Modal> value={modal} options={['Fin de mes', 'Cuotas']} onChange={(v) => { setModal(v); setHecho(null); }} label="Modalidad de pago"/></Field>
            {modal === 'Cuotas' && cl && (<div className="rv"><Field id="meses" label="Cuotas de esta compra" help="meses">
                <select id="meses" className="in" style={{ width: 170 }} value={nMax} onChange={(e) => setN(+e.currentTarget.value)} aria-describedby={tipId('meses')}>{Array.from({ length: cl.plazo }, (_, i) => i + 1).map((k) => <option key={k} value={k}>{k} {k === 1 ? 'cuota' : 'cuotas'}</option>)}</select>
                <div className="sub" style={{ fontSize: 12 }}>Máximo {cl.plazo}</div></Field></div>)}
          </div>
        </div>

        <aside className="rv" style={{ ...idx(2), width: 'min(360px, 100%)', flex: 'none', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section className="card" aria-live="polite" style={{ background: 'var(--accent-soft)', borderColor: '#c9dfd6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontWeight: 600, color: 'var(--accent-ink)' }}>Simulación previa</span></div>
            {sim?.tipo === 'error' && <p role="alert">{sim.mensaje}</p>}
            {!sim && <div className="empty" style={{ padding: '24px 0' }}>Selecciona un cliente y agrega productos para simular la compra.</div>}
            {sim?.tipo === 'fin' && (<>
              <div className="kv"><span>Ciclo</span><span>{sim.r.ciclo === 0 ? 'Actual' : 'Siguiente'}</span></div>
              <div className="kv"><span>Vence</span><Tick value={fmtFecha(sim.r.vencimiento)}/></div>
              <div className="kv"><span>Días de compra a vencimiento</span><Tick value={String(sim.r.dias)}/></div>
              <div className="kv"><span>Tasa efectiva diaria (TED)</span><Tick value={pct7(sim.t.ted)}/></div>
              <div className="kv"><span>Interés compensatorio</span><Tick value={num(sim.r.interesComp)}/></div>
              <div className="kv"><span>Tasa de costo efectivo anual (TCEA)</span><Tick value={pct7(tceaFinDeMes(P, sim.r.montoVencido, sim.r.dias))}/></div>
              <div className="kv" style={{ fontWeight: 600, fontSize: 16 }}><span style={{ color: 'var(--ink)' }}>Total exigible</span><Tick value={sol(sim.r.montoVencido)}/></div>
            </>)}
            {sim?.tipo === 'cuotas' && (<>
              <div className="kv"><span>Días de gracia total</span><Tick value={String(sim.c.diasGracia)}/></div>
              <div className="kv"><span>Fin de la gracia</span><Tick value={fmtFecha(sim.c.filas[0].fecha)}/></div>
              <div className="kv"><span>Saldo al terminar la gracia</span><Tick value={sol(sim.c.capitalAjustado)}/></div>
              <div className="kv"><span>Tasa efectiva mensual (TEM)</span><Tick value={pct7(sim.t.tem)}/></div>
              <div className="kv"><span>Primera cuota vence</span><Tick value={fmtFecha(sim.c.filas[1].fecha)}/></div>
              <div className="kv"><span>Cuota mensual (R)</span><b style={{ fontSize: 18 }}><Tick value={sol(sim.c.cuotaFija)}/></b></div>
              <div className="kv"><span>Total de intereses</span><Tick value={sol(sim.c.totalIntereses)}/></div>
              <div className="kv"><span>Tasa de costo efectivo anual (TCEA)</span><Tick value={pct7(tceaCuotas(P, sim.c))}/></div>
              <div className="kv" style={{ fontWeight: 600 }}><span style={{ color: 'var(--ink)' }}>Total a pagar</span><Tick value={sol(sim.c.totalCuotas)}/></div>
              <details style={{ marginTop: 8 }}>
                <summary style={{ color: 'var(--accent-ink)', cursor: 'pointer' }}>Cronograma de esta venta · método francés</summary>
                <div style={{ overflowX: 'auto' }}>
                  <table className="tbl">
                    <caption>Cuotas mensuales simuladas</caption>
                    <thead><tr><th scope="col">Cuota</th><th scope="col">Vence</th><th scope="col" className="r">Cuota a pagar</th><th scope="col" className="r">Interés</th><th scope="col" className="r">Capital amortizado</th><th scope="col" className="r">Saldo</th></tr></thead>
                    <tbody>{sim.c.filas.filter(fila => fila.k > 0).map(fila => (
                      <tr key={fila.k}>
                        <th scope="row">{fila.k}</th>
                        <td>{fmtFecha(fila.fecha)}</td>
                        <td className="r num">{sol(fila.cuota)}</td>
                        <td className="r num">{sol(fila.interes)}</td>
                        <td className="r num">{sol(fila.amortizacion)}</td>
                        <td className="r num">{sol(fila.saldoFinal)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </details>
            </>)}
          </section>
          {futura && <p className="notice" role="alert">La simulación permite fechas futuras; el registro requiere fecha y hora hasta el momento actual.</p>}
          {error && <p className="notice" role="alert">{error}</p>}
          {invalidos && <p role="alert" className="notice">Revise cantidades, precios y modalidad de los productos. Los productos de baja no pueden venderse.</p>}
          {cl && !activo(cl) && <p role="alert" className="notice">El cliente está dado de baja. Seleccione uno activo.</p>}
          {excede && <div className="notice" role="alert"><div><b>Línea insuficiente.</b> La compra de {sol(P)} supera la línea disponible de {sol(disp)}. No se puede registrar.</div></div>}
          {hecho !== null && (<><div className="toast" role="status">Operación OP-{hecho} registrada. Deuda actualizada.</div><a className="btn" href={`#/estado?cliente=${ci}&venta=${hecho}&periodo=${fecha.slice(0, 7)}&tab=${modal === 'Cuotas' ? 'cuotas' : 'deuda'}`}>Ver esta venta en el estado de cuenta</a></>)}
          <button type="button" className="btn pri" style={{ height: 48 }} disabled={bloqueado || sim?.tipo === 'error'} onClick={() => setConfirmar(true)}>Registrar compra</button>
        </aside>
      </div>
    </>);
}
export type { Decimal };
