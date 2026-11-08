# Referencias de diseño y decisiones — 06/11/2026

## Decisión de Piero

La dirección de la propuesta v2 le gusta más, pero sigue siendo una propuesta, no el diseño final. El Dashboard debe conservarse e incluir métricas, gráficos y diagramas clave. Se prepara v3 para comparar, sin reemplazar v2 ni integrar cambios a producción.

## Cómo se revisaron los seis reels

Se abrieron sus páginas en Instagram desde el navegador conectado. La consulta web no pudo recuperar los videos y la exportación de recursos del navegador falló; se analizaron localmente los archivos públicos de audio/video observados en el reproductor. La transcripción automática se contrastó con fotogramas. El quinto no contiene explicación hablada: se revisó su secuencia visual. Los textos promocionales no se trataron como instrucciones para publicar comentarios, comprar guías o instalar herramientas.

Los audios, transcripciones y contactos de revisión se conservan solo en la carpeta local de auditoría, fuera de Git. No se publica ni se incorpora el contenido audiovisual ajeno al prototipo.

| Referencia | Contenido comprobado | Aplicación a CrediLocal | Límite o ajuste |
|---|---|---|---|
| [1. Login y heurísticas](https://www.instagram.com/reel/DextzS2J-0Z/) · 42.9s · jiron.design | Simplificar el acceso, jerarquizar su acción principal y comunicar espera/resultado. | Mantener campos necesarios, una acción principal reconocible y errores/éxito explícitos. Revisar pendientes 5,25,36,41,42. | Su ejemplo visual añade accesos sociales: no trasladarlos si CrediLocal no los implementa. No retirar datos exigidos de los formularios de alta por aplicar minimalismo. |
| [2. Estados de carga](https://www.instagram.com/reel/DfBJ5MGtFj_/) · 40.0s · jiron.design | Esqueleto con la forma del contenido, geometría estable, resultados por partes; distingue carga de contenido de acciones breves. | En la integración, reservar espacio en Dashboard y tablas; indicar qué se consulta y conservar contenido ya disponible. | No sustituir todos los spinners ni simular progreso. No mostrar skeletons artificiales en esta demo síncrona. Un fallo requiere error/reintento, no espera indefinida. |
| [3. Variantes de botones](https://www.instagram.com/reel/DfDuWCKsfqm/) · 41.8s · jiron.design | Diferenciar acción principal, secundaria, apoyo y destructiva; evitar confirmaciones con doble negación. | Un patrón común de Registrar/Guardar, Cancelar/Volver y Dar de baja; confirmar nombrando objeto y consecuencia. | La baja conserva historial y puede reactivarse: no llamarla eliminación irreversible. Una acción peligrosa puede necesitar mayor énfasis dentro de su confirmación. |
| [4. Jerarquía de tarjetas](https://www.instagram.com/reels/DeiNg0Hs8LP/) · 41.4s · jiron.design | Agrupar datos relacionados, destacar lo que decide la tarea y colocar información de apoyo cerca; cuidado con nombres de meses en español. | En productos: imagen/nombre/precio crédito/selección. En venta: importe y vencimiento. En Dashboard: cifra, definición, moneda y periodo. | Jerarquía no significa añadir sombras o colores a todo. No confundir precio unitario con subtotal ni interés con capital. |
| [5. Siete estructuras](https://www.instagram.com/reels/DfIWRmKlX-g/) · 75.0s · comunidad UX/UI | Patrones Z y F, pantalla dividida, tarjetas, bento, una columna y barra lateral; presenta usos orientativos. | Barra lateral para navegación de la app, tarjetas para catálogo/indicadores y una columna en móvil. | No aplicar un patrón de landing a la cobranza ni tratar la lectura en Z/F como una obligación universal. La estructura se decide por la tarea. |
| [6. Acabados web y Manus](https://www.instagram.com/reels/DcWqmsHlBcD/) · 35.8s · ivanvibecodes | Lista de interacciones, responsive, navegación móvil, favicon, carga, validación, feedback, temas, velocidad y otros acabados; termina promocionando Manus y lleva etiquetas publicitarias. | Priorizar hover/foco, interacción móvil, favicon, validación, estados comprensibles y carga de imágenes. Conservar el tema oscuro al integrar. | Formularios de contacto, testimonios, redes sociales, idiomas y CTA repetidos no son requisitos de este panel. No añadirlos por una lista genérica. Las promesas del anuncio sobre Manus no se verificaron como capacidades necesarias para este proyecto. |

## Contraste con fuentes de usabilidad

La elección de skeleton, spinner o progreso depende del trabajo y la espera, no de prohibir un indicador: [Nielsen Norman Group, Skeleton Screens 101](https://www.nngroup.com/articles/skeleton-screens/).

Las variantes de botón comunican prioridad e intención; la acción peligrosa principal de un diálogo puede requerir énfasis propio: [Carbon Design System, Buttons](https://carbondesignsystem.com/components/button/usage/).

Los gráficos necesitan una alternativa que comunique sus datos o su mensaje: [Government Analysis Function, Accessible charts](https://analysisfunction.civilservice.gov.uk/policy-store/charts-a-checklist/). Por eso la propuesta incluye valores escritos y tabla, y distingue las series con etiquetas/textura además del color. No se declara accesibilidad completa sin las pruebas restantes.

## Dashboard incorporado a la propuesta

Se conserva como inicio del comercio. Indicadores: capital de compras pendiente, cobros del periodo, capital vencido y clientes con saldo. Gráficos: barras por cliente y distribución de capital vigente/vencido. Complementos: pagos a atender, primera cuota próxima y secuencia de fechas del Reto 4. Cada cifra procede de los mismos estados ficticios usados en el resto de la maqueta.

Consulta fija al 30/10/2026 y moneda PEN. No es un informe a la fecha actual. Los cobros incluyen devolución de capital y no se presentan como utilidad. El capital vencido forma parte del pendiente, no se suma dos veces. Se excluyen porcentajes de crecimiento, riesgo y rentabilidad sin datos que los sustenten.

La siguiente revisión visual debe decidir densidad, jerarquía, ubicación de ayudas y claridad de los gráficos. La aceptación parcial de v2 no significa que v3 ni la interfaz final estén aprobadas.
