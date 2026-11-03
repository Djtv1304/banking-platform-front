import { createBrowserRouter, Navigate } from 'react-router'

import { DashboardLayout } from '@/app/layouts/DashboardLayout'
import { LoginPage } from '@/features/auth'
import { HomePage } from '@/features/dashboard'
import { RegisterPage } from '@/features/clientes'
import { GuestOnly, RequireAuth } from './guards'

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
          { path: '/register', element: <RegisterPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
