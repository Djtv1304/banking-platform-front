# Agencias: identificador asignado por backend

Adaptación de ORG-01 al contrato del backend #336. POST /api/v1/agencias recibe
codigo, tipoAgencia e idCiudad, con telefono/direccion opcionales en esta pantalla.
No solicita ni envía idAgencia; no calcula el próximo valor en React.

El ID se toma de la respuesta y permanece como texto para conservar ceros iniciales.
La confirmación y la tabla muestran el valor asignado. La respuesta debe incluir un
ID no vacío; el formulario no presenta un guardado como correcto sin identificador.

El código sigue siendo una entrada del operador, distinta del ID automático.
GET/PATCH de una agencia mantienen el ID en la ruta, sin enviarlo como campo editable.
Se conservan diseño, ADMIN, reglas de Matriz, estado y validaciones restantes.
Un conflicto interno de numeración se muestra como error general, sin pedir al
operador un ID distinto. No se añade gestión de vínculos WorkOS a este alcance.

## Validación

- Formulario válido sin ID, exclusión de valores heredados, serialización de campos,
  preservación de IDs como 007, respuesta sin ID rechazada y edición sin cambiarlo.
- Pruebas HTTP del router/servicio actuales con repositorio en memoria: POST201,
  GET/PATCH, duplicado409, ID manual400, segunda Matriz409, desactivar/reactivar,
  ASESOR403 y fallo503 simulado. No se probaron estas escrituras contra SQL real.
- La demo usa ADMIN ficticio y datos en memoria, con conexiones SQL bloqueadas.
  Reiniciar el proceso restaura las dos agencias iniciales. No usa WorkOS ni Azure.

## Pendiente externo

Backend obtiene el ID mediante Organizacion.SeqAgenciaId. Antes de validar el
guardado compartido, confirmar que la secuencia existe y está configurada para la
tabla actual. El PR #336 no incorpora su script SQL y la consulta directa de
metadatos quedó bloqueada por firewall/IP. Esta adaptación no crea ni modifica
secuencias, agencias o datos de Azure.
