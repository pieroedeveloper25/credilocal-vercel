import { useSalidaFormulario } from '../useSalidaFormulario';
import './operaciones.css';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { D } from '../../../shared/dominio/decimal';
import { num } from '../format';
import { Field, Head, Badge } from '../components/ui';
import { ConfirmDialog, SearchField } from '../components/overlays';
import { validarProducto } from '../../../contexts/product-catalog/dominio/validaciones';
import { CreditoFoto } from '../components/CreditoFoto';
import type { Producto } from '../../../contexts/product-catalog/dominio/modelos';
const nuevo = (): Producto => ({ sku: '', nombre: '', unidad: 'UNIDAD', marca: '', proveedor: '', descripcion: '', imagen: '', contado: '', credito: '', modalidad: 'Ambas', activo: true });
export function Catalogo() {
    const { productos, agregarProducto } = useStore();
    const [f, setF] = useState<Producto>(nuevo);
    const [abierto, setAbierto] = useState(false);
    const [editando, setEditando] = useState(false);
    const [detalleSku, setDetalleSku] = useState('');
    const detalle = productos.find(p => p.sku === detalleSku);
    const tituloDetalle = useRef<HTMLHeadingElement>(null);
    const posicionLista = useRef(0);
    const retornoLista = useRef('');
    useEffect(() => {
        if (abierto) return;
        if (detalleSku) { tituloDetalle.current?.focus(); return; }
        if (retornoLista.current) {
            document.getElementById(retornoLista.current)?.focus({ preventScroll: true });
            window.scrollTo(0, posicionLista.current);
            retornoLista.current = '';
        }
    }, [abierto, detalleSku]);
    const verDetalle = (p: Producto) => {
        posicionLista.current = window.scrollY;
        retornoLista.current = 'ficha-' + p.sku;
        setMensaje('');
        setDetalleSku(p.sku);
    };
    const [q, setQ] = useState('');
    const [fm, setFm] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [ocupado, setOcupado] = useState(false);
    const [confirmar, setConfirmar] = useState(false);
    const [pagina, setPagina] = useState(0);
    const [errores, setErrores] = useState<Record<string, string>>({});
    const [leyendo, setLeyendo] = useState(false);
    const [errorImagen, setErrorImagen] = useState('');
    const [nombreImagen, setNombreImagen] = useState('');
    const lectura = useRef(0);
    const tituloFormulario = useRef<HTMLHeadingElement>(null);
    const botonOrigen = useRef('');
    useEffect(() => () => { lectura.current++; }, []);
    useEffect(() => { if (abierto) tituloFormulario.current?.focus(); else if (botonOrigen.current) document.getElementById(botonOrigen.current)?.focus(); }, [abierto]);
    const inicial = useRef<Producto>(f);
    const salida = useSalidaFormulario(abierto && (JSON.stringify(f) !== JSON.stringify(inicial.current) || leyendo));
    const abrir = (origen: HTMLButtonElement, producto?: Producto) => {
        botonOrigen.current = origen.id;
        lectura.current++;
        setLeyendo(false);
        setErrorImagen('');
        setNombreImagen('');
        inicial.current = producto ?? nuevo();
        setF(inicial.current);
        setEditando(!!producto);
        setAbierto(true);
        setMensaje('');
        setErrores({});
    };
    const cancelar = () => {
        lectura.current++;
        setLeyendo(false);
        setAbierto(false);
        setMensaje('');
    };
    const set = <K extends keyof Producto>(k: K, v: Producto[K]) => setF(x => ({ ...x, [k]: v }));
    const precio = (k: 'contado' | 'credito', valor: string) => {
        if (!/^\d*(\.\d*)?$/.test(valor)) { setErrores(x => ({ ...x, [k]: 'Usa números y punto decimal, sin separadores de miles.' })); return; }
        setErrores(x => ({ ...x, [k]: '' })); set(k, valor);
    };
    const revisarPrecio = (k: 'contado' | 'credito') => {
        const valor = f[k];
        const error = !/^\d{1,10}(\.\d{1,2})?$/.test(valor) || !D(valor || 0).gt(0) ? 'Escribe un precio positivo con hasta dos decimales.' : k === 'credito' && /^\d+(\.\d+)?$/.test(f.contado) && D(valor).lt(f.contado) ? 'El precio crédito debe ser mayor o igual al contado.' : '';
        setErrores(x => ({ ...x, [k]: error }));
    };
    const guardar = async () => { if (!f.imagen) { setMensaje('Adjunte una imagen JPG o PNG.'); return; } setOcupado(true); setMensaje(''); try {
        const registro = { ...f, sku: editando ? f.sku : `P-${crypto.randomUUID()}` };
        validarProducto(registro);
        await agregarProducto(registro);
        setMensaje('Producto guardado.');
        setAbierto(false);
        setConfirmar(false);
        setDetalleSku(registro.sku);
    }
    catch (e) {
        setMensaje((e as Error).message);
        revisarPrecio('contado'); revisarPrecio('credito');
        document.getElementById(!f.nombre.trim() ? 'p-nombre' : !f.descripcion?.trim() ? 'p-descripcion' : !/^\d{1,10}(\.\d{1,2})?$/.test(f.contado) ? 'p-contado' : 'p-credito')?.focus();
    }
    finally {
        setOcupado(false);
    } };
    const imagen = async (archivo?: File) => {
        if (!archivo)
            return;
        const solicitud = ++lectura.current;
        setErrorImagen('');
        if (!['image/png', 'image/jpeg'].includes(archivo.type) || archivo.size > 2 * 1024 * 1024) {
            setLeyendo(false);
            setErrorImagen(!['image/png', 'image/jpeg'].includes(archivo.type)
                ? 'Formato no admitido. Elige una imagen JPG o PNG.'
                : 'La imagen supera 2 MB. Reduce su tamaño o elige otro archivo.');
            return;
        }
        setLeyendo(true);
        try {
            const url = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => reject(new Error('No se pudo leer la imagen.')); r.readAsDataURL(archivo); });
            await new Promise<void>((resolve, reject) => { const im = new Image(); im.onload = () => resolve(); im.onerror = () => reject(new Error('El archivo no es una imagen válida.')); im.src = url; });
            if (solicitud === lectura.current) {
                setF(x => ({ ...x, imagen: url, imagenCredito: undefined }));
                setNombreImagen(archivo.name);
            }
        }
        catch (e) {
            if (solicitud === lectura.current) setErrorImagen((e as Error).message);
        }
        finally {
            if (solicitud === lectura.current) setLeyendo(false);
        }
    };
    const filas = productos.filter(p => `${p.nombre} ${p.sku}`.toLocaleLowerCase('es').includes(q.trim().toLocaleLowerCase('es')) && (!fm || p.modalidad === fm || p.modalidad === 'Ambas'));
    const totalPaginas = Math.max(1, Math.ceil(filas.length / 20));
    const actual = Math.min(pagina, totalPaginas - 1);
    const visibles = filas.slice(actual * 20, (actual + 1) * 20);
    return <>
    {salida.dialogo}
    <Head title="Catálogo" sub="Productos y servicios, precios y modalidades de crédito.">{!abierto && !detalle && <button id="nuevo-producto" className="btn pri" disabled={ocupado} onClick={e => abrir(e.currentTarget)}>Nuevo producto</button>}</Head>
    {abierto && <section className="card ops-editor"><button className="btn ops-back" disabled={ocupado} onClick={() => salida.pedirSalida(cancelar)}><span aria-hidden="true">←</span> {detalle ? 'Volver al producto' : 'Volver al catálogo'}</button><h2 ref={tituloFormulario} tabIndex={-1}>{editando ? 'Editar producto' : 'Nuevo producto'}</h2><p className="sub">Nombre, descripción, unidad, imagen y precios son obligatorios.</p><div className="form-grid">
      {([['nombre', 'Nombre', 'Denominación del producto o servicio.'], ['marca', 'Marca', 'Fabricante, si corresponde.'], ['proveedor', 'Proveedor', 'Empresa que lo suministra, si corresponde.']] as const).map(([k, label, help]) => <Field key={k} id={`p-${k}`} label={label} helpText={help}><input id={`p-${k}`} className="in" value={f[k] ?? ''} onChange={e => set(k, e.target.value)}/></Field>)}
      <Field id="p-descripcion" label="Descripción" helpText="Describe las características del producto en hasta 255 caracteres.">
        <textarea id="p-descripcion" className="in" rows={3} maxLength={255} style={{ height: 'auto', paddingBlock: 8, resize: 'vertical' }} value={f.descripcion ?? ''} onChange={e => set('descripcion', e.target.value)}/>
        <small className="sub">{(f.descripcion ?? '').length}/255 caracteres</small>
      </Field>
      <Field id="p-unidad" label="Unidad de medida" helpText="Forma de venta. Seleccione servicio para trabajos o prestaciones."><select id="p-unidad" className="in" value={f.unidad} onChange={e => set('unidad', e.target.value)}>{['UNIDAD', 'GALON', 'LITRO', 'SERVICIO', 'KIT', 'KILO', 'PAQUETE'].map(u => <option key={u}>{u}</option>)}</select></Field>
      <Field id="p-imagen" label="Imagen referencial" helpText="Obligatoria. Elige una imagen JPG o PNG válida de hasta 2 MB. Al editar puedes conservar la imagen existente." error={errorImagen}>
        <div className="selector-imagen">
          <input key={f.sku || 'nuevo'} id="p-imagen" type="file" accept="image/png,image/jpeg" required={!f.imagen} disabled={ocupado} aria-invalid={!!errorImagen} aria-describedby={errorImagen ? 'p-imagen-tip p-imagen-err' : 'p-imagen-tip'} onChange={e => { const archivo = e.currentTarget.files?.[0]; e.currentTarget.value = ''; void imagen(archivo); }}/>
          <span aria-hidden="true" className="btn">Elegir imagen</span>
        </div>
        <p className="sub" role="status" style={{ overflowWrap: 'anywhere' }}>{leyendo ? 'Comprobando imagen…' : nombreImagen || (f.imagen ? 'Imagen actual' : 'Ninguna imagen seleccionada')}</p>
        {f.imagen && <><img src={f.imagen} alt={`Vista previa de ${f.nombre || 'producto'}`} className="product-preview"/><CreditoFoto credito={f.imagenCredito}/></>}
      </Field>
      <Field id="p-contado" label="Precio contado (obligatorio)" help="contado" error={errores.contado}><input id="p-contado" className="in" value={f.contado} inputMode="decimal" required aria-invalid={!!errores.contado} aria-describedby={errores.contado ? 'p-contado-tip p-contado-err' : 'p-contado-tip'} onBlur={() => revisarPrecio('contado')} onChange={e => precio('contado', e.target.value)}/></Field>
      <Field id="p-credito" label="Precio crédito (obligatorio)" help="credito" error={errores.credito}><input id="p-credito" className="in" value={f.credito} inputMode="decimal" required aria-invalid={!!errores.credito} aria-describedby={errores.credito ? 'p-credito-tip p-credito-err' : 'p-credito-tip'} onBlur={() => revisarPrecio('credito')} onChange={e => precio('credito', e.target.value)}/></Field>
      <Field id="p-modalidad" label="Modalidad permitida" help="modalidad"><select id="p-modalidad" className="in" value={f.modalidad} onChange={e => set('modalidad', e.target.value as Producto['modalidad'])}><option>Ambas</option><option>Fin de mes</option><option>Cuotas</option></select></Field>
      <Field id="p-estado" label="Estado del producto" helpText="La baja impide seleccionarlo en nuevas ventas. Sus ventas anteriores permanecen registradas."><select id="p-estado" className="in" value={String(f.activo !== false)} onChange={e => set('activo', e.target.value === 'true')}><option value="true">Activo</option><option value="false">De baja</option></select></Field>
    </div><div className="actions"><button className="btn" disabled={ocupado} onClick={() => salida.pedirSalida(cancelar)}>Cancelar</button><button className="btn pri" disabled={ocupado || leyendo || !f.imagen} onClick={() => editando && detalle && (detalle.activo !== false) !== (f.activo !== false) ? setConfirmar(true) : void guardar()}>{ocupado ? 'Guardando…' : 'Guardar producto'}</button></div>{!f.imagen && <p className="sub">Elige una imagen para habilitar el guardado.</p>}</section>}
    {mensaje && <p role={['Producto guardado.', 'Producto reactivado.', 'Producto dado de baja. Sus ventas anteriores se conservan.'].includes(mensaje) ? 'status' : 'alert'} className={['Producto guardado.', 'Producto reactivado.', 'Producto dado de baja. Sus ventas anteriores se conservan.'].includes(mensaje) ? 'toast' : 'notice'}>{mensaje}</p>}
    {!abierto && detalle && <section className="card ops-editor">
      <button className="btn ops-back" onClick={() => setDetalleSku('')}><span aria-hidden="true">←</span> Volver al catálogo</button>
      <div className="ops-heading"><h2 tabIndex={-1} ref={tituloDetalle}>{detalle.nombre}</h2><button id="editar-ficha" className="btn pri" onClick={e => abrir(e.currentTarget, detalle)}>Editar</button></div>
      <div className="product-detail"><div>{detalle.imagen && <img src={detalle.imagen} alt={detalle.nombre}/>}<CreditoFoto credito={detalle.imagenCredito}/></div>
      <div><Badge tone={detalle.activo === false ? 'warn' : 'ok'}>{detalle.activo === false ? 'De baja' : 'Activo'}</Badge><p>{detalle.descripcion}</p>
      <dl className="catalog-facts">{[['Código', detalle.sku], ['Marca', detalle.marca], ['Unidad', detalle.unidad], ['Proveedor', detalle.proveedor], ['Modalidad', detalle.modalidad], ['Contado', num(D(detalle.contado))], ['A crédito', num(D(detalle.credito))]].filter(([,v]) => v).map(([k,v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></div></div>
    </section>}
    {!abierto && !detalle && <><div className="form-grid"><SearchField id="q" label="Buscar producto" placeholder="Nombre o código SKU" value={q} onChange={v => { setQ(v); setPagina(0); }}/><Field id="fm" label="Filtrar modalidad" helpText="Muestra los productos permitidos en la modalidad seleccionada."><select id="fm" className="in" value={fm} onChange={e => { setFm(e.target.value); setPagina(0); }}><option value="">Todos los productos</option><option value="Fin de mes">Permiten pago único</option><option value="Cuotas">Permiten cuotas</option></select></Field></div>
    <p className="sub" role="status">{filas.length} productos{q.trim() || fm ? ' que coinciden con los filtros' : ' registrados'}. Precios referenciales del catálogo, en la moneda pactada al vender.</p>
    <div className="catalog-grid">{visibles.map(p => <button type="button" id={`ficha-${p.sku}`} className="catalog-card card product-tile" key={p.sku} onClick={() => verDetalle(p)} aria-label={`Ver producto: ${p.nombre}`}>
      {p.imagen ? <img className="catalog-photo" src={p.imagen} alt="" loading="lazy"/> : <span>Imagen pendiente</span>}
      <strong>{p.nombre}</strong><small>{[p.marca, p.unidad].filter(Boolean).join(' · ')}</small>
      {p.activo === false && <Badge tone="warn">De baja</Badge>}
      <span className="product-price">Contado <b>{num(D(p.contado))}</b></span>
      <span className="product-price">A crédito <b>{num(D(p.credito))}</b></span>
    </button>)}</div>
    {!filas.length && <div className="empty">{productos.length ? 'No hay productos que coincidan con estos filtros.' : 'Aún no hay productos. Registra el primero para empezar a vender.'}{!!productos.length && <button className="btn" onClick={() => { setQ(''); setFm(''); setPagina(0); }}>Limpiar filtros</button>}</div>}
    {totalPaginas > 1 && <nav className="actions" aria-label="Páginas de catálogo"><button className="btn" disabled={actual === 0} onClick={() => setPagina(actual - 1)}>Anterior</button><span>Página {actual + 1} de {totalPaginas}</span><button className="btn" disabled={actual + 1 >= totalPaginas} onClick={() => setPagina(actual + 1)}>Siguiente</button></nav>}</>}
    <ConfirmDialog open={confirmar} title={f.activo === false ? 'Dar de baja el producto' : 'Reactivar el producto'} confirmLabel="Confirmar y guardar" busy={ocupado} onClose={() => setConfirmar(false)} onConfirm={guardar}><p>{f.nombre}. {f.activo === false ? 'Su historial se conserva y dejará de estar disponible en nuevas ventas.' : 'Volverá a estar disponible para nuevas ventas.'}</p></ConfirmDialog>
  </>;
}
