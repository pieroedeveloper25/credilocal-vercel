# Alcance de la vista previa

`prototipo.html` es una demostración local, no una segunda implementación del motor financiero. No requiere compilación. Incluye seis fotografías del proyecto embebidas como data URLs; es un único archivo portable y no requiere servidor ni recursos externos.

## Recorridos implementados

- Comercio: buscar cliente, ficha y alta ficticia básica; conservar venta en memoria al navegar; seleccionar varios productos mediante diálogo con búsqueda; quitar productos; validar cantidad; elegir modalidad/plazo; cargar caso fijo del Reto 4; ver cronograma; registrar en la demostración; consultar estado de cuenta.
- Cobranza: seleccionar a Pedro, caso independiente del Reto 3 con S/ 510.08; mostrar mora S/ 2.77, compensatorio S/ 7.31 y capital S/ 500; bloquear importe parcial/excedente; aceptar importe exacto solo en la demo.
- Cliente: solo vistas de su estado y cronograma. El selector de perfiles es una herramienta de revisión, no autenticación.
- Superadministrador: orientación de Gestión de tiendas y consulta de auditoría ficticia. OP-2026007 y 2026007 encuentran la misma operación.
- Cuenta: diálogo de opciones; diálogo para probar validación de una clave ficticia, sin almacenarla; cierre de sesión de demostración explícito; reinicio con confirmación.

## Límites deliberados

- Solo se habilita el registro de venta para el escenario fijo del Reto 4: Lucía, 08/10/2026, KIT-001 de S/ 1,200, cantidad 1, Cuotas y plazo 3. Al alterar datos financieros se comunica que la simulación de ese caso no está disponible y se bloquea registrar. No se usa una fórmula aproximada para imitar el motor.
- La fecha y hora iniciales son las actuales del equipo; cargar el ejemplo cambia explícitamente esos datos.
- La primera cuota es 25/11/2026, distinta del final de gracia 25/10/2026. Tabla fija: 427.10, 427.10 y 427.09, total 1,281.29. No prueba cálculo ni persistencia reales.
- Estado usa el escenario del cronograma, sin liquidación actual ni mora posterior. Pago de Pedro tiene fecha fija de caso, no permite simular otras fechas.
- El alta de cliente es una maqueta funcional básica; no representa todos los campos/opciones de la aplicación existente. La integración debe conservarlos. Condiciones se guardan solo en memoria; no se recalculan equivalencias de tasas.
- Catálogo y tiendas no implementan altas, bajas, reactivaciones, carga de imágenes ni fallos de servidor en esta vista previa. No se simulan loaders, red, seguridad o auditoría persistente inexistentes.
- No hay almacenamiento persistente; recargar borra cambios y borradores. Cambiar el perfil de revisión no es un cambio de sesión real. En la integración, el borrador se aislará/limpiará por sesión y tienda.
- Temas oscuros y detalles completos del acceso quedan para la siguiente iteración. No se anuncia resolución de todas las observaciones 1–57.

## Sistema visual candidato

Valores únicos en `:root` del HTML: navegación `#172b3b`; texto `#203747`; secundario `#526777`; borde `#d6e0e7`; fondo `#f3f6f8`; superficie `#ffffff`; acción primaria `#0f766e`; superficie positiva `#e9f4f1`; error `#a32930`; advertencia `#8b5800`; radio de tarjeta 12px. Tipografía Segoe UI/Arial; números tabulares. Base 15px/1.5; títulos 30px (25px móvil), sección 19px, subtítulo 16px, ayudas 13px. Botones/inputs mínimo 44px, sidebar 238px, contenido máximo 1330px, separación de bloques 22–24px. Sin animación ornamental ni gradientes.

## Propietarios compartidos del prototipo

- Navegación/shell: `renderNav`, `navigate`, `render`, evento `hashchange`.
- Campos de búsqueda/limpieza: `search`, `syncClear`, `data-clear`.
- Diálogos y foco: `openDialog`, `closeDialog`, `<dialog>.showModal()`; Escape nativo y foco de retorno.
- Ayudas: diccionario `help`, `helpButton` y diálogo compartido.
- Cliente: `clientCard`, `filteredClients`, `saveClient`.
- Línea disponible: `creditBlock`.
- Selección de productos: `productCard`, `renderProducts`, `pendingProducts`.
- Simulación limitada: `isScenario`, `qtyValid`, `saleSummary`, `scheduleTable`.
- Moneda/escape de texto: `money`, `escapeHTML`.
- Feedback: `status`, `announce`, región `aria-live`.

Estos propietarios son candidatos de la maqueta, no sustituyen componentes existentes de React. La integración debe reutilizar o extender los propietarios reales de la app.

## Comprobación realizada por el autor del prototipo

Extracción de JavaScript y `node --check`: correcto. La revisión visual y de interacción en navegador corresponde al agente principal y se documentará por separado. No se afirma accesibilidad completa a partir de esta comprobación estática.
