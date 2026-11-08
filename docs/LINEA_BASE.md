# Línea base · CrediLocal (copia para Vercel)

Fecha: 08/11/2026. Origen: `Sistema/credilocal` (sin cambios). Esta carpeta es la copia de migración a Vercel, con repositorio git propio.

## Resultado de pruebas en el original

Ejecutado en disco local del sandbox (`/tmp`), porque SQLite con WAL falla con `disk I/O error` sobre la carpeta montada desde Windows.

| Comando | Resultado |
|---|---|
| `npm test` (Vitest) | 12 archivos, 82 pruebas, todas pasan |
| `npm run test:api` | 19 de 19 |
| `npm run test:arquitectura` | 5 de 5 |
| `npm run test:persistencia` | 12 de 12 |
| `npm run test:demo` | 4 de 4 |

Requisito de entorno: `npm run build` antes de `test:api`, `test:persistencia` y `test:demo`, porque usan `servidor-dist/`.

Nota: en la carpeta montada las mismas pruebas fallan por `disk I/O error`. Es un problema del entorno, no del código.

## Casos de aceptación de referencia

Tomados de `REQUISITOS.md` (carpeta `auditoria_informe/rediseno_2026-11-05`). Deben seguir cumpliéndose en la versión Vercel.

1. **Cuotas con gracia:** S/ 1,200, TEA 36 %, compra 08/10/2026 antes del corte día 10, pago día 25, tres cuotas. Gracia 17 días, interés S/ 17.55, capital ajustado S/ 1,217.55. Pagos S/ 427.10, 427.10 y 427.09, desde 25/11. Fin de gracia 25/10 sin pago.
2. **Corte por hora:** S/ 100, compra 10/10/2026, corte 18:00, pago 25. A las 17:59 vence 25/10 con interés S/ 1.29. A las 18:01 vence 25/11 con interés S/ 4.01.
3. **Límite:** límite S/ 3,000 y comprometido S/ 2,900. Cuatro unidades de S/ 100 se rechazan. Una unidad se acepta y el disponible final es cero.
4. **Auditoría:** OP-2026007 se localiza por referencia completa o por 2026007. Venta 10/10 y registro 05/11. Retroactiva de 26 días.
5. **Cobranza:** total histórico S/ 510.08. Pagos parciales de S/ 300 y S/ 600 se rechazan. El importe exacto se acepta, con desglose en orden mora, interés, capital.

## Reglas del enunciado que el sistema debe cumplir

- Alta y baja de tiendas por superadministrador (numeral 1).
- Alta y baja de productos con modalidad contado, crédito y pago único a fin de mes o en meses (numeral 2).
- Alta y baja de clientes con tasa nominal o efectiva, moneda, límite, máximo de meses, fecha de corte y fecha de pago (numeral 3).
- Cuotas por método francés vencido simple ordinario, meses de 30 días, base 360 (numeral 4, Anexo A).
- Interés por días entre compra y pago, y mora por días de atraso (numeral 5).
- Listado de pago generado en la fecha de corte, con compras ordenadas por fecha, intereses y mora como ítem separado (numeral 6).
- Acceso con usuario y clave, y registro de todas las operaciones en base de datos (apartado 9).
- Ayuda electrónica en cada campo de diálogo (apartado 6.b).
- Prelación de pagos: mora, interés compensatorio, capital (Anexo A).
- Redondeo: dinero a 2 decimales, tasas con al menos 7 decimales (Anexo A).
