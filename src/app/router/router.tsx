import { createBrowserRouter, Navigate } from 'react-router'

import { DashboardLayout } from '@/app/layouts/DashboardLayout'
import { LoginPage } from '@/features/auth'
import { HomePage } from '@/features/dashboard'
import { RegisterPage } from '@/features/clientes'
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
            element: <RequireProfile allowed={ROUTE_ACCESS.register} />,
            children: [{ path: '/register', element: <RegisterPage /> }],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
