import './cliente-formulario.css';
import { useSalidaFormulario } from '../useSalidaFormulario';
import './operaciones.css';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { pct7 } from '../format';
import { Field, Head, CreditMeter, Badge } from '../components/ui';
import { ConfirmDialog, PasswordInput, SearchField } from '../components/overlays';
import { convertirTasas } from '../../../contexts/credit-origination/dominio/motor';
import type { Cliente } from '../../../contexts/customer-management/dominio/modelos';
import { D } from '../../../shared/dominio/decimal';
import { validarCliente } from '../../../contexts/customer-management/dominio/validaciones';
import { correoValido, telefono } from '../../../shared/dominio/validaciones';
import { api } from '../api';
const nuevo = (): Cliente => ({ id: -1, nombre: '', tipoDoc: 'DNI', doc: '', direccion: '', telefono: '', correo: '', activo: true, horaCorte: '23:59', limite: '5000', deuda: '0', diaCorte: 20, diaPago: 26, plazo: 6, moneda: 'PEN', tipoC: 'Nominal', valC: '24', capC: 'Diaria', tipoM: 'Nominal', valM: '36', capM: 'Diaria' });
export function Clientes() {
    const { clientes, guardarCliente, deudaDe } = useStore();
    const [f, setF] = useState<Cliente>(() => clientes[0] ?? nuevo());
    const [q, setQ] = useState('');
    const [clave, setClave] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [ocupado, setOcupado] = useState(false);
    const [abierto, setAbierto] = useState(false);
    const [confirmar, setConfirmar] = useState<Cliente | null>(null);
    const [guardado, setGuardado] = useState<Cliente | null>(null);
    const [pagina, setPagina] = useState(0);
    const [entradaInvalida, setEntradaInvalida] = useState<Record<string, string>>({});
    const [accesos, setAccesos] = useState<{ clienteId: number; creada: boolean; habilitada: boolean }[] | null>(null);
    const [errorAcceso, setErrorAcceso] = useState('');
    useEffect(() => {
        let vigente = true;
        api<NonNullable<typeof accesos>>('accesos-clientes').then(datos => {
            if (vigente) { setAccesos(datos); setErrorAcceso(''); }
        }).catch(() => {
            if (vigente) { setAccesos(null); setErrorAcceso('No se pudo consultar el estado de acceso.'); }
        });
        return () => { vigente = false; };
    }, [clientes]);
    const acceso = accesos?.find(a => a.clienteId === f.id);
    const [tocados, setTocados] = useState<string[]>([]);
    const titulo = useRef<HTMLHeadingElement>(null);
    const origen = useRef('');
    useEffect(() => { if (abierto) titulo.current?.focus(); else if (origen.current) document.getElementById(origen.current)?.focus(); }, [abierto]);
    const inicial = useRef<Cliente>(f);
    const salida = useSalidaFormulario(abierto && (JSON.stringify(f) !== JSON.stringify(inicial.current) || clave !== ''));
    const abrir = (boton: HTMLButtonElement, cliente = nuevo()) => {
        origen.current = boton.id;
        inicial.current = cliente;
        setF(cliente); setClave(''); setMensaje(''); setTocados([]); setEntradaInvalida({}); setGuardado(null); setAbierto(true);
    };
    const volver = () => setAbierto(false);
    const revisar = (campo: string) => setTocados(lista => lista.includes(campo) ? lista : [...lista, campo]);
    const errorCampo = (campo: string) => {
        if (entradaInvalida[campo]) return entradaInvalida[campo];
        if (!tocados.includes(campo)) return '';
        if (campo === 'nombre' && !f.nombre.trim()) return 'Escribe el nombre o razón social del cliente.';
        if (campo === 'doc' && !new RegExp(`^\\d{${f.tipoDoc === 'DNI' ? 8 : 11}}$`).test(f.doc)) return `Escribe ${f.tipoDoc === 'DNI' ? 8 : 11} dígitos.`;
        if (campo === 'doc' && clientes.some(c => c.id !== f.id && c.doc === f.doc)) return 'Este documento ya está registrado.';
        if (campo === 'correo' && f.correo && !correoValido(f.correo)) return 'Escribe un correo válido.';
        if (campo === 'telefono') { try { telefono(f.telefono); } catch (e) { return (e as Error).message; } }
        return '';
    };
    const cambiarEstado = async (cliente: Cliente) => {
        const baja = cliente.activo !== false;
        setOcupado(true); setMensaje('');
        try { await guardarCliente({ ...cliente, activo: !baja }); setConfirmar(null); setMensaje(baja ? 'Cliente dado de baja. Su historial se conserva.' : 'Cliente reactivado.'); }
        catch (e) { setMensaje((e as Error).message); throw e; }
        finally { setOcupado(false); }
    };
    const set = <K extends keyof Cliente>(k: K, v: Cliente[K]) => setF(x => ({ ...x, [k]: v }));
    const decimal = (k: 'limite' | 'valC' | 'valM', valor: string) => {
        if (!/^\d*(\.\d*)?$/.test(valor)) { setEntradaInvalida(x => ({ ...x, [k]: 'Usa solo números y punto decimal, sin separadores de miles.' })); return; }
        setEntradaInvalida(x => ({ ...x, [k]: '' })); set(k, valor);
    };
    const guardar = async () => { setOcupado(true); setMensaje(''); try {
        setTocados(['nombre', 'doc', 'correo', 'telefono']);
        validarCliente(f, clientes);
        const actualizado = await guardarCliente(f, clave);
        setGuardado(actualizado);
        setMensaje('Cliente guardado.');
        setClave('');
        volver();
    }
    catch (e) {
        setMensaje((e as Error).message);
        const campo = !f.nombre.trim() ? 'c-nombre' : !new RegExp(`^\\d{${f.tipoDoc === 'DNI' ? 8 : 11}}$`).test(f.doc) || clientes.some(c => c.id !== f.id && c.doc === f.doc) ? 'c-doc' : f.correo && !correoValido(f.correo) ? 'c-correo' : null;
        if (campo) document.getElementById(campo)?.focus();
    }
    finally {
        setOcupado(false);
    } };
    const tasa = (tipo: Cliente['tipoC'], valor: string, cap: Cliente['capC']) => { try {
        if (!/^\d+(\.\d+)?$/.test(valor))
            return '—';
        const t = convertirTasas(tipo, valor, cap);
        return `Tasa efectiva diaria (TED) ${pct7(t.ted)} · Tasa efectiva mensual (TEM) ${pct7(t.tem)}`;
    }
    catch {
        return '—';
    } };
    const resultados = clientes.filter(c => `${c.nombre} ${c.doc}`.toLocaleLowerCase('es').includes(q.trim().toLocaleLowerCase('es')));
    const totalPaginas = Math.max(1, Math.ceil(resultados.length / 20));
    const actual = Math.min(pagina, totalPaginas - 1);
    const visibles = resultados.slice(actual * 20, (actual + 1) * 20);
    return <>
    {salida.dialogo}
    {!abierto && <Head title="Clientes" sub="Datos generales, acceso y condiciones de crédito de cada cliente.">{!abierto && <button id="nuevo-cliente" className="btn pri" disabled={ocupado} onClick={e => abrir(e.currentTarget)}>Nuevo cliente</button>}</Head>}
    <div>
      {!abierto && <section className="card"><SearchField id="buscar" label="Buscar cliente" placeholder="Nombre o documento" value={q} onChange={v => { setQ(v); setPagina(0); }}/>
        <p className="sub" role="status">{resultados.length} clientes{q.trim() ? ' que coinciden con la búsqueda' : ' registrados'}.</p>
        {visibles.map(c => <div key={c.id} className="list-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div><strong>{c.nombre}</strong><br/><small>{c.tipoDoc} {c.doc}</small> <Badge tone={c.activo === false ? 'warn' : 'ok'}>{c.activo === false ? 'De baja' : 'Activo'}</Badge></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button id={`editar-cliente-${c.id}`} className="btn sm" disabled={ocupado} aria-label={`Editar ${c.nombre}`} onClick={e => abrir(e.currentTarget, c)}>Editar</button>
            <button className="btn sm" disabled={ocupado} aria-label={`${c.activo === false ? 'Reactivar' : 'Dar de baja a'} ${c.nombre}`} onClick={() => { setMensaje(''); setConfirmar(c); }}>{c.activo === false ? 'Reactivar' : 'Dar de baja'}</button>
          </div>
        </div>)}
        {!clientes.length && <p className="sub">Aún no hay clientes en esta tienda.</p>}
        {!!clientes.length && !resultados.length && <div className="empty">No hay clientes que coincidan. <button className="btn" onClick={() => { setQ(''); setPagina(0); }}>Limpiar búsqueda</button></div>}
        {totalPaginas > 1 && <nav className="actions" aria-label="Páginas de clientes"><button className="btn" disabled={actual === 0} onClick={() => setPagina(actual - 1)}>Anterior</button><span>Página {actual + 1} de {totalPaginas}</span><button className="btn" disabled={actual + 1 >= totalPaginas} onClick={() => setPagina(actual + 1)}>Siguiente</button></nav>}
      </section>}
      {abierto && <button type="button" className="btn ops-back" disabled={ocupado} onClick={() => salida.pedirSalida(volver)}><span aria-hidden="true">←</span> Volver a clientes</button>}
      {abierto && <section className="card ops-editor cliente-editor">

        <h1 ref={titulo} tabIndex={-1}>{f.id < 0 ? 'Registrar cliente' : f.nombre} <Badge tone={f.activo === false ? 'warn' : 'ok'}>{f.activo === false ? 'De baja' : 'Activo'}</Badge></h1>
        <p className="sub">Nombre y documento son obligatorios. Las condiciones del crédito deben corresponder a lo pactado con el cliente.</p>
        {f.id < 0 && <p className="sub">Los valores de crédito, corte, pago, plazo y tasas son valores iniciales sugeridos. Revísalos antes de guardar.</p>}
        {f.id >= 0 && f.activo !== false && <p><a className="btn" href={`#/venta?cliente=${f.id}`}>Registrar venta a este cliente</a></p>}
        {f.id >= 0 && <CreditMeter divisa={f.moneda} limite={/^\d+(\.\d+)?$/.test(f.limite) ? D(f.limite) : D(0)} deudaActual={deudaDe(f)}/>}
        <div className="form-grid">
          <h3 className="cliente-seccion">Identificación</h3>
          <Field id="c-nombre" label="Nombre o razón social (obligatorio)" error={errorCampo('nombre')} helpText="Identificación completa del cliente."><input id="c-nombre" className="in" maxLength={120} required onBlur={() => revisar('nombre')} aria-invalid={!!errorCampo('nombre')} aria-describedby={errorCampo('nombre') ? 'c-nombre-tip c-nombre-err' : 'c-nombre-tip'} value={f.nombre} onChange={e => set('nombre', e.currentTarget.value)}/></Field>
          <Field id="c-tipo" label="Tipo de documento" helpText="DNI: 8 dígitos. RUC: 11 dígitos."><select id="c-tipo" className="in" value={f.tipoDoc} onChange={e => set('tipoDoc', e.currentTarget.value as Cliente['tipoDoc'])}><option>DNI</option><option>RUC</option></select></Field>
          <Field id="c-doc" label="Documento de identidad (obligatorio)" error={errorCampo('doc')} helpText="Solo dígitos. No puede repetirse dentro de la tienda."><input id="c-doc" className="in" inputMode="numeric" required maxLength={f.tipoDoc === 'DNI' ? 8 : 11} onBlur={() => revisar('doc')} aria-invalid={!!errorCampo('doc')} aria-describedby={errorCampo('doc') ? 'c-doc-tip c-doc-err' : 'c-doc-tip'} value={f.doc} onChange={e => { if (/^\d*$/.test(e.currentTarget.value)) set('doc', e.currentTarget.value); }}/></Field>
          <h3 className="cliente-seccion">Contacto</h3>
          {(['direccion', 'telefono', 'correo'] as const).map(k => <Field key={k} id={`c-${k}`} label={{ direccion: 'Dirección', telefono: 'Teléfono', correo: 'Correo del cliente' }[k]} error={errorCampo(k)} helpText={k === 'correo' ? 'Opcional. Si registra correo y contraseña inicial, el cliente podrá consultar su propia cuenta.' : 'Dato de contacto opcional.'}><input id={`c-${k}`} className="in" type={k === 'correo' ? 'email' : k === 'telefono' ? 'tel' : 'text'} maxLength={k === 'direccion' ? 200 : k === 'telefono' ? 20 : 100} onBlur={() => revisar(k)} aria-invalid={!!errorCampo(k)} aria-describedby={errorCampo(k) ? `c-${k}-tip c-${k}-err` : `c-${k}-tip`} value={f[k] ?? ''} onChange={e => set(k, e.currentTarget.value)}/></Field>)}
          <div className="form-section" style={{ gridColumn: '1 / -1' }}><h3>Acceso del cliente</h3><p className="sub">Permite consultar únicamente su propia cuenta y cronograma.</p></div>
          {acceso?.creada ? <div>
            <Badge tone={acceso.habilitada ? 'ok' : 'warn'}>{acceso.habilitada ? 'Acceso habilitado' : 'Acceso suspendido'}</Badge>
            <p className="sub">El cliente cambia su contraseña desde Mi cuenta. La baja suspende el acceso.</p>
          </div> : <Field id="c-clave" label="Contraseña inicial de acceso" helpText="Permite que el cliente ingrese con su correo para consultar su propia cuenta. Úsala solo al habilitar su acceso por primera vez. Debe tener entre 8 y 64 caracteres, letras y números.">
            {errorAcceso && <p role="status">{errorAcceso}</p>}
            <PasswordInput id="c-clave" autoComplete="new-password" value={clave} onChange={e => setClave(e.currentTarget.value)}/>
          </Field>}
          <Field id="c-estado" label="Estado del cliente" helpText="La baja bloquea nuevas ventas y el acceso del cliente, conservando deudas, pagos e historial."><select id="c-estado" className="in" value={String(f.activo !== false)} onChange={e => set('activo', e.currentTarget.value === 'true')}><option value="true">Activo</option><option value="false">De baja</option></select></Field>
          <div className="form-section" style={{ gridColumn: '1 / -1' }}><h3>Condiciones de crédito</h3><p className="sub">La línea es el máximo autorizado, no dinero ya prestado.</p></div>
          <Field id="limite" label="Línea de crédito autorizada" help="limite" error={errorCampo('limite')}><input id="limite" className="in" inputMode="decimal" aria-invalid={!!errorCampo('limite')} aria-describedby={errorCampo('limite') ? 'limite-tip limite-err' : 'limite-tip'} value={f.limite} onChange={e => decimal('limite', e.currentTarget.value)}/></Field>
          <Field id="moneda" label="Moneda" help="moneda"><select id="moneda" className="in" value={f.moneda} onChange={e => set('moneda', e.currentTarget.value as Cliente['moneda'])}><option value="PEN">Soles (PEN)</option><option value="USD">Dólares (USD)</option></select></Field>
          {([['plazo', 'Máximo de cuotas permitido (meses)', 'plazo'], ['diaCorte', 'Día mensual de corte', 'corte'], ['diaPago', 'Día mensual de pago', 'pago']] as const).map(([k, label, help]) => <Field key={k} id={k} label={label} help={help}>{k === 'plazo' ? <input id={k} className="in" type="number" min={1} max={12} step={1} value={f[k]} onChange={e => set(k, Number(e.currentTarget.value))}/> : <><select id={k} className="in" value={f[k]} onChange={e => set(k, Number(e.currentTarget.value))}>{Array.from({ length: k === 'diaPago' ? 31 : 30 }, (_, i) => i + 1).map(dia => <option key={dia} value={dia}>{dia}</option>)}</select><small className="sub">De cada mes. En meses más cortos se ajusta al último día.</small></>}</Field>)}
          <Field id="horaCorte" label="Hora de corte" helpText="Hora local de Perú. En el día de corte, las compras hasta esta hora pertenecen al ciclo actual; las posteriores, al siguiente."><input id="horaCorte" className="in" type="time" value={f.horaCorte ?? '23:59'} onInput={e => set('horaCorte', e.currentTarget.value)}/></Field>
        </div>
        {(['C', 'M'] as const).map(t => <section key={t} className="card"><h3>Tasa {t === 'C' ? 'compensatoria' : 'moratoria'}</h3><p className="sub">{t === 'C' ? 'Es el costo del crédito durante el plazo acordado.' : 'Se aplica cuando el pago se realiza después de su vencimiento.'}</p><div className="form-grid">
          <Field id={`tipo${t}`} label={`Tipo de tasa ${t === 'C' ? 'compensatoria' : 'moratoria'}`} help={`tipo${t}`}><select id={`tipo${t}`} className="in" value={f[`tipo${t}`]} onChange={e => set(`tipo${t}`, e.currentTarget.value as Cliente['tipoC'])}><option>Nominal</option><option>Efectiva</option></select></Field>
          <Field id={`val${t}`} label={`Valor anual ${t === 'C' ? 'compensatorio' : 'moratorio'}, %`} help={`val${t}`} error={errorCampo(`val${t}`)}><input id={`val${t}`} className="in" inputMode="decimal" aria-invalid={!!errorCampo(`val${t}`)} aria-describedby={errorCampo(`val${t}`) ? `val${t}-tip val${t}-err` : `val${t}-tip`} value={f[`val${t}`]} onChange={e => decimal(`val${t}`, e.currentTarget.value)}/></Field>
          {f[`tipo${t}`] === 'Nominal' && <Field id={`cap${t}`} label={`Capitalización ${t === 'C' ? 'compensatoria' : 'moratoria'}`} help="cap"><select id={`cap${t}`} className="in" value={f[`cap${t}`]} onChange={e => set(`cap${t}`, e.currentTarget.value as Cliente['capC'])}><option>Diaria</option><option>Mensual</option></select></Field>}
        </div><p className="sub num">{tasa(f[`tipo${t}`], f[`val${t}`], f[`cap${t}`])}</p></section>)}
        <div className="actions"><button className="btn" disabled={ocupado} onClick={() => salida.pedirSalida(volver)}>Cancelar</button><button className="btn pri" disabled={ocupado} onClick={guardar}>{ocupado ? 'Guardando…' : 'Guardar cliente'}</button></div>
      </section>}
      {mensaje && <p className={mensaje === 'Cliente guardado.' || mensaje === 'Cliente reactivado.' || mensaje.startsWith('Cliente dado de baja.') ? 'toast' : 'notice'} role={mensaje === 'Cliente guardado.' || mensaje === 'Cliente reactivado.' || mensaje.startsWith('Cliente dado de baja.') ? 'status' : 'alert'}>{mensaje}</p>}
      {!abierto && guardado && guardado.activo !== false && <div className="actions"><a className="btn pri" href={`#/venta?cliente=${guardado.id}`}>Registrar venta a {guardado.nombre}</a></div>}
    </div>
    <ConfirmDialog open={!!confirmar} title={`${confirmar?.activo === false ? 'Reactivar' : 'Dar de baja a'} ${confirmar?.nombre ?? 'cliente'}`} confirmLabel={confirmar?.activo === false ? 'Reactivar cliente' : 'Dar de baja'} busy={ocupado} onClose={() => setConfirmar(null)} onConfirm={async () => { if (confirmar) await cambiarEstado(confirmar); }}>
      <p>{confirmar?.activo === false ? 'Podrá volver a comprar y acceder a su cuenta si tiene acceso habilitado.' : 'Se bloquearán las nuevas ventas y el acceso. Las deudas, los pagos y el historial se conservan.'}</p>
    </ConfirmDialog>
  </>;
}
