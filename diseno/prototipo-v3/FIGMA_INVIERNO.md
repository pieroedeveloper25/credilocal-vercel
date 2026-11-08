# Propuesta en Figma · Invierno

Creada el 06/11/2026 por solicitud de Piero, conservando las propuestas HTML anteriores y el código de producción.

- Archivo: https://www.figma.com/design/ZoX1rzpW8uVuju9ETdGdJ5
- Dashboard: https://www.figma.com/design/ZoX1rzpW8uVuju9ETdGdJ5?node-id=4-115
- Recorrido: https://www.figma.com/proto/ZoX1rzpW8uVuju9ETdGdJ5?node-id=4-115&starting-point-node-id=4%3A115
- Sesión de herramientas: `580e5808-2a34-495e-9e37-47736e1c16ea`.

## Paleta

| Color de Piero | Aplicación |
|---|---|
| #EAF2F8 | Fondo general |
| #C9DCE8 | Bordes, selección y franja de demostración |
| #8AA9C4 | Acentos gráficos; no texto pequeño sobre blanco |
| #3E5C76 | Acciones y texto secundario |
| #1D2D44 | Navegación y texto principal |

Se añade blanco para tarjetas y formularios. Los gráficos conservan importes y etiquetas independientes del color. Segoe UI y Arial no estaban disponibles entre las fuentes del entorno; se usa Inter como sustitución explícita. Botones y campos son instancias de Simple Design System con ajustes a la paleta propuesta.

## Entrega y comprobaciones

Hay 13 composiciones: guía/paleta, diez pantallas de comercio, dashboard móvil y menú móvil. Se verificaron 88 conexiones de navegación: todos sus destinos son frames existentes. Se revisaron visualmente dashboard, formulario de venta, revisión del cronograma y dashboard móvil. La inspección geométrica final no encontró elementos visibles que excedieran horizontalmente sus contenedores. Se conservaron 372 textos editables; no se pegó una captura como sustituto de las pantallas.

`figma-dashboard-invierno.png` es una exportación de referencia. `crear_figma_invierno.js` contiene el script de construcción inicial; no se debe volver a ejecutar sobre el archivo con cambios del usuario: reemplaza los frames numerados. Después de construir se ajustaron anchos de subtítulos al área interior y se agregó el menú móvil mediante una edición incremental. El archivo de Figma es la propuesta actual para revisar.

## Límites

Es una propuesta de comercio con navegación entre estados fijos, no una aplicación funcional ni el diseño final. Los campos no aceptan datos ni recalculan. El menú móvil identifica las pantallas restantes como vistas de escritorio; solo el dashboard y el menú tienen composición móvil específica. Las fotos del catálogo, acciones de cuenta, perfiles Cliente/Superadministrador, estados de error y otras variantes aún requieren detalle. No se afirma una revisión completa de accesibilidad ni una prueba humana del modo Presentar; se comprobaron las conexiones y las composiciones con las herramientas de Figma.

No se modificó la aplicación, el motor financiero, la base de datos ni el Word. La fecha y los importes son los ejemplos fijos previamente usados. No se publicaron cambios del repositorio remoto.

## Actualización de gráficos

Se actualizó el mismo dashboard (`4:115`) con columnas por cliente, anillo de capital vigente/vencido, comparación mensual de ventas/cobros y columnas de próximos vencimientos. La paleta se conserva. Se añadieron versiones apiladas al dashboard móvil y una vista de importes exactos (`8:209`) enlazada desde ambos dashboards.

Datos: capital 1200 + 500 = 1700; vigente 70.6 %, vencido 29.4 %; ventas de octubre 1700 y cobros 0. Agosto y septiembre se muestran sin registros, sin fabricar ceros ni tendencia. Las cuotas futuras son 427.10, 427.10 y 427.09 (1281.29 programados, incluyen intereses); no se presentan como cobros ni utilidad.

El límite del conector Figma Starter impidió la inspección final mediante API. Se abrió el modo Presentar en Brave y se verificaron visualmente los cuatro gráficos y el desplazamiento; se probó el enlace «Ver datos de los gráficos» y el reinicio al dashboard. Se guardaron las capturas `figma-graficos-dashboard.png` y `figma-graficos-vencimientos.png`. La revisión visual final del dashboard móvil queda pendiente; no se afirma una comprobación completa de sus conexiones ni accesibilidad.

El dashboard ampliado se desplazó a X=5200 en el lienzo para no superponerse a otras composiciones. `actualizar_graficos_figma.js` documenta la edición incremental (la posición del lienzo se ajustó después desde la interfaz). La aplicación real continúa sin cambios.
