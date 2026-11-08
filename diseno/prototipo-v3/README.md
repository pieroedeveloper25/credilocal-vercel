# CrediLocal: propuesta con dashboard

Versión candidata del 06/11/2026. `prototipo.html` conserva los flujos de v2 y añade el dashboard solicitado por Piero. **No es el diseño final ni está integrado con la aplicación real.** La versión v2 permanece intacta.

## Abrir y recorrer

Abre `prototipo.html` en el navegador. Es autocontenido y no instala paquetes ni consulta la base de CrediLocal.

1. La vista inicial **Dashboard** muestra el estado ficticio de la cartera.
2. **Preparar ejemplo Reto 4** abre la venta de Lucía con sus datos. Solo preparar no incrementa la cartera: primero debes pulsar **Registrar venta de ejemplo**.
3. Vuelve a Dashboard: capital pendiente pasa de S/ 500.00 a S/ 1,700.00, de los que S/ 1,200.00 son vigentes y S/ 500.00 vencidos. Aparece la primera cuota de Lucía para el 25 de noviembre.
4. **Revisar pago de Pedro** abre el caso independiente del Reto 3. Al registrar exactamente S/ 510.08, vuelve a Dashboard: cobros del periodo S/ 510.08, capital vencido S/ 0.00 y capital pendiente S/ 1,200.00 si se registró a Lucía.
5. Los clientes nuevos no contraen deuda al darlos de alta. Su límite individual aparece en la tabla, pero su capital pendiente sigue en cero.
6. Recargar reinicia la demostración. El selector de perfiles es una herramienta de revisión, no autenticación. Cliente y Superadministrador tienen sus propias vistas y no incluyen el dashboard del comercio.

## Fecha y moneda

El dashboard representa una **consulta fija al 30 de octubre de 2026**. El periodo de cobros es del **1 al 30 de octubre de 2026**. La fecha se mantiene explícita para no calcular una mora nueva con la fecha actual a partir de casos fijos. No es un reporte de hoy.

Todos los importes del dashboard están en **soles (PEN)**. La maqueta no agrega datos de otras monedas ni aplica un tipo de cambio. La integración deberá mantener monedas separadas.

## Indicadores y datos que los sustentan

| Indicador | Definición | Fuente en la maqueta |
|---|---|---|
| Capital pendiente | Capital original de compras que todavía no se devuelve. Excluye intereses, incluso los capitalizados durante la gracia, porque no representa el saldo financiero completo del plan. | Pedro: S/ 500 mientras `paid=false`. Lucía: S/ 1,200 solo si `registered=true`. Los demás clientes: cero. |
| Cobros del periodo | Dinero recibido en pagos, incluyendo devolución de capital e intereses. **No es ganancia ni utilidad.** | S/ 510.08 si `paid=true`; caso fijo del pago de Pedro el 30 de octubre. |
| Capital vencido | Parte del capital pendiente cuya fecha de pago ya pasó. Está incluida en el capital pendiente: no se suma de nuevo. | S/ 500 de Pedro si no se pagó. Su vencimiento fue el 25 de octubre. |
| Clientes con saldo | Cantidad de clientes con capital pendiente mayor que cero; el denominador es el total de clientes de la demo. | Filtrado de las filas de `dashboardData()`. |

El límite de crédito de cada cliente proviene de `clients[].limit`; no se sustituye por un límite genérico fijo. La línea autorizada no es deuda ni dinero entregado al cliente.

## Gráficos y diagrama

- **Barras de capital pendiente por cliente:** misma fuente que el primer indicador, con nombres, importes, escala explícita y tabla accesible. Su escala se ajusta al máximo de los valores mostrados, con base mínima S/ 500.00.
- **Distribución vigente/vencido:** divide ese mismo capital, sin añadir intereses. La parte vencida tiene textura además de color; nombres e importes están escritos. Los valores también se pueden leer sin interpretar la figura.
- **Pagos que requieren atención:** Pedro pendiente por S/ 510.08 (capital 500 + compensatorio 7.31 + mora 2.77); Lucía, si fue registrada, primera cuota por S/ 427.10 el 25/11/2026. No se agrega el total del plan como si venciera en octubre.
- **Diagrama de la compra de Lucía:** compra 08/10 → corte 10/10 → fin de gracia 25/10, sin cuota → primera cuota 25/11. Es una explicación del Reto 4, no una regla universal para Fin de mes.

Las métricas son agregaciones de los mismos estados ficticios que ya usan las pantallas. El dashboard no calcula el método francés, tasas equivalentes ni una liquidación nueva; consume los resultados fijos del prototipo.

## Decisiones y límites

Se conservan la paleta, tipografía y componentes de v2. Se añaden agrupación de indicadores, gráficos SVG con textos accesibles y tabla alternativa, y un diagrama de fechas para orientar decisiones del comercio.

En escritorio (desde 651 px), la franja de demostración permanece arriba y la barra lateral se mantiene debajo de ella. Un `ResizeObserver` mide la altura real de esa franja, incluso si su texto se distribuye en dos líneas; la barra lateral usa el resto del viewport. La navegación tiene desplazamiento propio y «Mi cuenta» queda fuera de ese área. No se fija la altura de `main` ni del documento para acomodar tablas. En móvil se conserva la navegación de v2.

No se incluyen porcentajes de crecimiento sin historial, puntuaciones de riesgo, capacidad «óptima», utilidades, intereses cobrados como ganancia ni gráficos de relleno. Tampoco se atribuyen decisiones a los reels de Instagram: su análisis corresponde a otra parte de esta revisión.

Quedan pendientes la aceptación visual, el contraste con datos reales después de integrar, tema oscuro, zoom nativo, dispositivos físicos, pruebas con lector de pantalla y contratos de servidor. Este archivo no modifica el Word, algoritmo, esquema, datos ni código de producción.

## Verificación de esta entrega

- JavaScript extraído y comprobado con `node --check`.
- Casos de estados del dashboard comprobados con `node verificar_dashboard.mjs`.
- Fuente v2 conservada con SHA-256 `5960cb21ba028fb33738c3d6a641daca3c415d44ead1e2d969a8fcbea86166a2`.
- Revisión visual, de interacciones y teclado en navegador documentada en [PRUEBAS.md](PRUEBAS.md), con sus límites.

`crear_v3.py` documenta la transformación de la maqueta v2. `prototipo-check.mjs` es el script extraído para la comprobación de sintaxis, no una dependencia de ejecución.

El archivo extraído se ignora en Git. Las recomendaciones de los seis videos y sus límites están en [ANALISIS_REFERENCIAS.md](ANALISIS_REFERENCIAS.md).
