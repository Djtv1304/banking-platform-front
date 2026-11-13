# Interacción de registro y consulta de clientes

## Registro: foco dentro del formulario

Los radios visualmente ocultos necesitan un contenedor de posicionamiento dentro
de su etiqueta. Sin él, una lista larga podía extender la página exterior y al
enfocar una actividad mostrar el fondo shell fuera del portal. Las etiquetas de
tipo de cliente y actividad son relativas; el contenedor del registro también
contiene los selects ocultos de Radix. No se cambia la paleta, el layout global,
las reglas de registro ni los permisos.

## Consulta automática

- Buscar por texto o identificación exacta espera 350 ms sin escritura. Es una
  decisión de UX de esta implementación, no un valor impuesto por un estándar.
- Tipo de cliente, estado y orden se aplican inmediatamente, junto con el texto
  actual. Cada cambio de criterio reinicia la página a 1.
- Buscar o Enter ejecuta inmediatamente; Limpiar restaura los filtros y cancela
  el texto pendiente para que no reaparezca después. Salir cancela el temporizador.
- Durante composición de texto no se consulta hasta que termine la composición.
- Se mantiene GET /api/v1/clientes y sus filtros/paginación/validación. No se filtra
  solo la página visible ni se descarga todo el catálogo de clientes.
- TanStack ya transmite AbortSignal al transporte Axios; las consultas superadas
  se cancelan y cada combinación de parámetros tiene su propia clave de caché.
- Los resultados anteriores permanecen visibles durante la consulta, identificados
  como pendientes; la paginación se deshabilita mientras se actualiza. Un estado
  accesible informa de la actualización y del total sin mover el foco.
- Los filtros se conservan en memoria del componente, no en la URL de navegación.
  Esto no elimina los parámetros de la solicitud GET: los logs de infraestructura
  deben aplicar su propia política de protección de datos personales.
- Se conservan error y Reintentar, así como los permisos existentes del backend.
  La espera reduce solicitudes, pero no sustituye límites de uso del servidor.

No es una actualización push de cambios de otros usuarios: se consulta cuando
el operador escribe o cambia los filtros. No incorpora WebSockets ni polling.

## Fuentes primarias consultadas

- React aclara que useDeferredValue no evita por sí solo solicitudes por tecla:
  https://react.dev/reference/react/useDeferredValue
- Cancelación de consultas y consumo de AbortSignal:
  https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation
- Mantener resultados durante paginación con placeholderData:
  https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries
- Avisos accesibles de resultados con role=status:
  https://www.w3.org/WAI/WCAG21/working-examples/aria-role-status-searchresults/
