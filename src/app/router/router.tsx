import { createBrowserRouter, Navigate } from 'react-router'

import { DashboardLayout } from '@/app/layouts/DashboardLayout'
import { LoginPage } from '@/features/auth'
import { HomePage } from '@/features/dashboard'
import { BuscarClientesPage, FichaClientePage, RegistrarClientePage } from '@/features/clientes'
import { SolicitarTarjetaPage } from '@/features/tarjetas'
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
          {
            element: <RequireProfile allowed={ROUTE_ACCESS.registrarCliente} />,
            children: [{ path: '/registrar-cliente', element: <RegistrarClientePage /> }],
          },
          {
            element: <RequireProfile allowed={ROUTE_ACCESS.solicitarTarjeta} />,
            children: [{ path: '/solicitar-tarjeta', element: <SolicitarTarjetaPage /> }],
          },
          {
            element: <RequireProfile allowed={ROUTE_ACCESS.consultarClientes} />,
            children: [
              { path: '/clientes', element: <BuscarClientesPage /> },
              { path: '/clientes/:idCliente', element: <FichaClientePage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
