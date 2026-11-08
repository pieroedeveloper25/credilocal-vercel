# Propuesta de interfaz CrediLocal

**Candidata para revisión visual. No integrada al sistema real.** Rama: `feature/prototipo-ux-v2`.

## Abrir y revisar

Abre `prototipo.html` con tu navegador. Es un único archivo con fotografías embebidas: no requiere instalar paquetes, iniciar el servidor de CrediLocal ni conectarse a internet.

1. Pulsa **Cargar ejemplo Reto 4**. Revisa crédito disponible, fechas, resumen y cronograma.
2. Abre **Agregar del catálogo**. Busca, selecciona varios productos, cancela o agrégalos; prueba también teclado y Escape.
3. Navega a Clientes y vuelve a Venta: conserva el borrador mientras la pestaña siga abierta.
4. Registra la venta **de ejemplo** y consulta Estado de cuenta. En el selector **Vista previa del perfil**, revisa Cliente y su cronograma.
5. En Comercio → Registrar pago, busca Pedro para revisar el caso independiente del Reto 3. Solo admite el importe exacto de ejemplo, S/510.08.
6. Cambia a Superadministrador → Auditoría y busca OP-2026007 o2026007. Es una referencia ficticia de la maqueta basada en el caso observado; no consulta la base real.

Recargar borra los cambios ficticios. El selector de perfiles no es autenticación. No escribas contraseñas reales.

## Qué se entrega

- `MATRIZ_PENDIENTES.md`:57observaciones con prioridad, propuesta y aceptación; no se dan todas por resueltas.
- `REQUISITOS.md`: restricciones del enunciado, documento y reglas existentes.
- `DIRECCION_VISUAL.md`: colores, composición y tipografía candidatos.
- `REVISION_INDEPENDIENTE.md`: revisión de código por otro agente y correcciones detectadas.
- `REVISION_Y_PRUEBAS.md`: interacciones ejecutadas por el principal, evidencia y límites.
- `CASOS_DE_REVISION.md`: criterios de prueba de prototipo e integración.
- `PROTOTIPO_ALCANCE.md`: comportamientos y escenarios soportados.
- `PLAN_Y_DECISIONES.md`: secuencia y fuentes de diseño.
- `fuentes-fotos.json`: procedencia de las fotografías existentes incorporadas a la maqueta.

Las dos imágenes `prototipo-venta-final.jpg` y `prototipo-catalogo-final.jpg` muestran la versión final de escritorio. Otras capturas citadas en el informe de revisión permanecen en la carpeta local de auditoría, fuera de esta propuesta versionada.

## Límite importante

La simulación usa resultados fijos del Reto4 y bloquea el registro fuera de ese escenario. El pago de Pedro es otro caso fijo y está separado de Lucía. **Este archivo sirve para revisar la experiencia; no sustituye el motor financiero ni valida su precisión.**

La siguiente fase es aceptar o corregir esta dirección visual y después migrar componentes y recorridos completos a React. Acceso, tema oscuro, formularios completos, bajas, red, seguridad, zoom nativo y pruebas financieras/persistencia quedan pendientes. No se cambió código de producción, Word, algoritmo, esquema ni datos reales en esta fase.
