# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

## Proxy al backend (Worker de Cloudflare)

El Worker reenvía `/api/*` al backend y agrega `X-Proxy-Secreto`; con `PROXY_EXIGIDO=true`
el backend rechaza (403 `ORIGEN_NO_PERMITIDO`) lo que no traiga ese secreto.

- Un solo Worker (`banking-platform-front`) sirve producción, `develop` y las preview URLs de cada PR.
- `develop` y las previews usan `previews.vars` de `wrangler.jsonc` (backend de desarrollo); producción, `vars`.
- `PROXY_SECRETO` es un **secreto del Worker** (Settings › Variables and Secrets, tipo Secret) y debe ser
  idéntico, byte a byte, al App Setting `PROXY_SECRETO` del App Service.
- Cada versión guarda los secretos del momento en que se construye: si se agrega o rota el secreto,
  hay que volver a construir `develop` y las previews abiertas.
- Comprobación: `GET <url>/api/v1/auth/me` responde 401 `NO_AUTENTICADO` (pasó el proxy); 403
  `ORIGEN_NO_PERMITIDO` indica que esa versión no tiene el secreto correcto.
