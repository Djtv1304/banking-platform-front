# Datos de la cooperativa

## Alcance

Una única entidad institucional. Ruta de frontend: `/organizacion/entidad`, bajo
Organización → Datos de la cooperativa. Conserva el layout, los tokens y los
componentes compartidos. No incluye alta, eliminación, cambio de estado ni
administración de agencias o usuarios.

## Contrato

Referencia: PR backend #323. `GET /api/v1/organizacion/entidad` permite ADMIN y
ASESOR; `PATCH` en la misma ruta permite exclusivamente ADMIN. Los permisos de
la UI no sustituyen la autorización del backend.

El formulario envía solo campos modificados. Omitir conserva el valor, `null`
vacía un campo opcional. No envía `estado`, `idEntidad`, `fechaRegistro` ni
`modificadoPor`. Valida la respuesta completa y el identificador único antes
de confirmar el guardado. No reintenta escrituras automáticamente.

Los contactos se validan por formato al editarlos. La comprobación de RUC sigue
el contrato (13 dígitos terminados en 001); no acredita su existencia ni su
validez ante un registro oficial. Los datos históricos se muestran sin aplicar
retroactivamente las reglas del formulario.

## Comportamiento

- Carga, error y reintento de consulta, sin reintentos automáticos de GET.
- `404 ENTIDAD_NO_ENCONTRADA`: explica que falta la configuración inicial, sin
  ofrecer crear otro registro. Otro 404 permanece como error de consulta.
- Error de guardado: conserva el borrador y permite reintentar.
- Cancelación y navegación con cambios pendientes: confirmación antes de perderlos.
- Estado y auditoría visibles como información. El modificador es un identificador
  interno; la fecha sin zona se identifica como tal.
- ASESOR consulta, ADMIN consulta y edita; otros roles no consultan desde la página.

## Verificación

`npm run lint`, `npm run build` y `npm test`. La suite de entidad verifica el
contrato, PATCH parcial, campos protegidos, errores, permisos, fechas y validaciones.

La demo local usa el router y servicio del PR #323 con persistencia en memoria y
una sesión ficticia; bloquea SQL y no llama a WorkOS. No sustituye la validación
de integración con el backend desplegado. Para probar los endpoints reales se
necesita que conserve las rutas y permisos anteriores y exista la fila inicial
`Organizacion.Entidad.IdEntidad = 1`, cargada durante el aprovisionamiento.
