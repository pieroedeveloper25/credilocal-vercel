# Revisión independiente de requisitos y consistencia

Revisor: subagente de requisitos. Fecha: 05/11/2026.

## Alcance y estado

Revisados `PLAN_Y_DECISIONES.md`, `MATRIZ_PENDIENTES.md`, `REQUISITOS.md` y tres pasadas del código de `prototipo.html`, incluida la versión final. Este revisor no realizó inspección visual ni prueba de navegador. Se distingue abajo la verificación propia por lectura de código de los resultados de navegador informados por el agente principal.

## Plan y matriz

No se detecta contradicción bloqueante con el enunciado en estos dos documentos. Se preservan permisos, ayuda por campo, reglas financieras, base y pseudocódigo; la aprobación del aspecto queda pendiente y el prototipo no cierra automáticamente los 57 puntos.

La aceptación debe identificar qué se comprobó mediante código y qué se probó realmente en navegador. El contenido del prototipo es una demostración, no prueba de seguridad o cálculo para entradas arbitrarias.

## Hallazgos accionables en la primera versión del HTML

### Hallazgos de la primera pasada y estado tras corrección

1. **Resuelto en código: límite guardado distinto del mostrado.** `creditBlock` ahora recibe límite, y ficha/venta pasan `c.limit` o `selected.limit`; disponible, porcentaje y `aria-valuemax` derivan del valor correcto. Pendiente comprobación del principal en navegador.
2. **Resuelto en código: condiciones editables y teléfono descartados al guardar.** La versión final de `saveClient` conserva teléfono, máximo, corte, hora, pago y TEA; `clientDetail` refleja los campos y venta muestra corte/pago correspondientes. `saleSummary` genera las opciones hasta el máximo del cliente y su texto deriva del mismo dato; `saveClient` ajusta la selección previa para no superar el nuevo máximo. Estos cambios se confirmaron por lectura de la versión final.
3. **Resuelto en código: capital de Lucía atribuido a otra persona.** `salePage` ahora exige `registered && draft.client==='lucia'` para atribuir 1200 comprometidos; otra persona conserva capital independiente y su compra en borrador. Pendiente prueba en navegador.

### Correcciones recomendadas antes de probar

- **Resuelto en código:** `sumItems` retorna0 cuando `qtyValid` falla y cada subtotal inválido muestra «—». La barra se acompaña de «Corrige las cantidades...» y no utiliza cantidad negativa/exponente. La versión final valida al evento input, relaciona el campo con quantity-error y restaura foco/selección tras actualizar. Todavía no se probó en navegador por este revisor. Importes válidos que excedan línea pueden mostrar disponible negativo en el prototipo: falta representar el bloqueo por límite como estado específico, aunque no pueden registrarse porque solo se registra Reto4.
- El flujo de pago disponible es Pedro/Reto 3, y Lucía/Reto 4 expresamente no se liquida. La separación está bien indicada; la entrega debe decir que son dos recorridos de demostración, no declarar completo cliente→venta→estado→pago para una misma operación.
- Alta/baja de tiendas no está representada en este prototipo, solo organización del perfil. Tampoco hay diálogo de baja de cliente/producto. No afirmar verificados esos criterios de matriz.
- No todos los campos tienen ayuda contextual: datos personales, máximo, hora, pago y TEA carecen de un medio propio de indicaciones equivalente al futuro sistema. No presentar esta muestra como cierre de la exigencia de ayuda por campo.
- Cerrar sesión solo muestra mensaje y conserva datos/rol; la UI ya dice demostración. No contar esto como prueba de limpieza del borrador o seguridad de cierre real.

## Resultados de navegador informados por el agente principal

El agente principal comunicó que probó alta ficticia de Ana con línea S/ 3,500, corte12, pago28, máximo1 y teléfono900111222: los datos se conservaron y venta ofreció máximo1. También informó correcciones y comprobaciones de error de cantidad en vivo, foco contenido en diálogo y desbordamiento móvil. Este revisor no ejecutó esas pruebas: su evidencia debe consultarse en el informe de pruebas del principal, sin atribuir estos resultados a una revisión independiente en navegador.

## Dictamen de esta revisión

Los tres bloqueantes de consistencia detectados por este revisor quedan corregidos por lectura de código, incluidos los dos remanentes de teléfono y máximo. No se identifica mezcla de escenarios Reto3/Reto4/OP2026007 en la versión final. Permanecen límites explícitos de alcance: cálculo fijo, flujo de pago independiente de Pedro, falta de liquidación de Lucía, bajas/altas de tiendas no representadas, ayuda incompleta por campo y cierre de sesión simulado. No equivalen a cumplimiento integral de las57observaciones ni a autorización para alterar dominio/base.

## Consistencia confirmada por lectura del código

- Reto 4 usa código **DEMO-0001**, no OP-2026007. Reto 3 se rotula como escenario independiente de Pedro y OP-2026007 aparece únicamente en auditoría como compra S/ 100.
- Máximo del ejemplo es tres; selector ofrece 1/2/3, no seis o doce.
- Gracia 17 días, interés 17.55 y capital 1217.55; fin 25/10 explícitamente sin cuota; primeras fechas 25/11, 25/12, 25/01; importes 427.10/427.10/427.09.
- Total de cronograma 1281.29 e interés81.29 coinciden con los datos de referencia establecidos, sin incorporar mora posterior.
- Auditoría identifica compra10/10, registro05/11 y26días. Permite buscar código completo o número por texto de ejemplo; no demuestra corrección en app conectada.
- El selector de rol dice vista previa y no se presenta como login real. No se observó código que llame a la API ni cambie dominio/base en el HTML.

## Criterios específicos para la nueva pasada

1. Mantener identidad de escenario durante cliente → venta → estado → pago. Reto 4 (S/ 1,200, cuotas) no puede desembocar sin explicación en pago S/ 510.08 del Reto 3 ni usar OP-2026007, que representa venta S/ 100 del Reto 7.
2. Si cliente admite máximo tres cuotas, no ofrecer seis/doce ni rotular máximo como cuotas obligatorias. Seleccionar tres no debe adelantar primera cuota a 25/10.
3. Reto 4: fin de gracia 25/10 sin pago; capital ajustado S/ 1,217.55; primera cuota 25/11, luego 25/12 y 25/01; importes 427.10, 427.10, 427.09.
4. Auditoría OP-2026007: compra 10/10/2026, registro 05/11/2026, retroactiva 26 días; Sistema como tienda ausente no se confunde con autor automático.
5. Límite y disponible no se deducen de total con intereses; no inventar métricas o actividad para llenar pantallas.
6. No registrar transacciones reales, modificar dominio ni presentar rol de vista previa como autenticación segura.
