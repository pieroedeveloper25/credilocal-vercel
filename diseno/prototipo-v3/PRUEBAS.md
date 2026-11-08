# Revisión del prototipo v3 — 06/11/2026

Esta revisión corresponde a una maqueta independiente con datos ficticios, no a la aplicación integrada.

## Comprobado

- Sintaxis del JavaScript extraído con `node --check prototipo-check.mjs`.
- Cuatro estados del dashboard con `node verificar_dashboard.mjs`: capital pendiente 500, 1700, 1200 y 0, según venta de Lucía y pago de Pedro. Cobros 510.08 después del pago; capital vencido 500 antes y 0 después. Se conserva el límite del cliente añadido.
- En navegador, registro de la venta y pago mediante controles visibles: capital pendiente 500 → 1700 → 1200; cobros 510.08 después del pago.
- Tabla alternativa de los gráficos abierta mediante teclado. Coincide con los importes mostrados.
- Dashboard disponible para Comercio; sin enlace de Dashboard en los perfiles Cliente y Superadministrador.
- Anchura móvil de 390 px: documento sin desbordamiento horizontal (373 px útiles). A 652 px, la franja de prototipo se ajusta a 76 px y la cuenta queda dentro del viewport de 844 px.
- Escritorio: barra lateral y cuenta visibles debajo de la franja del prototipo. Captura guardada en `dashboard-escritorio.jpg`.
- v2 conserva su SHA-256 documentado. No se editaron archivos de producción, algoritmo financiero, esquema ni Word.

## Alcance pendiente

Aceptación visual de Piero, conexión con datos reales y sus contratos, tema oscuro, zoom nativo, lector de pantalla y dispositivos físicos. Las pruebas de la maqueta no certifican accesibilidad completa ni resultados financieros del sistema real. Los ejemplos usan una consulta fija al 30/10/2026.
