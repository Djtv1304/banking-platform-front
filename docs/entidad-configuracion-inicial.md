# Configuración inicial de la cooperativa

Ampliación local del #39, conectada al contrato integrado en backend develop
99b5ef0 (POST #335). El equipo eligió crear desde formulario; los scripts iniciales
no son el flujo elegido y no se han aplicado en Azure.

## Contrato confirmado

POST /api/v1/organizacion/entidad, solo ADMIN. Éxito 201 con entidad completa;
conflicto 409 ENTIDAD_YA_EXISTE. Obligatorios: ruc, razonSocial, fechaConstitucion,
representanteLegal e identificacionRepresentante. TipoOrganizacion predeterminado:
Cooperativa de Ahorro y Credito (precargado en el formulario, editable).
Opcionales: nombreComercial, segmento, numeroResolucionSeps, telefono, email, sitioWeb.
La UI envía vacíos opcionales como null y segmento como número. No envía idEntidad,
fechaRegistro, modificadoPor ni estado; backend administra auditoría e ID y asigna A.
GET conserva ASESOR/ADMIN y PATCH exclusivamente ADMIN.

## Flujo

- Solo 404 ENTIDAD_NO_ENCONTRADA sin datos existentes permite ofrecer Crear a ADMIN.
  ASESOR recibe explicación para solicitar configuración a un administrador.
- Carga, otro 404, 401/403, red, servidor o respuesta inválida no habilitan creación.
- Se reutilizan formulario, estilos, validaciones y confirmación de descarte. El borrador
  se conserva ante fallos y no se refresca por recuperar foco mientras se edita/crea.
- POST 201 validado cancela lecturas anteriores y actualiza caché con la entidad persistida;
  cierra el formulario, muestra ficha y retira Crear cooperativa.
- Recarga u otra pestaña consultan GET: entidad activa o inactiva nunca permite otra alta.
  No depende de localStorage ni de un éxito optimista antes de recibir respuesta.
- No hay reintentos automáticos de POST. Ante conflicto o resultado incierto se consulta
  existencia. Si existe, se muestra sin sobrescribir ni atribuir a nuestro intento un éxito
  no confirmado. Si falla la comprobación, el siguiente intento debe consultar antes de POST.
- Backend/SQL impide una segunda entidad, incluso con altas simultáneas.

## Evidencia y límites

347 pruebas frontend en 27 archivos, lint, tipos y build correctos. Incluyen serialización,
status 201 estricto, errores, campos protegidos y renderizado de botón según GET y roles.
10 comprobaciones HTTP/SQL con router/servicio/repositorio develop sobre LocalDB:
validaciones, permisos, creación con defaults, persistencia, duplicado, PATCH, nueva
sesión HTTP y dos POST concurrentes (201/409, una sola fila).
Perfil/id interno ficticios y auditoría en archivo local. No se validaron WorkOS,
permisos reales de Azure, auditoría SQL compartida ni despliegue.
Andrés completó manualmente el alta, confirmó persistencia al recargar y la ausencia
del botón Crear. Un SELECT independiente confirmó una sola fila. También revisó el
campo Día/Mes/Año y confirmó su funcionamiento. No se automatizó su navegador.

## Rama y demo

La ampliación se preparó en feat/frontend-entidad-inicial sobre el #39. El #39 ya
se integró en develop; esta rama se sincroniza sobre esa base antes de publicarse,
de modo que su diff contiene solo creación, control de fecha y pruebas/documentación.
La consulta y edición originales permanecen en el historial del #39.

Demo conectada: http://localhost:5193/organizacion/entidad.
Guía/scripts en outputs/entidad-alta-local. La base comenzó vacía y ahora conserva
la única cooperativa creada durante la prueba manual; no ejecutar el antiguo script
de carga. La vista 5192 sigue siendo solo diseño simulado.

## Fecha de constitución y tema

La UI de alta/edición usa Día, Mes en español y Año escrito con cuatro dígitos,
con rótulos, agrupación semántica y descripción/errores asociados. Se evita el
formato del control date nativo, dependiente del locale del navegador. El usuario
puede introducir años antiguos directamente, sin navegar mes a mes. Los controles
se envuelven si falta espacio; no se añadió biblioteca ni calendario personalizado.
No se cambió el selector global de idioma ni se migraron otros formularios.

Motivo: constitución es una fecha histórica que se conoce o consulta en documentos;
GOV.UK recomienda entrada por partes para ese caso. El mes desplegable español es
una adaptación al diseño del proyecto, no una copia exacta del componente GOV.UK.
Un calendario con foco, navegación y selección accesibles añade complejidad que
no aporta una ventaja clara para esta fecha. Backend continúa recibiendo AAAA-MM-DD.
Se validan fecha completa, bisiestos y año de cuatro dígitos, conservando borradores
parciales y sin añadir límites de antigüedad o fecha futura no definidos por contrato.

Fuentes consultadas:
- https://design-system.service.gov.uk/components/date-input/
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/date
- https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/

Tema comprobado en index.html y shared/theme/theme-store.ts: elección guardada por
origen en enquocoop-theme tiene prioridad; si falta, usa prefers-color-scheme.
No hay un tema oscuro impuesto. El menú permite alternar y guardar claro/oscuro;
no se modificó ese comportamiento ni se inspeccionó la preferencia personal del navegador.

La revisión manual del nuevo control de fecha quedó confirmada por Andrés. No se
presenta como una auditoría completa de accesibilidad ni prueba de todos los dispositivos.
