# Despliegue en Vercel y Neon

Guía para publicar CrediLocal en producción. No contiene credenciales: los valores se configuran en Vercel y se guardan fuera del repositorio.

## 1. Base de datos (Neon)

1. Crear un proyecto de PostgreSQL en Neon con región en São Paulo (`aws-sa-east-1`).
2. Copiar la cadena de conexión con `sslmode=require`.
3. No guardar la cadena en el repositorio. Se usa solo en Vercel.

El esquema se crea solo en el primer arranque de cada instancia (`CREATE TABLE IF NOT EXISTS`). No hace falta ejecutar migraciones a mano.

## 2. Proyecto en Vercel

- Framework: **Vite**. Comando de build: `npm run build`. Carpeta de salida: `dist`.
- Versión de Node: **26.x** (la del proyecto).
- Región de funciones: `iad1` como respaldo; la base está en São Paulo.
- La función HTTP es `api/[...ruta].ts` y se empaqueta desde `vercel/manejador.ts`.
- El cron de cortes tiene su propia función: `api/cron/cortes.ts`. Vercel no enruta al catch-all las rutas de dos o más niveles bajo `/api/`.

## 3. Variables de entorno (solo en Vercel)

| Variable | Para qué | Notas |
|---|---|---|
| `DATABASE_URL` | Conexión a Neon | Producción y preview |
| `CRON_SECRET` | Autoriza `/api/cron/cortes` | Vercel lo envía como `Authorization: Bearer` |
| `CREDILOCAL_CLAVE_INICIAL` | Clave del superadministrador en la primera siembra | Se cambia en el primer ingreso |

Después de cambiar variables, redesplegar.

## 4. Cron de cortes

`vercel.json` programa `/api/cron/cortes` todos los días a las 05:00 UTC (00:00 en Lima). Sin el encabezado correcto responde `401 {"error":"No autorizado."}`. Un `404` de la plataforma indica que la ruta no está enrutada.

## 5. Verificación después de desplegar

```bash
curl -s https://<dominio>/api/salud                  # {"estado":"ok","almacenamiento":"PostgreSQL"}
curl -s -o /dev/null -w "%{http_code}\n" https://<dominio>/api/cron/cortes   # 401
```

Luego, en el navegador: ingresar con el superadministrador, confirmar el cambio de clave en el primer ingreso y revisar el simulador de cuotas.

## 6. Límites conocidos

- **Bloqueo por intentos:** el contador vive en la base de datos, así que se comparte entre instancias. Se cuenta por IP de cliente y cuenta; una IP que cambia en cada intento reinicia su contador.
- **Clave en ingresos:** el límite es de 10 intentos por cuenta y origen durante 10 minutos.
- **Sesiones:** duran 8 horas y se guardan en la tabla `sesiones`.

## 7. Rotación de secretos

Si una variable aparece en un lugar público, rotarla en Vercel y en Neon, y redesplegar. Las claves de demostración del login son públicas por diseño de la demo y no son secretos de producción.
