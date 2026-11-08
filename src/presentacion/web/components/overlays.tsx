import { useEffect, useId, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';

import type { Cliente } from '../../../contexts/customer-management/dominio/modelos';

export function Dialog({ open, title, children, onClose, busy = false, wide = false }: { open: boolean; title: string; children: ReactNode; onClose: () => void; busy?: boolean; wide?: boolean }) {
    const ref = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const close = useRef(onClose); close.current = onClose;
    useEffect(() => {
        const el = ref.current;
        if (!el || !open) return;
        const origin = document.activeElement as HTMLElement | null;
        el.showModal();
        return () => { el.close(); if (origin?.isConnected) origin.focus(); };
    }, [open]);
    if (!open) return null;
    return (<dialog ref={ref} className={`dlg app-dialog${wide ? ' wide' : ''}`} aria-labelledby={titleId} aria-busy={busy} onCancel={e => { e.preventDefault(); if (!busy) close.current(); }}>
      <div className="dialog-heading"><h2 id={titleId}>{title}</h2><button type="button" className="icon-button" aria-label="Cerrar diálogo" disabled={busy} onClick={onClose}>×</button></div>
      {children}
    </dialog>);
}

export function ConfirmDialog({ open, title, children, onConfirm, onClose, busy = false, confirmLabel = 'Confirmar' }: { open: boolean; title: string; children: ReactNode; onConfirm: () => void | Promise<void>; onClose: () => void; busy?: boolean; confirmLabel?: string }) {
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => { if (open) setError(''); }, [open]);
    const confirm = async () => {
        if (sending || busy) return;
        setSending(true); setError('');
        try { await onConfirm(); onClose(); }
        catch (e) { setError((e as Error).message); }
        finally { setSending(false); }
    };
    return <Dialog open={open} title={title} onClose={onClose} busy={busy || sending}>
      <div className="dialog-copy">{children}</div>
      {error && <p className="notice" role="alert">{error}</p>}
      <div className="acciones"><button type="button" className="btn" autoFocus disabled={busy || sending} onClick={onClose}>Cancelar</button><button type="button" className="btn pri" disabled={busy || sending} onClick={() => void confirm()}>{sending || busy ? 'Guardando…' : confirmLabel}</button></div>
    </Dialog>;
}

export function SearchField({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
    return <div className="search-field"><label htmlFor={id}>{label}</label><div className="search-input"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input id={id} className="in" type="search" autoComplete="off" value={value} onChange={e => onChange(e.currentTarget.value)} placeholder={placeholder}/>{value && <button className="icon-button" type="button" aria-label={`Limpiar ${label.toLocaleLowerCase('es')}`} onClick={() => onChange('')}>×</button>}</div></div>;
}

export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
    const [visible, setVisible] = useState(false);
    return <div className="password-field"><input {...props} className={props.className ?? 'in'} type={visible ? 'text' : 'password'}/><button type="button" className="icon-button" aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible} onClick={() => setVisible(v => !v)}>
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{visible && <path d="m3 3 18 18"/>}</svg>
    </button></div>;
}

export function ClientPicker({ id, label = 'Cliente', clientes, value, onChange, includeInactive = false }: { id: string; label?: string; clientes: Cliente[]; value: number; onChange: (id: number) => void; includeInactive?: boolean }) {
    const [open, setOpen] = useState(false), [query, setQuery] = useState(''), [limit, setLimit] = useState(25);
    const chosen = clientes.find(c => c.id === value);
    const matches = clientes.filter(c => (includeInactive || c.activo !== false) && `${c.nombre} ${c.doc}`.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es')));
    return <div className="client-picker">
      <span className="lbl">{label}</span><div className="picker-choice"><button id={id} className="btn picker-open" type="button" aria-haspopup="dialog" onClick={() => { setQuery(''); setLimit(25); setOpen(true); }}>{chosen ? <><strong>{chosen.nombre}</strong><span>{chosen.tipoDoc} {chosen.doc}{chosen.activo === false ? ' · De baja' : ''}</span></> : 'Seleccionar cliente'}</button>{chosen && <button type="button" className="btn" onClick={() => onChange(-1)} aria-label="Quitar cliente seleccionado" title="Quitar cliente seleccionado"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7m4-7v7"/></svg></button>}</div>
      <Dialog open={open} title="Seleccionar cliente" onClose={() => setOpen(false)}>
        <SearchField id={`${id}-search`} label="Buscar por nombre o documento" value={query} onChange={v => { setQuery(v); setLimit(25); }}/>
        <p className="sub" role="status">{matches.length} {matches.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}</p>
        <div className="picker-results">{matches.slice(0, limit).map(c => <button type="button" className="picker-result" key={c.id} onClick={() => { onChange(c.id); setOpen(false); }}><strong>{c.nombre}</strong><span>{c.tipoDoc} {c.doc} · {c.moneda}{c.activo === false ? ' · De baja' : ''}</span></button>)}{!matches.length && <p className="empty">No hay coincidencias. Pruebe con otro nombre o documento.</p>}</div>
        {matches.length > limit && <button type="button" className="btn" onClick={() => setLimit(n => n + 25)}>Mostrar más clientes</button>}
      </Dialog>
    </div>;
}
