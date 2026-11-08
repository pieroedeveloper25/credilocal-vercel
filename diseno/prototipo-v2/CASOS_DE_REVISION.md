# Casos para revisar el prototipo y luego la aplicación

No confundir estado previsto con resultado ejecutado. Los resultados de esta ronda se registran por separado en REVISION_Y_PRUEBAS.md.

| Caso | Acción | Resultado que se debe comprobar |
|---|---|---|
| V1 Inicio vacío | Abrir Venta nueva | Sin cliente ni producto precargados. Fecha/hora actuales identificadas como datos de la compra. Acción de registro inhabilitada con motivo claro. |
| V2 Persona | Buscar nombre/documento y seleccionar cliente | Una selección inequívoca; ficha con límite, comprometido y disponible, sin llamar préstamo a la línea. |
| V3 Productos | Abrir catálogo, buscar y seleccionar varios productos | Diálogo con imágenes y precio crédito, selección explícita y botón para añadir. Cerrar/Escape no añade productos. |
| V4 Teclado modal | Abrir diálogo con teclado, recorrer hacia delante/atrás, Escape | Foco dentro del diálogo; fondo no operable; cierre devuelve foco al activador. |
| V5 Entradas | Cambiar cantidad a vacío, letras y negativo | Sin NaN, sin registro inválido, error con corrección, precio de catálogo de solo lectura. |
| V6 Continuidad | Completar borrador, ir a otra pantalla y volver | Selección, cantidades, fecha y modalidad conservadas en navegación interna; no afirmar persistencia tras recargar si no existe. |
| V7 Cuotas | Cargar ejemplo completo de Reto 4 | Compra S/ 1,200, gracia 17 días, saldo S/ 1,217.55; fin gracia 25/10 sin pago; cuotas 25/11, 25/12 y 25/01 por 427.10/427.10/427.09. |
| V8 Límites de simulación | Cambiar una condición fuera de los ejemplos soportados | No conservar resultados fijos como si correspondieran a la nueva entrada. Indicar limitación y evitar registro engañoso. |
| V9 Resultado | Registrar solo demostración soportada | Mensaje de éxito de demo y estado correspondiente; impedir duplicado accidental; siguiente paso claro. |
| E1 Estado | Abrir estado del mismo cliente/venta | Línea separada de deuda con interés, misma referencia y cronograma; no sumar fixture de otro reto. |
| P1 Pago | Abrir ejemplo de pago completo | Cliente y escenario identificados; mora, compensatorio y capital separados; ninguna confusión con cuotas del Reto 4. |
| P2 Importe | Probar S/ 300, S/ 600 y S/ 510.08 en fixture Reto 3 | Solo exacto permitido; causa visible junto al campo/acción. No registrar dinero real. |
| A1 Búsqueda | Buscar OP-2026007 y 2026007 en auditoría demo | Mismo registro, tienda legible, compra y registro separados; retroactivo 26 días. |
| A2 Sin coincidencias | Buscar referencia inexistente y limpiar | Estado sin resultados distinto de ausencia global de registros; limpiar recupera lista y foco. |
| N1 Cuenta | Abrir menú de cuenta y salir/cancelar | Rol visible, acciones agrupadas y teclado/Escape; demo explica límites y no recibe claves reales. |
| N2 Perfiles | Cambiar vista de rol del prototipo | Navegación propia de comercio/cliente/superadministrador, identificada como vista previa, sin alegar autorización de servidor. |
| R1 Móvil | Revisar a 390 px y abrir catálogo/cuenta | Página sin desbordamiento lateral; controles y acciones alcanzables; tablas conservan contenido en región desplazable si es necesario. |
| R2 Zoom | Revisar pantallas representativas al 200 % | Texto y acciones sin recorte, ayudas/modales dentro del área visible. No equivale a prueba con lector de pantalla. |
| R3 Ayuda | Abrir ayudas cerca de bordes con teclado y toque/pulsación | Ayuda no desplaza formulario ni exige hover; Escape/cierre claro. |

## Requiere integración y base aislada, no se cierra con el prototipo

- Login real, bloqueo, expiración de sesión y permisos en servidor.
- Repetir retos financieros contra motor/API y comprobar datos persistidos después de reiniciar.
- Errores de red, respuesta incierta, peticiones duplicadas y recuperación.
- Altas/ediciones/bajas/reactivaciones reales, imágenes inválidas, conservación de historial.
- Aislamiento del borrador por sesión/tienda y limpieza al cerrar sesión.
- Carga de listas grandes con contrato de paginación compatible con API.
- Contraste completo en todos los temas y pruebas con lector de pantalla/dispositivos físicos.
- Capturas del informe final y trazabilidad de uso de IA: entregables separados, no editar Word ahora.
