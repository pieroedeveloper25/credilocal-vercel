import { ShieldCheckIcon } from './Icons';
import { PasswordInput } from './overlays';
import { useRef, useState } from 'react';
import { api } from '../api';
import { Field } from './ui';
export const claveValida = (s: string) => s.length >= 8 && s.length <= 64 && /[a-zA-Z]/.test(s) && /\d/.test(s);
/** Botón y diálogo para que la persona usuaria cambie la contraseña de su propia cuenta. */
export function CambiarClave() {
    const dialogo = useRef<HTMLDialogElement>(null);
    const [actual, setActual] = useState('');
    const [nueva, setNueva] = useState('');
    const [repetida, setRepetida] = useState('');
    const [error, setError] = useState('');
    const [listo, setListo] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const abrir = () => {
        setActual('');
        setNueva('');
        setRepetida('');
        setError('');
        setListo(false);
        dialogo.current?.showModal();
    };
    const errNueva = nueva && !claveValida(nueva) ? 'Use de 8 a 64 caracteres, con letras y números.' : undefined;
    const errRepetida = repetida && repetida !== nueva ? 'Las contraseñas no coinciden.' : undefined;
    const enviar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (enviando || !actual || !claveValida(nueva) || repetida !== nueva)
            return;
        setEnviando(true);
        setError('');
        try {
            await api('clave', { actual, nueva });
            setListo(true);
            setActual('');
            setNueva('');
            setRepetida('');
        }
        catch (err) {
            setError((err as Error).message);
        }
        finally {
            setEnviando(false);
        }
    };
    return (<>
      <button type="button" className="btn" onClick={abrir}><ShieldCheckIcon size={16}/> Cambiar contraseña</button>
      <dialog ref={dialogo} className="dlg" aria-labelledby="clave-titulo">
        <form onSubmit={enviar} noValidate>
          <h2 id="clave-titulo">Cambiar contraseña</h2>
          {listo ? (<>
              <p role="status">Contraseña actualizada. Se cerraron las demás sesiones abiertas con esta cuenta.</p>
              <div className="acciones"><button type="button" className="btn pri" onClick={() => dialogo.current?.close()}>Cerrar</button></div>
            </>) : (<>
              <Field id="clave-actual" label="Contraseña actual" help="claveActual">
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
                <button type="button" className="btn" onClick={() => dialogo.current?.close()}>Cancelar</button>
                <button type="submit" className="btn pri" disabled={enviando || !actual || !claveValida(nueva) || repetida !== nueva}>Guardar contraseña</button>
              </div>
            </>)}
        </form>
      </dialog>
    </>);
}
