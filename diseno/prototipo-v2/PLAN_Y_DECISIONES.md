# CrediLocal — revisión y prototipo antes de integrar

Estado: ejecución de la fase de revisión/prototipo autorizada por Piero el 05/11/2026. Las decisiones visuales son candidatas para revisar, no preferencias ya aprobadas.

## Entregables y secuencia

1. REQUISITOS.md: restricciones cotejadas con enunciado, Word y código.
2. MATRIZ_PENDIENTES.md: trazabilidad de las observaciones, incluidas las reabiertas después de anteriores cambios.
3. prototipo.html: recorridos y estados con datos ficticios, separado de la aplicación conectada.
4. REVISION_Y_PRUEBAS.md: resultados observados y límites, incluida revisión independiente.
5. Después de la aceptación del prototipo, migrar componentes y flujos completos a la aplicación en rama aparte. La autorización para preparar e implementar el plan no equivale a aceptación del aspecto aún no mostrado.

## Decisiones de esta fase

- Conservar el alcance del sistema, permisos, motor, pseudocódigo y base de datos. No tocar Word en esta ronda.
- Evitar otra reestructuración grande antes de comprobar un recorrido navegable.
- Evaluar primero una propuesta de base clara, navegación oscura y acento sobrio, con jerarquía por espacio, texto y agrupación. Es candidata: Piero no ha aprobado todavía los colores.
- Usar nombres comprensibles y ayudas breves disponibles al pulsar y con teclado. Conservar términos financieros cuando sean necesarios, explicados en contexto.
- Catálogo visual en diálogo con imágenes, búsqueda y selección múltiple. No sustituirlo por otra barra desplegable simple.
- Distinguir línea autorizada, capital comprometido, disponible y deuda a pagar. Distinguir borrador, simulación y operación registrada.
- No utilizar un dashboard decorativo para llenar espacios del superadministrador. Orientar sobre las acciones que ya corresponden a su perfil.
- Los estados de ejemplo del prototipo no demuestran cálculos arbitrarios ni seguridad real. Su modo de rol es una vista previa, no autenticación.

## Revisiones con responsabilidades distintas

- Requisitos: comprobar fidelidad al enunciado, condiciones financieras, permisos y documento.
- Usabilidad: depurar todas las observaciones y definir aceptación observable; no contar una preferencia del revisor como investigación con usuarios.
- Implementación del prototipo: representar decisiones y límites de manera coherente.
- Revisión principal: recorrer el resultado en navegador, buscar contradicciones, revisar foco, errores, móvil y restauración de estado. Corregir antes de presentarlo.

## Criterios usados y fuentes consultadas en esta ronda

- Estado visible, lenguaje familiar, prevención y recuperación de errores, consistencia y ayuda contextual: [heurísticas de Nielsen Norman Group](https://www.nngroup.com/articles/ten-usability-heuristics/). Se aplican como criterios de evaluación, no como garantía de que una preferencia visual sea correcta.
- Diálogos con foco dentro, Escape, fondo inerte y retorno al activador: [patrón modal de W3C APG](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
- Errores que identifiquen el campo y permitan corregirlo: [resumen de errores de GOV.UK](https://design-system.service.gov.uk/components/error-summary/).

## Integración posterior y recuperación

Rama creada desde feature/redisenio-ux: feature/prototipo-ux-v2. Se versionarán propuesta y evidencia antes de integrar el diseño a src. Se pueden revisar o descartar sin alterar las operaciones de la base existente. La integración se dividirá en componentes comunes, flujo comercial y perfiles secundarios; cada bloque necesita pruebas de comportamiento y revisión visual. No se marcarán los 57 puntos como resueltos por entregar este prototipo.
