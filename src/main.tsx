import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/index.css'
import App from '@/app/App.tsx'
import { AppProviders } from '@/app/providers/AppProviders'
import { queryClient } from '@/app/providers/query-client'
import { registerAuthHandlers, restoreSession } from '@/features/auth'
import { initTheme } from '@/shared/theme'

initTheme()
registerAuthHandlers(queryClient)
void restoreSession()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
