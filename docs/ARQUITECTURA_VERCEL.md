# Arquitectura para Vercel · CrediLocal

Fase 1 del plan de migración. Copia de trabajo: `Sistema/credilocal-vercel` (repositorio git propio). El original `Sistema/credilocal` no se modifica.

## 1. Qué cambia y qué no

| Parte | Original (Node + SQLite) | Versión Vercel | Cambio |
|---|---|---|---|
| Interfaz (React + Vite) | Compilada a `dist/` y servida por Node | Compilada a `dist/` y servida por Vercel como estático | Ninguno en diseño ni en componentes |
| Casos de uso y dominio (`src/aplicacion`, `src/contexts`, `src/shared/dominio`) | Lógica financiera y reglas | Igual | Ninguno (la regla "no cambiar el algoritmo" se mantiene) |
| Rutas HTTP (`crearServidor.ts`) | Un `createServer` que vive todo el tiempo | Una función de Vercel por petición, reutilizando la misma lógica de rutas | Se extrae la lógica de rutas a una función `manejarSolicitud(req, res, contexto)` |
| Persistencia | `node:sqlite` con archivo local | PostgreSQL (Neon) con el mismo puerto `RepositorioDatos` | Nuevo adaptador PostgreSQL; el esquema se genera desde las mismas definiciones de tablas |
| Sesiones | Tabla `sesiones` en SQLite | Tabla `sesiones` en PostgreSQL | Mismo puerto `AlmacenSesiones`, con caché por petición |
| Cortes automáticos | `setInterval` cada 30 s | Cálculo al iniciar cada operación + cron diario de respaldo | Cambio de mecanismo, misma regla (ver §5) |
| Datos iniciales | `iniciales()` con datos de demostración | Solo cuenta de Superadministrador | Datos limpios, como se acordó |
| Migración de versión 1.0 | `migrarLegado` | Eliminada | No hay datos que migrar |
| Servidor de demostración (`servidor/demo.ts`) | Carga datos de demo en SQLite | Eliminado | Se reemplaza por un script opcional de siembra |

## 2. Estructura de la copia

```
credilocal-vercel/
  api/[...ruta].ts          función única de Vercel: llama a manejarSolicitud
  src/                      igual que el original, con el adaptador PostgreSQL nuevo
  src/infraestructura/persistencia/postgres.ts   (nuevo)
  src/infraestructura/persistencia/esquema.ts    (nuevo, compartido: tablas, filas, firmas)
  src/infraestructura/http/manejarSolicitud.ts   (extraído de crearServidor.ts)
  scripts/sembrar-superadmin.mjs                 (nuevo, crea la cuenta inicial)
  scripts/generar-cabeceras.mjs                  (nuevo, calcula el hash CSP del index.html)
  vercel.json               rutas, cabeceras y cron
  pruebas/                  las mismas suites, adaptadas a PostgreSQL
  docs/                     línea base y esta arquitectura
```

## 3. Flujo de una petición

1. Vercel recibe la petición en `api/[...ruta].ts`.
2. Se abre una conexión a Neon (URL de conexión con pooler).
3. Se inicia una transacción y se bloquea la fila de versión con `SELECT ... FOR UPDATE` en `metadatos`. Esto reemplaza al `BEGIN IMMEDIATE` de SQLite y serializa las escrituras entre instancias de la función.
4. Se cargan todos los datos (`leer`) y las sesiones relevantes para el token de la cookie.
5. Se ejecuta la misma lógica de rutas que hoy (`manejarSolicitud`), sobre la fotografía en memoria.
6. Si hubo cambios, `guardar` escribe solo las filas modificadas, como hoy (`sincronizar`), y aumenta la versión.
7. Se hace `COMMIT` y se libera la conexión. La respuesta sale después del commit, así que nunca se responde éxito sin guardar.

Límite aceptado: se carga toda la base en cada petición. Es válido para el tamaño de una demostración; se medirá en la Fase 3 con datos de volumen y se documentará el tamaño máximo recomendado.

## 4. Persistencia

