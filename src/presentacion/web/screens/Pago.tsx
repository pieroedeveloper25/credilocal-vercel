import './cuenta-consulta.css';
import { ClientPicker } from '../components/overlays';
import { useState } from 'react';
import { useStore } from '../store';
import { num, sol as dinero } from '../format';
import { Badge, Field, Head, Money, Tick, idx, tipId } from '../components/ui';
import { imputarPorPrelacion } from '../../../contexts/billing-and-collections/dominio/prelacion';
import { decimalEntrada } from '../../../shared/dominio/validaciones';
import { D } from '../../../shared/dominio/decimal';
import { fechaPagoPeriodo, fmtFecha, parseFecha, relojPeru } from '../../../shared/dominio/fechas';
export function Pago() {
    const { clientes } = useStore();
    const [ci, setCi] = useState(() => Number(new URLSearchParams(window.location.hash.split('?')[1]).get('cliente') ?? -1));
    const cl = clientes.find(c => c.id === ci);
    return <div className="cuenta-consulta">
      <Head title="Registrar pago"/>
      <div className="card cuenta-selector">{!cl && <div><h2>Elige de quién recibiste el pago</h2><p className="sub">Después de elegir al cliente, revisa el período, la fecha del abono y el importe que corresponde cobrar.</p></div>}
        <ClientPicker id="liq" label="Cliente que realiza el pago" clientes={clientes} value={ci} onChange={setCi} includeInactive/>
      </div>
      {cl && <PagoCliente key={cl.id} cl={cl}/>}
    </div>;
}

