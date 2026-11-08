import './mi-cronograma.css';
import { Fragment, useMemo, useState } from 'react';
import { useSesion } from '../session';
import { useStore } from '../store';
import { num, sol as dinero } from '../format';
import { Badge, Field, Head, Money, idx } from '../components/ui';
import { ChevronDownIcon } from '../components/Icons';
import { convertirTasas, generarCronogramaFrances } from '../../../contexts/credit-origination/dominio/motor';
import { D } from '../../../shared/dominio/decimal';
import { fmtFecha, parseFecha } from '../../../shared/dominio/fechas';
/** Vista del cliente: el cronograma de su propio financiamiento en cuotas, si tiene uno. Solo lectura. */
export function MiCronograma() {
    const { sesion } = useSesion();
    const { clientes, errorBase } = useStore();
    const cl = clientes.find(c => c.id === sesion?.clienteId);
    if (!cl) return <><Head title="Mi cronograma" sub="Consulta de tus compras en cuotas." /><p className={errorBase ? 'notice' : 'empty'} role={errorBase ? 'alert' : 'status'}>{errorBase || 'Aún no hay datos de tu cuenta disponibles. Si acabas de ingresar, espera a que se carguen.'}</p></>;
    return <CronogramaCliente key={cl.id} cl={cl} />;
}
function CronogramaCliente({ cl }: { cl: ReturnType<typeof useStore>['clientes'][number] }) {
    const { ventas, obligaciones } = useStore();
    const [ventaId, setVentaId] = useState<number | null>(null);
    const [abierta, setAbierta] = useState<number | null>(null);
    const propias = ventas.filter(v => v.clienteId === cl.id && v.modalidad === 'Cuotas');
    const venta = propias.find(v => v.id === ventaId) ?? propias[0];
    const moneda = venta?.condiciones?.moneda ?? cl.moneda;
    const sol = (d: Parameters<typeof dinero>[0]) => dinero(d, moneda);
    const resultado = useMemo(() => {
        if (!venta)
            return { cro: null, error: '' };
        try {
        const a = venta.condiciones ?? cl;
        const t = convertirTasas(a.tipoC, a.valC, a.capC);
        return { cro: generarCronogramaFrances({ capital: D(venta.capital), fechaCompra: parseFecha(venta.fecha), hora: venta.hora, horaCorte: venta.horaCorte ?? a.horaCorte, diaCorte: a.diaCorte, diaPago: a.diaPago, ted: t.ted, tem: t.tem, nMeses: venta.n }), error: '' };
        } catch (e) { return { cro: null, error: (e as Error).message }; }
    }, [venta, cl]);
    const { cro } = resultado;
    const toggleRow = (k: number) => {
        setAbierta((prev) => (prev === k ? null : k));
    };
    return (<>
      <Head title="Mi cronograma" sub="Consulta las fechas, los importes y el desglose de tus compras en cuotas."/>

      {propias.length > 1 && <Field id="financiamiento" label="Financiamiento" helpText="Seleccione la compra cuyo cronograma desea consultar."><select id="financiamiento" className="in" value={venta?.id} onChange={e => { setVentaId(+e.currentTarget.value); setAbierta(null); }}>{propias.map(v => <option key={v.id} value={v.id}>OP-{Math.abs(v.id)} · {v.detalle}</option>)}</select></Field>}
      {venta && <p>Operación OP-{Math.abs(venta.id)} · {obligaciones.filter(o => o.ventaId === venta.id && o.cuota > 0 && o.pagada).length} de {venta.n} cuotas pagadas.</p>}
      {resultado.error && <p role="alert" className="notice">No se pudo mostrar el cronograma: {resultado.error}</p>}
      {!venta ? (<div className="card empty rv"><div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Sin financiamiento en cuotas</div>Actualmente no tiene compras financiadas a plazos. Sus compras a fin de mes aparecen en «Mi estado de cuenta».</div>) : !cro ? null : (<>
        <p className="sub">{cro.diasGracia > 0 ? `Fin de gracia: ${fmtFecha(cro.filas[0].fecha)} (sin pago). ` : 'Esta compra no tiene días de gracia. '}Primera cuota: {fmtFecha(cro.filas[1].fecha)}. Última: {fmtFecha(cro.filas[cro.filas.length - 1].fecha)}. La última cuota puede ajustar centavos.</p>
        <div className="rv" style={{ ...idx(1), display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <div className="stat"><div className="t">Capital original</div><div className="v"><Money divisa={moneda} value={D(venta.capital)}/></div></div>
          <div className="stat"><div className="t">Días de gracia</div><div className="v">{cro.diasGracia}</div></div>
          <div className="stat hl"><div className="t">Cuota mensual de referencia</div><div className="v"><Money divisa={moneda} value={cro.cuotaFija}/></div></div>
          <div className="stat"><div className="t">Total de intereses</div><div className="v"><Money divisa={moneda} value={cro.totalIntereses}/></div></div>
        </div>

        <section className="cronograma-movil" aria-label="Cronograma de la compra">
          <h2>Detalle por cuota</h2>
          {cro.filas.filter(fila => fila.k > 0 || cro.diasGracia > 0).map(fila => {
            const gracia = fila.k === 0;
            const expandida = abierta === fila.k;
            const pagada = !gracia && obligaciones.some(o => o.ventaId === venta.id && o.cuota === fila.k && o.pagada);
            return <article key={fila.k} className="cronograma-ficha">
              <button type="button" className="cronograma-resumen" onClick={() => toggleRow(fila.k)}
                aria-expanded={expandida} aria-controls={`desglose-movil-${fila.k}`}>
                <span><strong>{gracia ? 'Fin de gracia' : `Cuota ${fila.k}`}</strong>
                  <small>{gracia ? 'Finaliza' : 'Vence'} el {fmtFecha(fila.fecha)}</small></span>
                <span className="cronograma-importe"><strong>{gracia ? 'Sin pago' : sol(fila.cuota)}</strong>
                  {!gracia && <small>{pagada ? 'Pagada' : 'Pendiente'}</small>}</span>
                <ChevronDownIcon size={16}/>
              </button>
              <dl hidden={!expandida} id={`desglose-movil-${fila.k}`}>
                <div><dt>Saldo inicial</dt><dd>{sol(fila.saldoInicial)}</dd></div>
                <div><dt>{gracia ? 'Interés capitalizado' : 'Interés de la cuota'}</dt><dd>{sol(fila.interes)}</dd></div>
                {!gracia && <div><dt>Capital amortizado</dt><dd>{sol(fila.amortizacion)}</dd></div>}
                <div><dt>{gracia ? 'Saldo al terminar la gracia' : 'Saldo después de la cuota'}</dt><dd>{sol(fila.saldoFinal)}</dd></div>
              </dl>
            </article>;
          })}
          <p className="cronograma-total">Total de las cuotas <strong>{sol(cro.totalCuotas)}</strong></p>
        </section>
        <div className="card flat table-scroll rv cronograma-escritorio" style={idx(2)} tabIndex={0} role="region" aria-label="Cronograma de la compra">
          <table className="tbl">
            <caption className="sr">Cronograma de amortización francés</caption>
            <thead><tr><th scope="col">N.°</th><th scope="col">Fecha</th><th scope="col">Gracia</th><th scope="col" className="r">Saldo inicial</th><th scope="col" className="r">Interés</th><th scope="col" className="r">Cuota</th><th scope="col" className="r">Amortización</th><th scope="col" className="r">Saldo final</th></tr></thead>
            <tbody>{cro.filas.map((x, i) => {
                const isOpen = abierta === x.k;
                const cuotaNum = x.cuota.toNumber();
                const amortPct = cuotaNum > 0 ? Math.min(100, Math.max(0, (x.amortizacion.toNumber() / cuotaNum) * 100)) : 0;
                const intPct = cuotaNum > 0 ? Math.min(100, Math.max(0, (x.interes.toNumber() / cuotaNum) * 100)) : 0;
                return (<Fragment key={x.k}>
                  <tr className={`row-in cron-row ${isOpen ? 'open' : ''}`} style={{ ...idx(i), background: x.k === 0 ? 'var(--accent-soft)' : undefined }}>
                    <td className="num"><button type="button" className="btn sm" onClick={() => toggleRow(x.k)} aria-expanded={isOpen} aria-controls={`mi-cuota-detalle-${x.k}`} aria-label={`${isOpen ? 'Ocultar' : 'Ver'} desglose de ${x.k === 0 ? 'la gracia' : `la cuota ${x.k}`}`}>
                      <span>{x.k === 0 ? 'Gracia' : x.k}</span>
                      <span className="cron-chevron" style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <ChevronDownIcon size={12}/>
                      </span></button>
                    </td>
                    <td className="num">{fmtFecha(x.fecha)}</td>
                    <td>{x.gracia}</td>
                    <td className="r num">{num(x.saldoInicial)}</td>
                    <td className="r num">{x.k === 0 ? `(${num(x.interes)})` : num(x.interes)}</td>
                    <td className="r num">{num(x.cuota)}</td>
                    <td className="r num">{num(x.amortizacion)}</td>
                    <td className="r num" style={{ fontWeight: 600 }}>{num(x.saldoFinal)}</td>
                  </tr>
                  <tr id={`mi-cuota-detalle-${x.k}`} hidden={!isOpen} style={{ background: 'transparent' }}>
                    <td colSpan={8} style={{ padding: 0, border: 0 }}>
                      <div className={`accordion-wrapper ${isOpen ? 'expanded' : ''}`}>
                        <div className="accordion-inner">
                          <div className="quota-breakdown">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 600, fontSize: 13 }}>
                                {x.k === 0 ? 'Período de Gracia Total Capitalizable' : `Composición de la Cuota #${x.k}`}
                              </span>
                              <span className="sub" style={{ fontSize: 12 }}>
                                {x.k === 0 ? `Capitalización: P_cap = P · (1 + TED)^${x.diasPeriodo}` : `Amortización: ${sol(x.amortizacion)} · Interés: ${sol(x.interes)}`}
                              </span>
                            </div>

                            {x.k > 0 && (<>
                                <div className="quota-stack-bar" role="img" aria-label={`La cuota devuelve ${num(x.amortizacion)} de capital y cubre ${num(x.interes)} de interés`}>
                                  <div className="quota-stack-amort" style={{ width: `${amortPct}%` }} title={`Amortización: ${Math.round(amortPct)}%`}/>
                                  <div className="quota-stack-interes" style={{ width: `${intPct}%` }} title={`Interés: ${Math.round(intPct)}%`}/>
                                </div>
                                <div className="quota-chips">
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)' }}/>
                                    Amortización: <b>{num(x.amortizacion)}</b> ({Math.round(amortPct)}%)
                                  </span>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--warn)' }}/>
                                    Interés: <b>{num(x.interes)}</b> ({Math.round(intPct)}%)
                                  </span>
                                  <span style={{ marginLeft: 'auto', color: 'var(--muted)' }}>
                                    Saldo pendiente posterior: <b className="num">{sol(x.saldoFinal)}</b>
                                  </span>
                                </div>
                              </>)}

                            {x.k === 0 && (<div className="quota-chips">
                                <span>Capital inicial: <b className="num">{sol(x.saldoInicial)}</b></span>
                                <span>Interés capitalizado: <b className="num" style={{ color: 'var(--warn)' }}>{sol(x.interes)}</b></span>
                                <span>Saldo al inicio de cuotas: <b className="num" style={{ color: 'var(--accent-ink)' }}>{sol(x.saldoFinal)}</b></span>
                              </div>)}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </Fragment>);
            })}</tbody>
            <tfoot><tr><td colSpan={4}>Totales</td><td className="r num">{num(cro.totalIntereses)}</td><td className="r num">{num(cro.totalCuotas)}</td><td className="r num">{num(cro.totalAmortizado)}</td><td /></tr></tfoot>
          </table>
        </div>
        <Badge tone={cro.cierra ? 'ok' : 'bad'}>{cro.cierra ? `Saldo al terminar el cronograma: ${sol(cro.filas[cro.filas.length - 1].saldoFinal)}. Esto no significa que las cuotas ya estén pagadas.` : `El cronograma no cierra en ${sol(D(0))}`}</Badge>
      </>)}
    </>);
}