- **Esquema:** las definiciones `TABLAS` pasan a `esquema.ts`, que las usan SQLite y PostgreSQL. Tipos: `TEXT`, `INTEGER`; los `CHECK`, `FOREIGN KEY` y `UNIQUE` se mantienen.
- **Sincronización:** `sincronizar` se vuelve asíncrona solo en la capa de ejecución; la lógica de comparación de firmas no cambia.
- **Concurrencia:** `FOR UPDATE` sobre la fila de versión. Dos peticiones que escriben al mismo tiempo se encolan en la base, no se pisan.
- **Driver:** `pg` con la URL de conexión del pooler de Neon.
- **Pruebas locales:** `@electric-sql/pglite` (PostgreSQL en WebAssembly), sin red ni cuenta, para las suites de persistencia y API.

## 5. Cortes automáticos

La regla del enunciado (numeral 6: listado de pago generado en la fecha de corte) se conserva. El cambio es el mecanismo:

- Al abrir cada unidad de trabajo se ejecuta `emitirCortesPendientes(ahora)`. Si hay cortes vencidos sin listado, se generan y se guardan en la misma transacción.
- Un cron diario de Vercel (`/api/cron/cortes`, protegido con `CRON_SECRET`) actúa como respaldo para tiendas sin visitas.
- Riesgo: si nadie entra ni el cron corre a tiempo, el listado se genera en el primer acceso posterior, con la fecha de corte real. Se verifica con una prueba de día de corte en la Fase 3.

## 6. Sesiones y seguridad

- La cookie `credilocal` se mantiene con `HttpOnly; SameSite=Strict; Secure`. Vercel termina HTTPS, así que el atributo `x-forwarded-proto` ya lo cubre.
- El token nunca se guarda; solo su resumen SHA-256.
- Las cabeceras de seguridad y la política CSP se generan en el build (`generar-cabeceras.mjs`) a partir del `index.html`, y van a `vercel.json`. Así se conserva la protección actual sin el servidor propio.
- **Pendiente de seguridad:** la contraseña inicial `credi2026` está fija en el código. En la versión Vercel no se usará; la cuenta de Superadministrador se crea con una clave tomada de la variable `CREDILOCAL_CLAVE_INICIAL`, y se exige cambiarla en el primer ingreso. Confirmar si la función de cambio de clave ya lo exige; si no, se agrega en la Fase 3.

## 7. Variables de entorno (Vercel)

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión a Neon (pooler) |
| `CRON_SECRET` | Autoriza la llamada del cron diario |
| `CREDILOCAL_CLAVE_INICIAL` | Clave de la cuenta Superadministrador inicial |

Ninguna se guarda en el repositorio. Solo se incluye `.env.example` con nombres, sin valores.

## 8. Límites y riesgos conocidos

| Riesgo | Efecto | Mitigación |
|---|---|---|
| Cron de Vercel en plan gratuito: una vez al día | Los cortes de tiendas sin visitas se generan con retraso | Generación al primer acceso; cron como respaldo |
| Neon suspende el cómputo tras inactividad | Primera petición lenta (1–2 s) | Aceptable; se avisa en la demostración |
| Cuerpo de petición de funciones de Vercel: límite de unos 4,5 MB | Imágenes de producto grandes pueden fallar al subir | Medir tamaño real; si hace falta, comprimir en el cliente |
| Carga completa de datos por petición | Crece con el volumen | Medir en Fase 3; documentar el límite |
| Plan gratuito de Vercel: uso personal o no comercial | Uso académico, sin ingresos | Confirmar términos al crear la cuenta |
| Imágenes de producto guardadas como texto en la base | Tablas más pesadas | Aceptable para la demo |

## 9. Lo que no cambia (verificación)

- Los casos de aceptación de `docs/LINEA_BASE.md` deben cumplirse igual.
- Las 82 pruebas de Vitest y las suites de API, arquitectura, persistencia y demo se mantienen, adaptadas al nuevo adaptador.
- El diseño visual se compara con las capturas de la línea base.

## 10. Pasos siguientes

- **Fase 2:** adaptador PostgreSQL y esquema; pruebas de persistencia con PGlite; datos iniciales limpios.
- **Fase 3:** extraer `manejarSolicitud`, función de Vercel, `vercel.json`, cron, cabeceras; pruebas de API y de día de corte; medición de volumen.
- **Fase 4:** crear el proyecto en Vercel y la base en Neon (tú creas las cuentas), variables, vista previa y producción.
- **Fase 5:** README, notas para el informe y revisión final.
