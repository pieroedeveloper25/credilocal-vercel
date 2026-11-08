# Resultado de revisión del prototipo

Fecha: 05/11/2026. Estado: **candidato navegable preparado para revisión visual de Piero; integración al sistema pendiente**. No se declaran corregidos los 57 pendientes de la aplicación real.

## Evidencia y alcance

Se revisaron el enunciado, Word y código en lectura; se depuraron 57 identificadores sin faltantes ni duplicados. Revisores especializados produjeron REQUISITOS.md, MATRIZ_PENDIENTES.md y REVISION_INDEPENDIENTE.md. El agente principal ejecutó las interacciones del prototipo en Brave. Es una revisión asistida, no un estudio independiente con usuarios.

Se reprodujo además en la aplicación conectada el fallo de buscar OP-2026007: no coincide hasta limpiar la búsqueda. Captura antes-auditoria.jpg. Se restauró el filtro vacío. No se registraron ventas ni pagos reales durante esta ronda.

## Recorridos y resultados observados

| Paso | Revisión | Resultado / estado |
|---|---|---|
| 1. Venta nueva | Cliente/productos vacíos, fecha y hora actuales, motivo de bloqueo | Correcto en la demo. Sin cliente ya no se afirman condiciones de una persona no seleccionada. |
| 2. Cliente | Alta vacía: foco al nombre y error. Alta ficticia Ana, DNI12345678, ana@example.com, teléfono900111222, límite3500, máximo1, corte12 y pago28 | Datos conservados y ficha coherente; primera venta selecciona Ana y ofrece solo1cuota. No es el formulario financiero completo de producción. |
| 3. Catálogo | Fotos, selección múltiple de filtro/batería, búsqueda sin resultados y agregado | Correcto. Las seis fotografías embebidas cargan; selección retenida al filtrar y dos productos añadidos una vez. |
| 4. Cantidad | -1 y letras | Error y bloqueo inmediatos, subtotal inválido no presentado como importe válido, foco conservado. Se corrigió un listener que inicialmente solo validaba al salir del campo. |
| 5. Borrador | Cargar Reto4, ir a Clientes y volver | Cliente, producto, fecha08/10 y cantidad1 conservados. Es memoria de pestaña, no persistencia después de recargar. |
| 6. Cuotas | Resumen, cronograma y registro ficticio | Gracia17días, saldo1217.55, cuotas427.10/427.10/427.09 y fechas25nov/25dic/25ene coherentes. El registro demo inhabilita el botón repetido. Valores fijos, no nueva prueba del motor. |
| 7. Estado / cliente | Antes y después de registrar demo, portal y cronograma | Vacío explícito antes de registro; después muestraDEMO-0001, capital1200, disponible800, total1281.29 y tres cuotas. Navegación del cliente limitada a sus vistas en esta maqueta. No prueba permisos reales. |
| 8. Pago | Buscar Pedro; probar300,600,510.08 | Parcial/excedente bloqueados; exacto registra soloDEMO-P001. Mora2.77, compensatorio7.31 y capital500. El caso está identificado como independiente de Lucía. Rótulos finales distinguen desglose pagado de saldo pendiente. |
| 9. Superadministrador | Tiendas y auditoría; OP-2026007,2026007,inexistente,limpiar | Referencias completa/número encuentran el mismo registro ficticio; no-resultados y recuperación correctos. Se muestran tienda, autor, compra y registro diferenciados. Altas/bajas de tiendas no implementadas en prototipo. |
| 10. Ayuda/cuenta | Abrir ayudas y cuenta, cerrar con Escape | Información superpuesta sin desplazar formulario; Escape y retorno al activador comprobados. Cambio de contraseña real y cierre de sesión real no se prueban en la maqueta. |
| 11. Teclado modal | Buscador→ShiftTab→Cerrar→ShiftTab→Cancelar; Tab→Cerrar; Escape | Ciclo dentro del diálogo y retorno aopen-products correctos tras añadir control compartido de Tab. El fondo queda inerte mediante diálogo modal nativo. |
| 12. Estrecho | Ancho efectivo390CSS; tabla, catálogo y foco. Reflujo adicional640CSS | Se corrigieron columnas mínimas de grid y un texto oculto absoluto. En venta a390, client373/scroll373; a640, client623/scroll623: sin desborde de página. Tabla conserva scroll propio. Diálogo dentro del viewport por métricas; acciones alcanzables. |

## Correcciones surgidas al revisar la propuesta

- Límite de cliente y condiciones editadas se estaban sustituyendo por valores fijos; ahora se conservan y presentan.
- Capital registrado de Lucía afectaba visualmente otros clientes; se limitó al ejemplo correspondiente.
- Cantidades inválidas podían contaminar resumen o quedar sin validar hasta perder foco; se corrigió.
- Máximo de cuotas y teléfono se perdían; se corrigieron y se volvió a comprobar un cliente distinto.
- Contenedores grid y texto oculto generaban desborde móvil; se corrigió sin ocultar globalmente el overflow de la página.
- El ciclo Tab podía salir del contenido del diálogo; se añadió ciclo compartido y se repitió la prueba.

## Capturas

- prototipo-venta-final.jpg: captura aceptada, versión final en escritorio.
- prototipo-catalogo-final.jpg: captura aceptada, modal con cabecera, seis tarjetas y acciones visibles.
- prototipo-auditoria.jpg y prototipo-pago.jpg: capturas de una iteración anterior de esta misma ronda, anteriores a los últimos ajustes de rótulos; no usar como imagen definitiva del informe.
- prototipo-catalogo-movil-final.jpg: captura parcial con recorte superior del mecanismo de captura; **no aceptada como evidencia visual completa**. Las métricas de390CSS y la interacción se comprobaron, pero no se afirma una captura móvil integral válida.

Hubo fallos intermitentes de captura en la pestaña de prueba después de emular tamaños. Se preparó una pestaña nueva del mismo navegador para obtener las dos capturas finales de escritorio. Se restauró la emulación al tamaño normal.

## Comprobaciones estáticas

- Extracción del script y `node --check`: correcto.
- Conteo de matriz:57filas,0faltantes,0duplicados.
- Consola de la pestaña de entrega: sin errores/advertencias devueltos en la consulta final.
- Auditor estático de la aplicación existente en modo estricto:14hallazgos (13decisiones de propiedad de controles nativos no documentadas y1regla de textarea). Archivo auditoria-estatica-aplicacion.json. Son hallazgos de esa herramienta de diseño; no prueban14fallos financieros. No se maquillaron creando contratos para dar por corregida una aplicación que aún no se migra.
- No se repitió build ni suite financiera: no se cambió código de producción. El prototipo es HTML/JS sin compilación; las pruebas pertinentes de esta fase fueron interacción y sintaxis.

## Lo que sigue pendiente

Aprobación del aspecto y sus patrones; acceso y tema oscuro; formularios y bajas completos; ayudas de todos los campos exigidas; estados de red, sesión y recuperación; permisos de servidor; pruebas financieras y persistencia en base aislada tras integrar. No se verificaron zoom nativo200%, lector de pantalla ni dispositivos físicos. El reflujo a640CSS no sustituye una prueba de zoom nativo.

No se modificó el Word, algoritmo, motor, esquema ni datos reales. Rama de propuesta: feature/prototipo-ux-v2. La revisión visual es el siguiente paso acordado antes de migrar esta dirección a la aplicación.
