# Dirección visual candidata

Estado: propuesta para aceptación visual de Piero. No es un cambio de marca aprobado ni un reemplazo de las reglas del informe. Los valores se implementan solo en el prototipo.

## Intención

Un cuaderno de crédito comercial legible: identificar persona, compra, fecha e importe antes de confirmar. La información financiera lleva la jerarquía; no se añaden gráficos para llenar espacio. La secuencia compra → fin de gracia → primera cuota responde a una dificultad real observada en los retos.

Se conserva la familia de colores azul/gris y verde de CrediLocal, con superficies claras y navegación oscura para esta primera propuesta. No se da por aceptada esta paleta: la revisión permite cambiarla antes de migrar componentes.

## Valores implementados

Fuente de verdad de la maqueta: variables de `:root` en `prototipo.html`. No se copian aún a `src/presentacion/web/styles.css`.

| Uso | Valor |
|---|---|
| Navegación | #172b3b |
| Texto | #203747 |
| Texto secundario | #526777 |
| Bordes | #d6e0e7 |
| Fondo / superficie | #f3f6f8 / #ffffff |
| Acción principal | #0f766e |
| Fondo de éxito | #e9f4f1 |
| Error / advertencia | #a32930 / #8b5800 |
| Tipografía | Segoe UI, Arial, sans-serif; números tabulares |
| Tamaños | Base 15px; título 30px, 25px estrecho; sección 19px; ayudas 13px |
| Espaciado | Bloques 22–24px, campos agrupados, tarjeta 24px escritorio y 18px estrecho |
| Forma | Tarjeta 12px, control 7–8px; sombras solo en diálogos |
| Controles | Botones/entradas al menos 44px; ayuda 28px |

## Decisiones de composición

- Una tarea por vista: listado de clientes, alta y ficha separados, con regreso visible.
- Venta: persona → datos de compra → productos; condiciones y resumen juntos, debajo en estrecho.
- Crédito: cifras de límite, capital y disponible acompañan una barra descriptiva; sin «capacidad óptima» inventada.
- Producto: fotografía, nombre, código y precio a crédito en tarjeta seleccionable. El precio no simula ser editable.
- Diálogo: cabecera y acciones estables, contenido con desplazamiento propio y fondo inerte. No depender de hover.
- Cuenta: acceso identificable en la navegación, acciones dentro de diálogo compartido; rol visible.
- Auditoría: referencia y acción legibles primero; detalle técnico consultable, sin convertir un ID de tienda en autor.
- Estados: texto explícito para éxito, error, vacío y sin coincidencias. El color refuerza el significado.

## Pendiente antes de convertirla en sistema visual definitivo

Aprobación de aspecto, tema oscuro, acceso completo, formularios completos de productos/tiendas/clientes, estados de servidor, imágenes inválidas, datos largos y pruebas con tecnologías de asistencia. La documentación definitiva de tokens y componentes se añadirá a la aplicación junto con su implementación, para no convertir una propuesta sin aceptar en una regla permanente.
