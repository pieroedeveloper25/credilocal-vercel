# CrediLocal

Sistema web de crédito comercial para negocios de barrio, desarrollado para el trabajo final de SI642 Finanzas e Ingeniería Económica (UPC, 2026-20). Permite registrar tiendas, clientes con sus condiciones de crédito, un catálogo de productos y servicios, ventas a crédito a fin de mes o en cuotas por el método francés con gracia total, listados de pago al corte y cobranzas con mora y prelación.

Aplicativo publicado: **https://credilocal-vercel.vercel.app**

## Tecnologías

| Parte | Tecnología |
| --- | --- |
| Interfaz | React 18, TypeScript y Vite 6 |
| API | Funciones de Vercel en Node.js, región São Paulo (`gru1`) |
| Base de datos | PostgreSQL en Neon, región São Paulo, 17 tablas |
| Base de datos en local | PGlite, que es PostgreSQL embebido en Node.js |
| Cálculos | `decimal.js` con 40 dígitos significativos y redondeo `ROUND_HALF_UP` |
| Pruebas | Vitest y `node:test`, ejecutadas en GitHub Actions |

El motor es PostgreSQL en todos los casos. En el aplicativo publicado los datos están en Neon y al ejecutarlo en una computadora propia quedan en la carpeta `datos/pglite`. La API es la misma: `vercel/manejador.ts` la conecta a Neon y `servidor/main.ts` la conecta a PGlite.

## Cuentas de demostración

El aplicativo publicado tiene una tienda, dos clientes y un catálogo de demostración, todos ficticios. La contraseña de las tres cuentas es `credi2026`, y en la pantalla de acceso el botón **Usar cuenta de demostración** completa la cuenta del perfil elegido.

| Perfil | Correo | Qué puede hacer |
| --- | --- | --- |
| Superadministrador | sistema@credilocal.pe | Gestionar tiendas, topes de tasas y auditoría |
| Comercio | comercio@sutaller.pe | Clientes, catálogo, ventas, estado de cuenta, pagos y simulador |
| Cliente | contacto@transintegrales.pe | Consultar su estado de cuenta y su cronograma |

## Ejecutar en una computadora propia

Requisitos: Node.js 22.13 o superior y npm. La primera instalación necesita internet para descargar las dependencias.

```bash
git clone https://github.com/pieroedeveloper25/credilocal-vercel.git
cd credilocal-vercel
npm ci
npm run build
```

El primer arranque crea la base local vacía con una sola cuenta, el superadministrador `sistema@credilocal.pe`. Su contraseña inicial se indica con la variable `CREDILOCAL_CLAVE_INICIAL` (8 a 64 caracteres, con letras y números) y el sistema pide cambiarla en el primer ingreso. Los arranques siguientes ya no necesitan la variable.

En Windows (PowerShell):

```powershell
$env:CREDILOCAL_CLAVE_INICIAL = "Elegir2026"
npm start
```

En Linux o macOS:

```bash
CREDILOCAL_CLAVE_INICIAL="Elegir2026" npm start
```

En Windows también se puede usar `INICIAR_CrediLocal.cmd` después de compilar, que pide la contraseña inicial si es el primer arranque.

Luego abrir http://127.0.0.1:3000 y mantener la terminal abierta. Se detiene con Ctrl+C. La base local empieza sin datos de demostración, que están en el aplicativo publicado. Para usar otra carpeta de datos se define `CREDILOCAL_DB` con su ruta.

## Pruebas

```bash
npm test                    # 106 pruebas unitarias
npm run test:api            # 23 pruebas de la API sobre una base PGlite temporal
npm run test:arquitectura   # 5 pruebas de límites entre contextos
```

GitHub Actions ejecuta la compilación y las 134 pruebas en cada cambio de la rama `main` (`.github/workflows/pruebas.yml`).

## Despliegue

El aplicativo se despliega en Vercel desde la rama `main` y usa una base PostgreSQL en Neon. Los pasos, las variables de entorno (`DATABASE_URL`, `CRON_SECRET` y `CREDILOCAL_CLAVE_INICIAL`) y la verificación están en [docs/DESPLIEGUE-VERCEL.md](docs/DESPLIEGUE-VERCEL.md). El cron de `vercel.json` emite los listados de corte todos los días a las 05:00 UTC, medianoche en Lima.

## Funcionalidades

- Alta, edición y baja lógica de tiendas, clientes y productos, conservando su historial.
- Condiciones de crédito por cliente: moneda, línea, tasas nominales o efectivas, plazo máximo, día y hora de corte y día de pago.
- Topes de tasas compensatoria y moratoria del BCRP por moneda, validados al pactar las tasas.
- Catálogo con imagen JPG o PNG de hasta 2 MB, precio al contado y precio a crédito.
- Ventas a fin de mes o en cuotas con control de la línea disponible en el servidor, simulación previa y TCEA.
- Liquidación con capital, interés compensatorio y mora por separado, pago completo del período sin parciales y prelación mora, interés y capital (art. 1257 del Código Civil).
- Listado de pago al corte emitido de forma automática.
- Portal del cliente con acceso solo a su cuenta.
- Auditoría de operaciones, ingresos exitosos e intentos de acceso fallidos.
- Ayuda en cada campo, vista móvil y tema claro u oscuro.

## Reglas financieras

- Tasas anuales convertidas a tasa efectiva diaria (TED) y mensual (TEM) con año de 360 días y mes de 30.
- Días calendario reales entre fechas para la gracia, el interés y la mora.
- Una compra hasta la fecha y hora de corte vence en el día de pago de ese mes y una posterior en el del mes siguiente.
- En cuotas, el interés de la gracia total se capitaliza y la cuota se calcula por el método francés sobre el capital ajustado. La última cuota deja el saldo en cero.
- La mora se calcula sobre el total exigible (capital más interés compensatorio) por los días de atraso.

## Seguridad

- Contraseñas con sal y PBKDF2-SHA256 de 600 000 iteraciones, comparadas en tiempo constante.
- Diez intentos fallidos por cuenta y origen, o cuarenta por origen, bloquean el acceso diez minutos.
- Cookie de sesión `HttpOnly`, `SameSite=Strict` y `Secure` en HTTPS. Las sesiones vencen a las ocho horas.
- Cada operación se valida en el servidor, que además aplica el perfil y la tienda de la sesión.
- Cabeceras Content-Security-Policy, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` y `Permissions-Policy`.

## Organización del código

```text
api/                          Funciones de Vercel (API y cron de cortes)
vercel/manejador.ts           API conectada a Neon
servidor/main.ts              Servidor local conectado a PGlite
src/
  contexts/
    identity-and-access/      Tiendas, cuentas, perfiles y sesiones
    customer-management/      Clientes, condiciones y línea de crédito
    product-catalog/          Productos, precios, imágenes y modalidades
    credit-origination/       Venta, tasas, gracia, cronograma y TCEA
    billing-and-collections/  Deuda, mora, pagos y cortes
  shared/                     Decimal, fechas, validaciones, contratos y eventos
  aplicacion/                 Casos de uso y autorización
  infraestructura/            HTTP, persistencia PostgreSQL y PGlite, composición
  presentacion/web/           Pantallas y componentes de React
pruebas/                      Pruebas de la API y de arquitectura
docs/                         Arquitectura y despliegue en Vercel y Neon
```

Cada contexto se divide en `dominio`, `aplicacion` e `infraestructura`, siguiendo DDD y arquitectura limpia. Un contexto solo conoce de otro sus eventos de dominio, y las pruebas de arquitectura verifican esos límites.
