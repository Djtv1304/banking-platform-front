# Editor de accesos por función

## Responsabilidad

WorkOS autentica y proporciona roles. El backend de funciones consulta SQL y decide las funciones efectivas para las operaciones migradas. El frontend no concede una operación por ocultar o mostrar una pestaña: utiliza la autorización recibida en `/api/v1/auth/me`, y la API verifica cada operación por su cuenta.

La implementación usa `GET` y `PATCH /api/v1/seguridad/accesos/configuracion`. El editor está en `/seguridad/pestanas`, reservado a ADMIN. Selecciona un rol, agrupa funciones por módulo y permite buscar, filtrar cambios, escribir un motivo y revisar un resumen antes de confirmar. Las funciones protegidas y las dependencias proceden del contrato del backend.

Los controles internos, el menú, los accesos rápidos y las rutas de las pantallas migradas utilizan funciones específicas. Una concesión no queda intersectada accidentalmente con el permiso anterior equivalente de WorkOS. Las operaciones no migradas mantienen sus reglas anteriores, incluidas Bóvedas, Parámetros y la cola de aprobaciones.

Se conservan los cambios de develop para Agencias: contratos con versión, filtros, paginación, recuperación de foco y solicitud de aprobación al desactivar. Nuestros controles deciden qué acciones mostrar, sin eliminar esos flujos ni saltar las verificaciones del backend.

## Borradores y conflictos

- El envío contiene únicamente los cambios pendientes y la versión consultada.
- Una reconsulta conserva el motivo y fusiona base, estado guardado y borrador por función/rol.
- Los cambios de otros campos se incorporan sin borrar los propios. Un cambio idéntico ya guardado deja de estar pendiente.
- Las propuestas incompatibles requieren una decisión explícita; no se sobrescribe automáticamente al otro administrador.
- Ante un resultado de guardado incierto se exige verificar lo registrado antes de reintentar. No se repite automáticamente una escritura.
- El editor permite actualizar su configuración conservando el borrador. Los usuarios normales actualizan sus accesos por navegación o al volver a la ventana, con límite de frecuencia y respetando el aviso de inactividad; no hay sondeo periódico que mantenga una sesión abierta.

## Comprobaciones locales

Se validaron concesión, retirada y restauración de Registrar cliente para Supervisor: menú, ruta directa y API de validación de identificación (200/403). La validación con `ABC` no guarda un cliente. También se probó persistencia al recargar, fallo de guardado, recuperación sin recargar y concurrencia entre dos pestañas con conservación de borrador y motivo. La política y la auditoría utilizan SQL Server LocalDB real; la identidad de esta demo está simulada.

Las casillas vacías tienen contorno negro en tema claro y blanco en oscuro. Los estados también se expresan mediante texto, no solo color. Se conservan los tokens, componentes y temas del proyecto; no se añaden dependencias.

## Despliegue pendiente

El backend debe incluir el contrato y la migración de `Seguridad.AccesoFuncionRol`. `EDITOR_FUNCIONES_ACTIVO` permanece desactivado por defecto. Guardar no lo activa. Antes de activarlo en un entorno compartido deben comprobarse la migración, los permisos SQL del backend, las personalizaciones anteriores y una sesión real de WorkOS. No se cambia WorkOS ni se ejecuta SQL de despliegue desde el frontend.

La demo y sus interruptores de fallo permanecen fuera de este repositorio. No forman parte del código publicable ni sustituyen la validación posterior con identidad real.

## Separación local de la administración de WorkOS

La propuesta local deja `/seguridad/roles` como consulta de roles y usuarios, con un acceso destacado al editor principal `/seguridad/pestanas`. Catálogo y Asignación se conservan en `/seguridad/workos`, reservado a ADMIN y excluido de la personalización de menú. No se eliminan sus APIs ni se cambian permisos del proveedor.

Catálogo mantiene definiciones en WorkOS; una definición nueva no añade por sí misma una API ni una función al editor SQL. Asignación vincula esas definiciones a roles. Las operaciones que comprueban un permiso existente siguen necesitándolo, aunque se retiraran estos formularios del frontend.

Dependencias confirmadas en backend:

- `agencias:aprobar`: aprobación de bajas de agencias, en `modules/organizacion/aprobacion.py`.
- `parametros:aprobar`: aprobación de cambios de parámetros, en `modules/aprobaciones/manejadores.py`.
- `con-plantilla-editar`: mantenimiento de plantillas contables, en `modules/contabilidad/plantillas.py`.
- `con-reclasificacion-preparar` y `con-reclasificacion-aprobar`: preparación y aprobación de reclasificaciones, en `modules/contabilidad/corte_workos.py`.
- Los permisos `prd-*` y `con-cuenta-editar` siguen siendo relevantes con el modelo nuevo desactivado. Con el control activo, solo las operaciones exactamente clasificadas utilizan la decisión por funciones; las restantes conservan sus guardas anteriores.

El nuevo apartado avanzado explica el estado activo/desactivado usando la sesión del backend. Crear, editar, borrar y asignar siguen siendo las implementaciones existentes; su reubicación no acredita una escritura real en WorkOS. La demo ofrece datos de lectura ficticios para revisar su presentación y mantiene bloqueadas las escrituras hacia el proveedor.
