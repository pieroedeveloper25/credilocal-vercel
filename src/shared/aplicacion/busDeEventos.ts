import type { EventoDeDominio } from '../dominio/eventos';

/** Publica un evento; los suscriptores se ejecutan dentro de la misma unidad de trabajo. */
export type Publicar = (evento: EventoDeDominio) => void;
export type Suscriptor<E extends EventoDeDominio> = (evento: E) => void;

/** Bus síncrono en proceso: todos los suscriptores corren antes de que publicar() retorne. */
export function crearBusDeEventos() {
    const suscriptores = new Map<string, Suscriptor<never>[]>();
    return {
        suscribir<E extends EventoDeDominio>(tipo: E['tipo'], suscriptor: Suscriptor<E>) {
            suscriptores.set(tipo, [...(suscriptores.get(tipo) ?? []), suscriptor as Suscriptor<never>]);
        },
        publicar: ((evento) => {
            for (const suscriptor of suscriptores.get(evento.tipo) ?? [])
                (suscriptor as Suscriptor<EventoDeDominio>)(evento);
        }) as Publicar,
    };
}
