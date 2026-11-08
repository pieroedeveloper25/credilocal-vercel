import { useState } from 'react';
import { api } from '../api';
import { useSesion } from '../session';
import { Field } from './ui';
import { PasswordInput } from './overlays';
import { claveValida } from './CambiarClave';

/** Pantalla que bloquea la aplicación en el primer ingreso con una clave provisional. Al cambiarla, la sesión se libera. */
export function CambiarClaveObligatoria() {
    const { sesion, entrar, salir } = useSesion();
    const [actual, setActual] = useState('');
    const [nueva, setNueva] = useState('');
    const [repetida, setRepetida] = useState('');
    const [error, setError] = useState('');
    const [enviando, setEnviando] = useState(false);
    const errNueva = nueva && !claveValida(nueva) ? 'Use de 8 a 64 caracteres, con letras y números.' : undefined;
    const errRepetida = repetida && repetida !== nueva ? 'Las contraseñas no coinciden.' : undefined;
    const enviar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (enviando || !sesion || !actual || !claveValida(nueva) || repetida !== nueva)
            return;
        setEnviando(true);
        setError('');
        try {
            await api('clave', { actual, nueva });
            entrar({ ...sesion, claveProvisional: false });
        }
        catch (err) {
            setError((err as Error).message);
            setEnviando(false);
        }
    };
    return (
      <main className="loading-view">
        <form onSubmit={enviar} noValidate aria-labelledby="clave-obligatoria-titulo" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 420 }}>
          <h1 id="clave-obligatoria-titulo">Cree su contraseña</h1>
          <p>Su clave de ingreso es provisional. Cámbiela antes de continuar.</p>
          <Field id="clave-actual" label="Contraseña provisional" help="claveActual">
            <PasswordInput id="clave-actual" className="in" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)}/>
          </Field>
          <Field id="clave-nueva" label="Contraseña nueva" help="claveNueva" error={errNueva}>
            <PasswordInput id="clave-nueva" className={`in${errNueva ? ' err' : ''}`} autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} aria-invalid={!!errNueva}/>
          </Field>
          <Field id="clave-repetida" label="Repita la contraseña nueva" help="claveRepetida" error={errRepetida}>
            <PasswordInput id="clave-repetida" className={`in${errRepetida ? ' err' : ''}`} autoComplete="new-password" value={repetida} onChange={(e) => setRepetida(e.target.value)} aria-invalid={!!errRepetida}/>
          </Field>
          {error && <p role="alert" className="err-msg">{error}</p>}
          <div className="acciones">
            <button type="button" className="btn" onClick={salir}>Cerrar sesión</button>
            <button type="submit" className="btn pri" disabled={enviando || !actual || !claveValida(nueva) || repetida !== nueva}>Guardar contraseña</button>
          </div>
        </form>
      </main>
    );
}