function PagoCliente({ cl }: { cl: ReturnType<typeof useStore>['clientes'][number] }) {
    const { pagos, liquidarDe, registrarCobro } = useStore();
    const [periodo, setPeriodo] = useState(() => {
        const mes = new URLSearchParams(window.location.hash.split('?')[1]).get('periodo');
        return mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : relojPeru().slice(0, 7);
    });
    const [fr, setFr] = useState('');
    const [hora, setHora] = useState('');
    const [abono, setAbono] = useState<string | null>(null);
    const [hecho, setHecho] = useState<string | null>(null);
    const [ocupado, setOcupado] = useState(false);
    const [error, setError] = useState('');
    const [resumen, setResumen] = useState<ReturnType<typeof liquidarDe> | null>(null);
    const sol = (d: Parameters<typeof dinero>[0]) => dinero(d, cl.moneda);
    const prevista = fechaPagoPeriodo(periodo, cl.diaPago);
    const defFr = relojPeru().slice(0, 10);
    const frEf = fr || defFr;
    const horaEfectiva = hora || (frEf === defFr ? relojPeru().slice(11, 16) : '23:59');
    let calculo: ReturnType<typeof liquidarDe>;
    let errorFecha = '';
    try {
        calculo = liquidarDe(cl, periodo, frEf);
    }
    catch (e) {
        errorFecha = (e as Error).message;
        calculo = { lineas: [], capital: D(0), comp: D(0), mora: D(0), total: D(0), vencimiento: parseFecha(prevista), diasMora: 0 };
    }
    const liq = hecho && resumen ? resumen : calculo;
    const yaPagado = !liq.lineas.length && pagos.some(p => p.clienteId === cl.id && p.periodo === periodo);
    const txt = abono ?? liq.total.toFixed(2);
    const formatoValido = decimalEntrada(txt, 10, 2);
    const monto = formatoValido ? D(txt) : D(0);
    const pr = imputarPorPrelacion(monto, liq.mora, liq.comp, liq.capital);
    const imp = pr.mora.plus(pr.comp).plus(pr.cap);
    const igual = monto.eq(liq.total);
    const menor = monto.lt(liq.total);
    const futura = `${frEf}T${horaEfectiva}` > relojPeru();
    const anteriorACompra = liq.lineas.some(l => `${frEf}T${horaEfectiva}` < `${l.fechaCompra}T${l.hora}`);
    const monedaIncompatible = liq.lineas.some(l => l.moneda !== cl.moneda);
    const bloqueado = monedaIncompatible || anteriorACompra || futura || !igual || !formatoValido || !!hecho || yaPagado || ocupado || liq.total.lte(0) || !!errorFecha;
    const filas = [
        ['1.°', 'Interés moratorio', liq.mora, pr.mora],
        ['2.°', 'Interés compensatorio', liq.comp, pr.comp],
        ['3.°', 'Capital principal', liq.capital, pr.cap],
    ] as const;
    const msg = !formatoValido ? 'Escribe un importe con hasta dos decimales usando punto.' : liq.total.isZero() ? 'Este cliente no tiene deuda pendiente en el período seleccionado.' : igual ? 'El abono cubre el total exigible.' : menor ? `Falta ${sol(liq.total.minus(monto))}. No se admiten pagos parciales al vencimiento.` : `El abono excede la deuda en ${sol(monto.minus(liq.total))}.`;
    const registrar = async () => {
        if (bloqueado)
            return;
        setOcupado(true);
        setError('');
        try {
            const pago = await registrarCobro({ clienteId: cl.id, periodo, fecha: frEf, hora: horaEfectiva, abono: txt });
            setFr(frEf);
            setHora(horaEfectiva);
            setResumen(liq);
            setHecho(pago.constancia);
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setOcupado(false);
        }
    };
    return (<>
      <>{error && <p role="alert" className="notice">{error}</p>}</>

      <div className="card grid rv" style={{ ...idx(1), gridTemplateColumns: '1.4fr 1fr 1fr', alignItems: 'end' }}>
        <Field id="periodoPago" label="Período a pagar" helpText="Mes de vencimiento de la deuda. Puede ser anterior al mes en que recibes el abono."><input id="periodoPago" disabled={ocupado} className="in" type="month" value={periodo} onInput={e => { setPeriodo(/^\d{4}-(0[1-9]|1[0-2])$/.test(e.currentTarget.value) ? e.currentTarget.value : relojPeru().slice(0, 7)); setAbono(null); setHecho(null); setError(''); }}/></Field>
        <div><div className="lbl">Vencimiento del período</div><div className="num" style={{ height: 42, display: 'flex', alignItems: 'center', fontSize: 16 }}>{fmtFecha(liq.vencimiento)}</div></div>
        <Field id="fr" label="Fecha real de pago" help="fechaReal"><input id="fr" className="in num" type="date" value={frEf} onInput={(e) => { setFr(e.currentTarget.value); setAbono(null); }} disabled={!!hecho || ocupado} aria-describedby={tipId('fr')}/></Field>
        <Field id="horaPago" label="Hora real de pago" helpText="Hora de Perú; permite distinguir pagos anteriores y posteriores al corte. En registros antiguos sin hora se considera 23:59."><input id="horaPago" className="in" type="time" value={horaEfectiva} onChange={e => setHora(e.currentTarget.value)} disabled={!!hecho || ocupado}/></Field>
        <div style={{ gridColumn: '1 / -1' }}><p className="sub">Deudas del período {periodo} calculadas al {fmtFecha(parseFecha(frEf))}. Si cobras después del vencimiento, también se incluyen las deudas vencidas hasta la fecha del abono.</p>{liq.lineas.length > 0 && <Badge tone={liq.diasMora > 0 ? 'warn' : 'ok'}>{liq.diasMora > 0 ? `Atraso máximo: ${liq.diasMora} días` : 'Pago en plazo, sin mora'}</Badge>}</div>
      </div>

      {futura && <p className="notice" role="alert">Para registrar el abono, elige una fecha y hora que ya hayan pasado o la hora actual.</p>}
      {anteriorACompra && <p className="notice" role="alert">La fecha y hora del abono deben ser posteriores o iguales a las de las compras incluidas.</p>}
      {monedaIncompatible && <p className="notice" role="alert">La moneda de las operaciones difiere de la cuenta. Revisa la moneda pactada antes de cobrar.</p>}
      {errorFecha && <p role="alert" className="notice">{errorFecha}</p>}
      {!errorFecha && liq.total.isZero() && <p className="toast" role="status">Sin compras o cuotas pendientes para este período.</p>}
      <div className="card table-scroll" tabIndex={0} role="region" aria-label="Compras y cuotas incluidas en el pago"><table className="tbl"><caption>Compras y cuotas incluidas en el pago</caption><thead><tr><th>Compra / cuota</th><th>Vence</th><th>Días de atraso</th><th>Capital</th><th>Interés</th><th>Mora</th><th>Total</th></tr></thead><tbody>{liq.lineas.map(l => <tr key={l.id}><td>{l.detalle}{l.cuota ? ` · cuota ${l.cuota}` : ''}</td><td>{fmtFecha(parseFecha(l.vencimiento))}</td><td>{l.diasMora}</td><td>{sol(D(l.capital))}</td><td>{sol(D(l.comp))}</td><td>{sol(D(l.mora))}</td><td>{sol(D(l.total))}</td></tr>)}</tbody></table></div>

      <div className="card flat rv" style={idx(2)}>
        <div style={{ padding: '16px 20px', fontWeight: 600 }}>Cómo se aplica el pago</div>
        <table className="tbl">
          <caption className="sr">Desglose por prelación legal</caption>
          <thead><tr><th scope="col">Orden</th><th scope="col">Concepto</th><th scope="col" className="r">Deuda</th><th scope="col" className="r">Aplicado al pago</th><th scope="col" className="r">Saldo</th></tr></thead>
          <tbody>{filas.map(([o, t, d, i], k) => {
            const s = d.minus(i);
            return (<tr key={o} className="row-in" style={idx(k)}><td className="num" style={{ color: 'var(--muted)' }}>{o}</td><td style={{ fontWeight: 500 }}>{t}</td><td className="r num">{num(d)}</td><td className="r"><Tick value={num(i)}/></td><td className="r"><Tick value={num(s)} className={s.gt(0) ? '' : ''}/></td></tr>);
        })}</tbody>
          <tfoot><tr><td /><td>Deuda total</td><td className="r num">{num(liq.total)}</td><td className="r num">{num(imp)}</td><td className="r num">{num(pr.saldo)}</td></tr></tfoot>
        </table>
      </div>

      <div className="rv" style={{ ...idx(3), display: 'flex', gap: 20, alignItems: 'stretch', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 'min(300px, 100%)' }}>
          <Field id="abono" label="Monto recibido" help="abono" error={igual && formatoValido ? '' : msg}>
            <input id="abono" className={`in num${igual ? '' : ' err'}`} style={{ fontSize: 22, height: 54 }} inputMode="decimal" value={txt} onChange={(e) => setAbono(e.currentTarget.value)} disabled={!!hecho || ocupado} aria-invalid={!igual || !formatoValido} aria-describedby={tipId('abono')}/>
          </Field>
          {igual && formatoValido && <div style={{ color: 'var(--ok)', marginTop: 8, fontSize: 13 }} aria-live="polite">{msg}</div>}
        </div>
        <div className="card" style={{ flex: 1, minWidth: 'min(300px, 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span className="lbl" style={{ margin: 0 }}>Estado resultante</span><Badge tone={pr.saldo.isZero() ? 'ok' : 'warn'}>{pr.saldo.isZero() ? (liq.total.isZero() ? 'Sin deuda pendiente' : 'Saldo después del pago') : 'Saldo pendiente'}</Badge></div>
          <div style={{ fontSize: 30, fontWeight: 500, letterSpacing: '-0.02em' }}>Saldo <Money divisa={cl.moneda} value={pr.saldo}/></div>
          {hecho && <div className="toast" role="status">Constancia {hecho} emitida.</div>}
          {yaPagado && !hecho && <div className="toast warn" role="status">Este cliente ya tiene un pago registrado.</div>}
        </div>
      </div>

      <div className="actions" style={{ justifyContent: 'space-between' }}>
        <a className="btn" href={`#/estado?cliente=${cl.id}&periodo=${periodo}`}>Volver al estado de cuenta</a>
        <button type="button" className="btn pri" style={{ height: 48, padding: '0 30px' }} disabled={bloqueado} aria-busy={ocupado} onClick={registrar}>{ocupado ? 'Registrando…' : 'Registrar pago'}</button>
      </div>
    </>);
}
