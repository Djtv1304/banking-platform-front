import { createBrowserRouter, Navigate } from 'react-router'

import { DashboardLayout } from '@/app/layouts/DashboardLayout'
import { LoginPage } from '@/features/auth'
import { HomePage } from '@/features/dashboard'
import { ClienteDetallePage, ClientesPage, RegistrarClientePage } from '@/features/clientes'
import { GuestOnly, RequireAuth, RequireProfile } from '@/app/router/guards'
import { ROUTE_ACCESS } from '@/app/router/route-access'

export const router = createBrowserRouter([
  {
    element: <GuestOnly />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          // Todos los perfiles: el personal busca clientes y el cliente ve su propia información
          { path: '/clientes', element: <ClientesPage /> },
          {
            element: <RequireProfile allowed={ROUTE_ACCESS.detalleCliente} />,
            children: [{ path: '/clientes/:idCliente', element: <ClienteDetallePage /> }],
          },
          {
            element: <RequireProfile allowed={ROUTE_ACCESS.registrarCliente} />,
            children: [{ path: '/registrar-cliente', element: <RegistrarClientePage /> }],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
