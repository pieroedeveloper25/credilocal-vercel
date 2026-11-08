# CrediLocal: restricciones y aceptación del rediseño

Fecha: 05/11/2026. Revisión de solo lectura. Este documento no declara pruebas funcionales nuevas ni modifica el algoritmo, la base de datos o el informe Word.

## Fuentes y prioridad

1. Decisiones de Piero: prototipo navegable y revisión antes de integrar; proteger algoritmo, pseudocódigo y base de datos; trabajar en rama aparte; corregir el informe más adelante.
2. `SI642_Enunciado del Trabajo Final 2026-20.md`: numerales 1–6, apartado de diseño de interfaz, sistema de información y Anexo A.
3. `reporte/TP_FinanzasIngenieríaEconómica_CrediLocal_G4_actualizado.docx`: conceptos y estructura observados directamente en su XML; mantiene método francés, gracia total capitalizada, límite, pago completo y prelación.
4. `auditoria_informe/TP_Finanzas_Grupo4.md`: extracción anterior, útil para ubicar capítulos pero no sustituye el Word actual.
5. Código actual en `Sistema/credilocal/src/`: prueba de comportamiento implementado, no autorización para cambiar reglas.
6. `MEJORAS_DISENO_PENDIENTES.md`: observaciones y propuestas; sus estados históricos no equivalen a aceptación actual.

## Reglas que el diseño debe conservar

| Área | Obligación | Evidencia principal | Criterio de aceptación |
|---|---|---|---|
| Roles | Superadministrador administra altas/bajas de tiendas; comercio sus productos, clientes, ventas y cobros; cliente consulta sus propios datos. | Enunciado 1–3; `src/presentacion/web/App.tsx`. | Cada rol tiene navegación pertinente. Ningún enlace o prototipo sugiere que el cliente administra ventas o ve cuentas ajenas. Las restricciones deben mantenerse también en servidor al integrar. |
| Multi-tienda | Plataforma genérica para diferentes negocios y aislamiento por tienda. | Enunciado, introducción y numeral 1. | Etiquetas genéricas; nombres de taller solo como datos de ejemplo. No añadir campos obligatorios de inventario de talleres. |
| Productos | Identificación, descripción, unidad, imagen, precios contado/crédito, modalidades; alta/baja. | Enunciado 2. | El nuevo catálogo no elimina datos exigidos; selección visual y búsqueda conservan nombre, imagen y precio crédito inequívocos. Marca y proveedor se distinguen cuando existen. |
| Clientes | Datos generales, tasa nominal/efectiva, moneda, límite, máximo de meses, corte y pago. | Enunciado 3. | Todos los campos siguen disponibles; ejemplos sugeridos se identifican como tales; condiciones no se presentan como deuda ya contraída. |
| Ayuda | Indicaciones electrónicas en cada campo de diálogo. | Informe, apartado 6.b. | Cada campo tiene etiqueta y ayuda accesible por teclado/toque; reducir texto permanente no elimina la ayuda. No depender únicamente de hover. |
| Tasas | Conversiones nominal/efectiva explícitas, año 360 y mes financiero 30; al menos siete decimales en tasas, dinero dos decimales. | Anexo A; `src/contexts/credit-origination/dominio/motor.ts`. | Formato monetario consistente, moneda visible y tasas sin redondeo prematuro. La UI no sustituye conversiones por divisiones aproximadas. |
| Cuotas | Método francés vencido simple ordinario; gracia total antes del corte capitalizada; cuotas comienzan el mes siguiente. | Enunciado 4; `generarCronogramaFrances` en `motor.ts`. | Mostrar fin de gracia separado de primera cuota. Ajuste final de centavos permitido: no prometer cuotas exactamente idénticas cuando la última ajusta. La fila de gracia tiene pago cero. |
| Pago único | Interés desde compra al vencimiento; después del corte pasa al siguiente mes; mora según atraso. | Enunciado 5; `resolverCiclo` y `liquidarFinDeMes` en `motor.ts`. | Mostrar vencimiento concreto y separar interés ordinario/mora; «Fin de mes» puede aclararse con «Pago único» sin cambiar su fecha. |
| Corte | Fecha y hora determinan el ciclo; compra exactamente a la hora del corte pertenece al vigente según implementación. | `antesDelCorte` en `motor.ts`. | Comparaciones de hora de compra no alteran condiciones de corte del cliente. El prototipo distingue ambas etiquetas y no promete comportamiento distinto en la igualdad. |
| Límite | No permitir que capital comprometido más compra supere el límite; igualdad aceptada. | Enunciado 5; `src/contexts/customer-management/dominio/lineaCredito.ts`. | Barra y cifras distinguen límite, comprometido y disponible; si incluyen compra en borrador debe decirlo. No sumar intereses a la línea por una decisión visual. |
| Cobranza | Pago completo, sin parciales ni excedentes; orden mora, compensatorio, capital. | Enunciado 5, Anexo A; `src/contexts/billing-and-collections/dominio/cobranza.ts`, `prelacion.ts`. | Simplificar la pantalla conserva desglose y orden; botón bloqueado con explicación si importe no coincide. No ofrecer «pagar una parte» ni ahorro por prepago inexistente. |
| Listado | Generación al corte, compras ordenadas por fecha e intereses; mora en concepto independiente cuando corresponde. | Enunciado 6. | Conservar listado guardado separado de liquidación calculada a fecha real. No presentar como mora conocida al corte el atraso ocurrido después. |
| Registro | Acceso con usuario/clave y todas las operaciones registradas en base de datos. | Apartado 9. | Borrador no se anuncia como venta guardada. Confirmación solo tras éxito real al integrar. Pantalla de auditoría es consulta adicional, no sustituto del registro. |
| Fechas | No registrar compras/pagos futuros; retroactivos identificados; días pactados se ajustan a último día existente del mes. | `src/shared/dominio/fechas.ts`, `src/aplicacion/detalleAuditoria.ts`, dominio de cobranza. | Simulación futura se identifica como tal y no habilita registrar. Fechas de compra y registro se distinguen. Ayuda de días 29–31 explica febrero sin alterar base 360/30. |
| Bajas | Conservar historial, impedir nuevas ventas de producto/cliente de baja y acceso de tienda de baja. | Enunciado 1–3 y pruebas históricas registradas por Piero. | Diálogo propio explica consecuencia y permite cancelar. No sustituir baja por borrado físico ni bloquear cobro de deudas históricas. |

