import { useState } from 'react';
import { useStore } from '../store';
import { Field, Head } from '../components/ui';
import type { TopeTasa } from '../../../contexts/customer-management/dominio/modelos';
import { validarTope } from '../../../contexts/customer-management/dominio/topes';
import { fmtFecha, parseFecha } from '../../../shared/dominio/fechas';

const NOMBRE = { PEN: 'Soles (PEN)', USD: 'Dólares (US$)' } as const;

export function Topes() {
    const { topes, guardarTope } = useStore();
    const [f, setF] = useState<TopeTasa | null>(null);
    const [mensaje, setMensaje] = useState('');
    const [ocupado, setOcupado] = useState(false);
    const set = (k: keyof TopeTasa, v: string) => setF(x => x && ({ ...x, [k]: v }));
    const guardar = async () => {
        if (!f) return;
        setOcupado(true); setMensaje('');
        try {
            validarTope(f);
            await guardarTope(f);
            setF(null);
            setMensaje('Topes guardados.');
        }
        catch (e) { setMensaje((e as Error).message); }
        finally { setOcupado(false); }
    };
    return <>
    <Head title="Topes de tasas" sub="Tasas efectivas anuales máximas que pueden pactarse con un cliente, según la moneda. Al guardar un cliente se compara su tasa, convertida a efectiva anual, con el tope vigente."/>
    {f && <section className="card">
      <h2>Topes en {NOMBRE[f.moneda]}</h2>
      <div className="form-grid">
        <Field id="tp-comp" label="Tope compensatorio (% efectivo anual)" helpText="Hasta dos decimales."><input id="tp-comp" className="in" inputMode="decimal" value={f.compensatorioMax} onChange={e => set('compensatorioMax', e.target.value)}/></Field>
        <Field id="tp-mora" label="Tope moratorio (% efectivo anual)" helpText="No puede superar al compensatorio."><input id="tp-mora" className="in" inputMode="decimal" value={f.moratorioMax} onChange={e => set('moratorioMax', e.target.value)}/></Field>
        <Field id="tp-vig" label="Vigente desde" helpText="Formato AAAA-MM-DD."><input id="tp-vig" className="in" value={f.vigenteDesde} onChange={e => set('vigenteDesde', e.target.value)}/></Field>
      </div>
      <div className="actions"><button className="btn" disabled={ocupado} onClick={() => setF(null)}>Cancelar</button><button className="btn pri" disabled={ocupado} onClick={guardar}>{ocupado ? 'Guardando…' : 'Guardar topes'}</button></div>
    </section>}
    {mensaje && <p role={mensaje === 'Topes guardados.' ? 'status' : 'alert'} className={mensaje === 'Topes guardados.' ? 'toast' : 'notice'}>{mensaje}</p>}
    {!f && <div className="table-scroll" tabIndex={0} role="region" aria-label="Topes de tasas"><table className="tbl"><caption>Topes vigentes</caption><thead><tr><th>Moneda</th><th>Compensatorio</th><th>Moratorio</th><th>Vigente desde</th><th>Acción</th></tr></thead>
      <tbody>{topes.map(t => <tr key={t.id}><td>{NOMBRE[t.moneda]}</td><td>{t.compensatorioMax} %</td><td>{t.moratorioMax} %</td><td>{fmtFecha(parseFecha(t.vigenteDesde))}</td><td><button className="btn sm" disabled={ocupado} aria-label={`Editar topes en ${NOMBRE[t.moneda]}`} onClick={() => { setMensaje(''); setF(t); }}>Editar</button></td></tr>)}</tbody></table></div>}
  </>;
}
