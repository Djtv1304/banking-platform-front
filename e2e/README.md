# Validación integrada local

Antes de abrir los PR de una historia: revisar ramas y cambios locales, ejecutar
las pruebas unitarias y de integración disponibles, levantar ambos proyectos y
probar en navegador los criterios de aceptación. Corregir fallos, repetir las
pruebas afectadas y presentar el resumen de resultados y exclusiones antes de
crear los PR. Usar `develop` como base y destino; no hacer merge automático.

## E3-02

Requiere el backend de E3-02 y su entorno de desarrollo con `requirements-dev.txt`
instalado; el frontend usa sus dependencias de `package-lock.json` y Chrome local.
No requiere una instalación de SQL Server ni credenciales de WorkOS.

```powershell
$env:BANKING_BACKEND_ROOT = 'D:/Enquo/Banking-Platform-E3-02/Backend'
$env:BANKING_BACKEND_PYTHON = 'D:/Enquo/Banking-Platform/Backend/.venv/Scripts/python.exe'
npm.cmd run test:e2e
```

Sin estas variables se usa el backend hermano `../Banking-Platform/Backend` y su
`.venv`. El runner inicia FastAPI en `127.0.0.1:18471` y Vite en
`127.0.0.1:5174`, con el proxy existente de `/api`. Rechaza puertos ocupados y
cierra ambos procesos al terminar. No cambia los archivos `.env`.

El arnés `backend_lab.py` exige `E302_LOCAL_E2E=1`, no se importa desde `app/`
y bloquea todos los motores SQL reales. Sustituye únicamente las fuentes de
persistencia, la sesión y las integraciones externas por datos ficticios en
memoria. Ejecuta las rutas, validaciones, permisos, servicios y contratos reales.
No configura credenciales ni modifica conexiones de producción.

Los escenarios cubren los seis criterios de #375: alta y edición de borradores,
tipos predefinidos sin alta, 409 por duplicado, 409 y editor bloqueado tras activar,
422 por edades incoherentes, selección para menores/adultos desde Abrir cuenta;
también ficha, errores visibles e impresión autorizada. La impresión del sistema
se sustituye en el navegador de prueba, después de verificar el endpoint real.

Los trazados de fallo y la captura de la ficha se guardan en `test-results/`,
excluido de Git. No contienen datos reales.

## Límites y comprobaciones manuales

- El login, renovación y cookies reales de WorkOS requieren una sesión de
  desarrollo autorizada. El arnés no valida esos servicios externos.
- Las consultas T-SQL, restricciones, bloqueos y auditoría persistida en Azure SQL
  requieren una base aislada con las migraciones de E3-01. Las pruebas con mocks
  no demuestran ese comportamiento del motor.
- Nunca activar pruebas de escritura sobre Azure SQL compartida sin autorización.
  Las pruebas no ejecutadas deben figurar expresamente en el resumen del PR.
- E0-04 (#346) sigue definiendo la futura autorización desde tablas; las pruebas
  actuales usan los permisos que entrega la sesión existente de WorkOS.
