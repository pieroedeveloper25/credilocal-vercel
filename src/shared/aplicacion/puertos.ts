/** La aplicación conoce este contrato; SQLite es una implementación intercambiable. */
import type { Cuenta, Rol } from '../../contexts/identity-and-access/dominio/modelos';
import type { Datos } from '../dominio/datos';
export interface RepositorioDatos {
    leer(): Datos | undefined;
    guardar(datos: Datos): void;
    cerrar(): void;
}
/** Una línea de la bitácora de auditoría. Nunca contiene contraseñas. */
export interface EntradaDeAuditoria {
    fecha: string;
    actor: string;
    accion: string;
    tiendaId?: number;
    detalle?: string;
}
export interface RegistroDeAuditoria {
    registrar(entrada: EntradaDeAuditoria): void;
}
/** Sesiones activas. Se identifican por el resumen (SHA-256) del token: el token en sí nunca se guarda. */
export interface AlmacenSesiones {
    obtener(resumen: string): { cuentaId: number; vence: number } | undefined;
    guardar(resumen: string, sesion: { cuentaId: number; vence: number }): void;
    borrar(resumen: string): void;
    /** Cierra todas las sesiones de una cuenta, salvo la indicada (si hay). */
    borrarDeCuenta(cuentaId: number, conservar?: string): void;
    limpiarVencidas(ahora: number): void;
}
/** El caso de uso solicita una cuenta sin conocer PBKDF2 ni Web Crypto. */
export interface CreadorDeCuentas {
    crearCuenta(correo: string, clave: string, rol: Rol, id: number, tiendaId?: number, clienteId?: number): Promise<Cuenta>;
}

/** Lo que una solicitud ve: una fotografía coherente de los datos y las sesiones vigentes. */
export interface ContextoSolicitud { datos: Datos; sesiones: AlmacenSesiones }
/** Ejecuta una solicitud como unidad atómica: confirma solo si termina sin error. */
export interface UnidadDeSolicitud { ejecutar<T>(operacion: (contexto: ContextoSolicitud) => T | Promise<T>): Promise<T> }
