import { useEffect, useRef, useState } from 'react';
import { ErrorDeApi } from '../api';
import { ThemeToggle } from '../components/ThemeToggle';
import { Logo } from '../components/Logo';
import { PasswordInput } from '../components/overlays';
import { Field, Seg, idx, tipId } from '../components/ui';
import { ZapIcon, ArrowUpRightIcon } from '../components/Icons';
import { useSesion } from '../session';
import { useStore } from '../store';
type RolUI = 'Superadministrador' | 'Comercio' | 'Cliente';
export function Login() {
    const { entrar, aviso } = useSesion();
    const { autenticar, listo, errorBase } = useStore();
    const [error, setError] = useState('');
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [rol, setRol] = useState<RolUI>('Comercio');
    const [intentos, setIntentos] = useState(0);
    const [espera, setEspera] = useState(0);
    const bloqueoHasta = useRef(0);
    useEffect(() => {
        if (espera <= 0) return;
        const reloj = window.setInterval(() => setEspera(Math.max(0, Math.ceil((bloqueoHasta.current - Date.now()) / 1000))), 1000);
        return () => window.clearInterval(reloj);
    }, [espera > 0]);
    const [ok, setOk] = useState(false);
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const passOk = pass.length >= 8;
    const bloqueada = intentos >= 3 || espera > 0;
    const errEmail = email && !emailOk ? 'Ingrese un correo válido' : undefined;
    const errPass = pass && !passOk ? 'La contraseña requiere al menos 8 caracteres' : undefined;
    const faltante = !emailOk && !passOk ? 'Escribe un correo válido y una contraseña de al menos 8 caracteres para continuar.'
      : !emailOk ? 'Escribe un correo válido para continuar.'
      : !passOk ? 'Escribe una contraseña de al menos 8 caracteres para continuar.' : '';
    const enviar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailOk || !passOk || bloqueada || enviando)
            return;
        setEnviando(true);
        try {
            setError('');
            const sesion = await autenticar(rol, email, pass);
            setOk(true);
            entrar(sesion);
            window.location.hash = rol === 'Superadministrador' ? '#/tiendas' : rol === 'Comercio' ? '#/dashboard' : '#/mi-estado';
        }
        catch (e) {
            if (e instanceof ErrorDeApi && Number.isFinite(e.segundosRestantes) && e.segundosRestantes! > 0) {
                bloqueoHasta.current = Date.now() + e.segundosRestantes! * 1000;
                setEspera(e.segundosRestantes!);
                setIntentos(0);
            } else {
                setIntentos(n => n + 1);
            }
            setError((e as Error).message);
            setEnviando(false);
        }
    };
    const CUENTAS_DEMO: Record<RolUI, string> = {
        Superadministrador: 'sistema@credilocal.pe',
        Comercio: 'comercio@sutaller.pe',
        Cliente: 'contacto@transintegrales.pe',
    };
    const usarDemo = () => {
        setEmail(CUENTAS_DEMO[rol]);
        setPass('credi2026');
    };
    return (<div className="login-wrap page">
      <div className="theme-corner"><ThemeToggle /></div>
      <div className="login-card rv" style={idx(0)}>
        <aside className="access-art" aria-label="CrediLocal">
          <div className="access-brand"><Logo size={40}/><strong>CrediLocal</strong></div>
          <svg className="access-store" aria-hidden="true" viewBox="0 0 360 240" fill="none">
            <g stroke="#8AA9C4" strokeWidth="2" strokeLinejoin="round">
              <path d="M22 194h310M41 200h251" opacity=".45"/>
              <path d="M68 114h184v78H68z" fill="#314d67"/>
              <path d="M59 102l17-43h168l17 43z" fill="#C9DCE8"/>
              <path d="M82 102l13-43h19l-7 43zm49 0 4-43h20v43zm49 0-3-43h19l9 43zm50 0-10-43h19l16 43z" fill="#577893" stroke="none"/>
              <path d="M59 103v11q10 13 24 0 12 13 25 0 12 13 25 0 12 13 25 0 12 13 25 0 12 13 25 0 12 13 25 0 13 13 28 0v-11z" fill="#8AA9C4"/>
              <path d="M81 131h92v44H81z" fill="#1D2D44"/><path d="M127 131v44m-46 3h92"/>
              <path d="M190 131h43v61h-43z" fill="#1D2D44"/><path d="M222 158v8"/>
              <g transform="rotate(8 257 172)"><rect x="222" y="129" width="75" height="91" rx="7" fill="#EAF2F8"/><path d="M235 150h47m-47 12h47m-47 12h24m-24 23h21" stroke="#3E5C76"/><path d="m264 190 5 5 11-12" stroke="#3E5C76" strokeWidth="3"/></g>
            </g>
          </svg>
        </aside>
        <div className="login-form-side">
          <div className="login-identity"><Logo size={34}/><strong>CrediLocal</strong></div>
          <form onSubmit={enviar} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 26, lineHeight: '32px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink)' }}>
                Iniciar Sesión
              </h1>
              <p className="sub" style={{ fontSize: 13, marginTop: 4 }}>
                Seleccione su perfil de acceso para ingresar a la plataforma.
              </p>
            </div>

            {/* Selector de Perfil */}
            <div style={{ margin: '4px 0 2px' }}>
              <Field id="rol" label="Perfil de usuario" helpText="Superadministrador gestiona tiendas; Comercio administra su negocio; Cliente consulta únicamente su cuenta.">
              <Seg<RolUI> value={rol} options={['Superadministrador', 'Comercio', 'Cliente']} onChange={setRol} label="Rol de acceso"/>
              </Field>
            </div>

            {/* Una sola acción: rellena la cuenta de demostración del perfil elegido arriba */}
            <button type="button" className="btn sm" style={{ gap: 6, fontSize: 12, fontWeight: 600 }} onClick={usarDemo}>
              <ZapIcon size={13}/> Usar cuenta de demostración ({rol})
            </button>

            {/* Inputs de Correo y Clave */}
            {!listo && <p role="status">{errorBase || 'Abriendo la base local…'}</p>}
            {aviso && !error && <p role="status" className="sub">{aviso}</p>}
            {error && <p role="alert" className="err-msg">{error}</p>}
            <div>
              <Field id="email" label="Correo electrónico" help="usuario" error={errEmail}>
                <input id="email" className={`in${errEmail ? ' err' : ''}`} type="email" autoComplete="username" placeholder="correo@ejemplo.pe" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errEmail} aria-describedby={tipId('email')}/>
              </Field>
            </div>

            <div>
              <Field id="pass" label="Contraseña" help="clave" error={errPass}>
                <PasswordInput id="pass" autoComplete="current-password" value={pass} onChange={e => setPass(e.target.value)} aria-invalid={!!errPass} aria-describedby={tipId('pass')}/>

              </Field>
            </div>

            {/* Alertas y Mensajes */}
            {espera > 0 && <p className="notice" role="status">Acceso temporalmente bloqueado. Reintenta en {Math.floor(espera / 60)} min {espera % 60} s.</p>}
            {intentos >= 3 && (<div className="notice" role="alert">
                <div>Se superaron 3 intentos en este formulario. <button type="button" className="btn sm" onClick={() => { setIntentos(0); setError(''); }}>Reintentar</button></div>
              </div>)}
            {intentos > 0 && !bloqueada && !ok && (<div className="err-msg" role="alert">
                Intentos restantes en este formulario: {3 - intentos}
              </div>)}
            {ok && (<div className="toast" role="status">
                Sesión autenticada como {rol}. Ingresando al panel…
              </div>)}

            {/* Botón de Envío */}
            {faltante && listo && !bloqueada && !enviando && !ok && <p id="login-faltante" className="sub">{faltante}</p>}
            <button type="submit" className="btn pri" aria-busy={enviando} aria-describedby={faltante && listo ? 'login-faltante' : undefined} disabled={!listo || !emailOk || !passOk || bloqueada || enviando || ok}>
              {enviando ? 'Ingresando…' : 'Ingresar a la plataforma'} <ArrowUpRightIcon size={16}/>
            </button>

          </form>
        </div>
      </div>
    </div>);
}
