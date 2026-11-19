# #353 · Nombre y web de la institución

El frontend consulta `GET /api/v1/institucion` mediante TanStack Query y valida el JSON con Zod. No depende del permiso para leer la ficha legal de Entidad. La respuesta pública incluye nombre, sitioWeb, logoUrl (null) y origen; el logo queda fuera del alcance acordado.

Se reutiliza el mismo resultado en el login, menú lateral, encabezado/menú de usuario y título del navegador. Si no hay nombre configurado, se presenta Sistema de gestión con un símbolo genérico; si no hay web HTTPS válida, no se crea un enlace. No se cargan logos externos ni se publica información interna.

La respuesta se comparte por caché de 30 segundos y se revalida al volver a la pestaña si está obsoleta. Una caída conserva el último resultado válido de esa página; sin respuesta previa se utiliza la presentación genérica, sin bloquear el login. No se almacena una copia persistente de marca en localStorage.

Al confirmar una creación o edición de Entidad se invalida la consulta institucional para actualizar los consumidores sin alterar el borrador del formulario. Un 503 de presentación no se confunde con el 404 ENTIDAD_NO_ENCONTRADA de la ficha.

Dependencia de trabajo: la rama local incorpora el PR #93 para preservar sus correcciones UTF-8. Antes de publicar #353, sincronizar con su integración en develop y comprobar que esos arreglos no se presentan como cambios propios de #353. No se modifica DatosCooperativaPage ni FichaClientePage sobre la versión de #93.

No se agregan paquetes npm ni se cambia el lockfile. Las claves existentes de preferencias visuales se conservan: no son datos institucionales de negocio y renombrarlas perdería preferencias sin aportar configuración.
