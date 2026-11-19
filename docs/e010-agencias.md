# E0-10 · Mantenimiento de agencias

Rama local `feat/frontend-351-e010`, basada en `develop` en `37973d4`. El contrato aplicado es el de [E0-10 #477](https://github.com/hugo-chicaiza/Banking-Platform/pull/477) y la resolución usa [E0-08 #476](https://github.com/hugo-chicaiza/Banking-Platform/pull/476). Los números de la tabla corresponden a la [historia #351](https://github.com/hugo-chicaiza/Banking-Platform/issues/351).

## Alcance y compatibilidad

El mantenimiento usa `/api/v1/organizacion/agencias`. El listado incluye todos los estados, con filtros locales por código, ID y estado y el componente compartido de paginación. La ficha usa React Hook Form, Zod y los diálogos existentes. El alta asigna el ID en el servidor e inicia en `I`. La edición envía los campos modificados y usa `null` para vaciar teléfono o dirección. El cambio de estado usa su ruta propia.

Se mantienen los controles de rol ADMIN y sección en Agencias. La bandeja decide el acceso a la resolución por identidad, permiso efectivo y alcance. El `202` usa el contrato y aviso de E0-08 y enlaza al detalle de la solicitud. La pantalla espera a que el servidor confirme un cambio efectivo antes de mostrar un estado nuevo.

- **E1-02.** Se muestran los bloqueos que devuelve el backend. La integración local cubre jornadas, cajas físicas y bóvedas añadidas entre la solicitud y la aprobación.
- **E1-04.** Los selectores de nuevas asignaciones conservan CAT-06. El editor de asignaciones existentes combina las opciones activas con sus propias asignaciones previas y el historial presenta los IDs que entrega su endpoint. La integración local confirma que una agencia desactivada deja de ser elegible y permanece consultable.
- **E0-08.** El detalle conserva el comparador y la línea de tiempo. Al ejecutar una aprobación, una nueva consulta actualiza las vistas de agencias. Una solicitud pendiente solo actualiza la bandeja.

## Evidencia por criterio

| # | Evidencia |
| --- | --- |
| 1 | Playwright crea `SUC-NUEVA` como inactiva, verifica su aparición en la tabla, edita la dirección y prueba la activación. La integración SQL verifica el alta y el listado. |
| 2 | Playwright intenta crear `SUC-SUR` y comprueba el mensaje junto a Código y el foco devuelto al campo. El contrato se verificó también con el router del backend y sus pruebas de duplicados. |
| 3 | Playwright recibe el 409 de `SUC-CAJA` y verifica la lista de dos bloqueos. Vitest cubre la normalización de la extensión `bloqueos`. La integración SQL vuelve a validar dependencias al aprobar. |
| 4 | Playwright verifica el aviso con enlace, el estado activo en la tabla y la presencia en CAT-06 hasta la decisión de otra sesión. FastAPI y SQL local verifican `202` con `idSolicitud` y persistencia después de aprobar. |
| 5 | Playwright comprueba que la acción Aprobar no aparece para el solicitante y que la API simulada devuelve `403 APROBADOR_ES_SOLICITANTE`. La prueba HTTP con SQL desechable verifica además que queda un evento de intento. |
| 6 | Playwright verifica la exclusión en CAT-06 y la permanencia del registro por ID. SQL local verifica la exclusión para nuevas asignaciones y la conservación de la ficha para E1-04. |
| 7 | Playwright verifica el aviso al acceder como ASESOR y el `403` de la API simulada. Las pruebas de agencias del backend cubren acceso denegado sin escritura. |
| 8 | Las pruebas de integración con SQL local comprueban atomicidad, relevo de auditoría, recuperación e idempotencia. Los campos y las instantáneas provienen de la bitácora institucional descrita en el PR #477. |
| 9 | Chrome verifica Tab, Shift+Tab, Enter, selección de ciudad, Esc, foco visible y regreso al control que abrió el diálogo. Carga, vacío, error recuperable, acceso denegado y filtros sin resultados tienen casos de navegador. |
| 10 | Los tres escenarios E2E ejecutan la SPA contra el modo simulado de Vite, con datos en memoria y sesiones separadas. |

## Reproducción

Iniciar el modo simulado con `npm run dev -- --mode simulado`. En `http://localhost:5173/organizacion/agencias`, el botón de ingreso inicia la sesión de Ana, ADMIN solicitante. En otra ventana privada, abrir `http://localhost:5173/api/v1/auth/login?usuario=aprobador&return_to=/aprobaciones` para ingresar como Luis, supervisor con permiso de aprobación. `SUC-CAJA` tiene bloqueos, `SUC-NORTE` permite solicitar una baja y `SUC-SUR` empieza inactiva. Reiniciar Vite restaura los datos iniciales.

```powershell
npm test
npm run lint
npm run build
$env:E010_SIMULADO='1'
npm run test:e2e
```

## Resultados y pendientes

- Frontend. **866 pruebas Vitest** en 89 archivos, lint y build aprobados. **3 pruebas Playwright** de E0-10 aprobadas en Chrome.
- Backend local del PR #477 en `edff8d2`. **136 pruebas** de agencias aprobadas con datos de prueba y **8 pruebas de integración** aprobadas en bases SQL Server locales desechables. El escenario HTTP usa identidades de prueba distintas para solicitar y aprobar.
- Suite existente de Productos con el laboratorio FastAPI. **1 aprobada y 3 fallidas** tanto en la rama como en la copia limpia de `develop` en `37973d4`. Dos fallos esperan el campo con etiqueta exacta `Código` y el tercero espera el grupo `Producto de cuenta`. Su corrección queda fuera de E0-10.
- Pendiente de aceptación. Revisión por otra persona y ejecución integrada de navegador con identidades reales de WorkOS y bitácora del entorno compartido. Las pruebas de navegador usaron sesiones simuladas y la integración SQL usó identidades de prueba.
