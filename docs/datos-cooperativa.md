# Datos de la cooperativa

## Alcance

Una única entidad institucional. Ruta de frontend: `/organizacion/entidad`, bajo
Organización → Datos de la cooperativa. Conserva el layout, los tokens y los
componentes compartidos. Esta ampliación añade alta inicial mediante POST, descrita
en `entidad-configuracion-inicial.md`. No incluye eliminación, cambio de estado
ni administración de agencias o usuarios.

La ficha identifica la cooperativa con razón social, RUC y estado en su encabezado.
Los hooks del módulo separan consulta y edición, conservan la cancelación de
consultas y evitan refrescar el borrador mientras se edita. La identificación del
representante se convierte a mayúsculas al escribir y antes de construir el PATCH;
su nombre mantiene la capitalización ingresada.

## Contrato

Referencias: backend #323 (consulta/edición) y #335 (POST inicial).
`GET /api/v1/organizacion/entidad` permite ADMIN y
ASESOR; `PATCH` en la misma ruta permite exclusivamente ADMIN. Los permisos de
la UI no sustituyen la autorización del backend.

En edición, PATCH envía solo campos modificados. Omitir conserva el valor, `null`
vacía un campo opcional. No envía `estado`, `idEntidad`, `fechaRegistro` ni
`modificadoPor`. Valida la respuesta completa y el identificador único antes
de confirmar el guardado. No reintenta escrituras automáticamente.

Los contactos se validan por formato al editarlos. La comprobación de RUC sigue
el contrato (13 dígitos terminados en 001); no acredita su existencia ni su
validez ante un registro oficial. Los datos históricos se muestran sin aplicar
retroactivamente las reglas del formulario.

## Comportamiento

- Carga, error y reintento de consulta, sin reintentos automáticos de GET.
- `404 ENTIDAD_NO_ENCONTRADA`: ofrece crear a ADMIN y explica a ASESOR que
  debe solicitar la configuración. Otro 404 permanece como error de consulta.
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
`Organizacion.Entidad.IdEntidad = 1`. El equipo decidió crear ese registro desde
el formulario mediante POST. No se necesita el script de carga para este flujo.
La demo nueva conecta el backend develop a una base LocalDB vacía con perfil
ficticio. La integración autenticada con WorkOS/Azure se valida por separado.
