# Banking Platform Front

## 01 The tools and commands Claude can't guess
- **Stack principal**: React 19, Vite, TypeScript, Tailwind CSS.
- **Librerías clave**: Zustand (Estado global), TanStack Query + Axios (Peticiones asíncronas), React Hook Form + Zod (Formularios y validación), Shadcn UI (Componentes).
- **Comandos del proyecto**:
    - Iniciar desarrollo: `npm run dev`
    - Compilar: `npm run build`
    - Linter: `npm run lint`
- **Comando Shadcn**: Para añadir componentes usar `npx shadcn@latest add <nombre-componente>`.

## 02 Anything you do differently to the normal way
- **Estructura estricta de carpetas**: Todo el código fuente está en `src/`. El alias `@/` apunta a `src/`.
    - `app/`: Proveedores, enrutador y layouts principales.
    - `features/`: Módulos de la aplicación (`auth/`, `caja/`, `catalogos/`, etc.).
    - `shared/`: Código reutilizable (`api/` para transporte y errores, `config/`  para valores públicos, `lib/` para utilidades sin UI como `cn`, `ui/` para piezas visuales reutilizables).
    - `styles/`: Estilos globales (`index.css`).
- **Archivos Barril (Barrel Files)**: Los `index.ts` **solo** deben existir dentro de las subcarpetas de `features/` (ej. `src/features/auth/index.ts`) y `shared/` (ej. `src/shared/ui/index.ts`). Estos archivos exponen la API pública del módulo.
- **Importaciones**: Usar siempre el alias absoluto (ej. `import { Button } from '@/shared/ui'`).

## 03 The gotchas it's got wrong more than once
*(Sección vacía por el momento. Se llenará a medida que se identifiquen errores recurrentes en el desarrollo).*

## 04 Your boundaries
- **Regla de dependencias de módulos**: `app` compone `features` y `shared`; `features` utiliza `shared`; `shared` **nunca** importa de `features`. Ningún módulo de `features` debe importar archivos internos de otro módulo de `features`.
- **Límite con Shadcn UI**: NUNCA instales componentes de Shadcn de forma masiva. Solo debes instalar e incorporar un componente estrictamente cuando se necesite para la tarea actual, y siempre ubicándolo en `src/shared/ui/`.
- Nunca expongas variables de entorno con secretos en el código frontend.