## Propuestas que requieren límites claros

- **23, 42:** selector de día y ayuda superpuesta son compatibles; calendario con fecha única que elimine la recurrencia mensual o ayuda solo por ratón no lo son.
- **24:** vaciar valores no equivale a eliminar tipos, moneda o condiciones requeridas. Señalar valores sugeridos evita confundir ejemplo con dato ya guardado.
- **27, 50, 52:** barra de línea no mide deuda exigible con intereses ni dinero depositado al cliente; máximo de cuotas no es plazo obligatorio de todas las ventas.
- **30:** diálogo de catálogo con varios productos es compatible si respeta modalidades, precios de catálogo, productos activos y una sola venta. Modificar precio de catálogo desde venta sería cambio de negocio aparte.
- **33, 39:** retirar insignias legales permanentes es compatible con conservar información y fórmulas en ayudas pertinentes; no atribuir al artículo legal una regla que solo se verificó en el enunciado. No se revisó normativa externa en este documento.
- **40, 57:** mejorar navegación del superadministrador no autoriza inventar reportes, métricas o poderes nuevos. Actualmente tiene Gestión de tiendas y Auditoría.
- **46:** conservar borrador local es compatible; registrar automáticamente, compartirlo entre cuentas o confundirlo con persistencia financiera no lo es. Definir al implementar limpieza por cambio de sesión/tienda.
- **48:** filtrar letras no sustituye validaciones de dominio; admitir formatos monetarios debe coordinarse con el parser existente sin convertir importes ambiguos silenciosamente.
- **49:** mover modalidad junto al resumen puede funcionar; no ocultarla después de registrar ni separar visualmente su efecto sobre cronograma y vencimiento.
- **51:** «Pago único (Fin de mes)» aclara la modalidad; no equivale a último día de calendario ni a treinta días desde cada compra.
- **55–56:** mostrar y buscar OP-2026007 puede hacerse en presentación, manteniendo el ID 2026007 y formato histórico de auditoría. «Sistema» en columna Tienda hoy representa tiendaId ausente; no permite inferir autor automático. Cuando no haya nombre resoluble, mostrar «Tienda #1» o «Sin tienda asociada», sin inventarlo.

## Casos de aceptación con datos ya conocidos

Estos valores son referencias históricas de los retos, no resultados de una nueva ejecución realizada por este revisor.

1. **Cuotas con gracia:** S/ 1,200, TEA 36 %, compra 08/10/2026 antes del corte 10, pago 25 y tres cuotas: gracia 17 días, interés S/ 17.55, capital ajustado S/ 1,217.55; pagos S/ 427.10, 427.10 y 427.09, desde 25/11. Fin de gracia 25/10 debe decir «sin pago».
2. **Corte por hora:** S/ 100, compra 10/10/2026, corte 18:00 y pago 25: a las 17:59 vence 25/10, interés S/ 1.29; a las 18:01 vence 25/11, interés S/ 4.01. Cambiar solo hora de compra.
3. **Límite:** límite S/ 3,000 y comprometido S/ 2,900: cuatro unidades de S/ 100 rechazadas; una unidad aceptada, disponible final cero. La cantidad debe verse junto al precio unitario y subtotal.
4. **Auditoría:** OP-2026007 debe poder localizarse tanto por referencia completa como por 2026007, con venta 10/10 y registro 05/11 identificados; retroactiva 26 días. Buscar sin coincidencias ofrece limpiar filtro y no afirma ausencia global de registros.
5. **Cobranza:** total histórico S/ 510.08: S/ 300 y S/ 600 no se registran; importe exacto sí, con desglose en orden mora/interés/capital. Solo en entorno aislado al verificar.

## Condiciones para aprobar el prototipo y luego la integración

- El prototipo muestra los flujos cliente → venta → estado → pago, navegación/cuenta, catálogo visual y auditoría; indica que usa datos de demostración y no registra dinero real.
- Existe trazabilidad de cada observación 1–57 a una decisión, pendiente justificado o comprobación; «implementado» histórico no significa resuelto.
- Se distingue una simulación navegable de una app conectada. Valores fijos del prototipo no prueban el motor financiero.
- Revisar teclado (orden de foco, Escape, retorno al activador), diálogo, ayuda, ausencia de solapamientos y estados vacío/error/éxito. Capturas solas no prueban todo esto.
- Revisar al menos escritorio y móvil estrecho, zoom 200 %, texto largo y menú de cuenta; no depender solo del color para estados.
- La integración permanece en rama aparte; sin migraciones de base ni modificaciones del pseudocódigo para justificar cambios de UI.
- Ninguna verificación aquí permite declarar cumplimiento global de rúbrica: informe, exposición, trazabilidad de IA y entregables tienen aceptación independiente.
