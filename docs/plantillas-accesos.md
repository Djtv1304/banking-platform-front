# Plantillas en Accesos por función

La ruta `/contabilidad/plantillas` y su entrada bajo Cuentas contables usan `contabilidad.plantillas.consultar` cuando el editor está activo. Consulta queda inicialmente disponible para ADMIN, SUPERVISOR, AUDITOR y CONTADOR desde el catálogo del backend; no hay una segunda matriz de roles en React.

`contabilidad.plantillas.editar` controla preparar una versión, editar sus líneas, simular y enviar la nueva versión pendiente. Su valor inicial conserva CONTADOR según la matriz previa. Sin edición, la ficha muestra las líneas persistidas como lectura. Si el acceso cambia durante la edición, los controles se ocultan y el manejador no envía escrituras; backend vuelve a autorizar cada petición.

Con el control desactivado, menú y ruta conservan la autorización anterior por `con-plantilla-editar`. La función nueva no obliga a crear permisos en WorkOS. Se conserva la retirada del enlace redundante al Plan de cuentas ya integrada en develop.

Las respuestas de simulación admiten importes numéricos o texto decimal, como los que devuelve FastAPI. Se normalizan para presentación, rechazando valores inválidos; los cálculos financieros siguen ejecutándose con Decimal en backend.

Validar con pruebas de navegación, acciones y detalle de Plantillas. Una revisión local utiliza el backend real del checkout y SQL LocalDB con datos ficticios; no acredita asignaciones del WorkOS compartido ni el despliegue en Azure. No modifica el recorrido de aprobación.
