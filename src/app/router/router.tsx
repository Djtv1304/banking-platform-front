import { createBrowserRouter, Navigate } from 'react-router'

import { DashboardLayout } from '@/app/layouts/DashboardLayout'
import { LoginPage } from '@/features/auth'
import { HomePage } from '@/features/dashboard'
import { BuscarClientesPage, FichaClientePage, RegistrarClientePage } from '@/features/clientes'
import { BuscarTarjetasPage, DetalleTarjetaPage, SolicitarTarjetaPage } from '@/features/tarjetas'
import { BuscarCuentasPage, CuposCuentaPage, DetalleCuentaPage, MovimientosCuentaPage } from '@/features/cuenta'
import { GuestOnly, RequireAuth, RequireProfile } from '@/app/router/guards'
import { ROUTE_ACCESS } from '@/app/router/route-access'
import { ModuloEnPreparacion } from '@/shared/ui'

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
            element: <RequireProfile allowed={ROUTE_ACCESS.consultarCuentas} />,
            children: [
              { path: '/cuentas', element: <BuscarCuentasPage /> },
              { path: '/cuentas/:idCuenta', element: <DetalleCuentaPage /> },
            ],
          },
          {
            element: <RequireProfile allowed={ROUTE_ACCESS.consultarCupos} />,
            children: [{ path: '/cuentas/:idCuenta/cupos', element: <CuposCuentaPage /> }],
          },
          {
            element: <RequireProfile allowed={ROUTE_ACCESS.consultarClientes} />,
            children: [
              { path: '/clientes-busqueda', element: <BuscarClientesPage /> },
              { path: '/clientes-busqueda/:idCliente', element: <FichaClientePage /> },
            ],
          },
          {
            element: <RequireProfile allowed={ROUTE_ACCESS.consultarMovimientos} />,
            children: [{ path: '/cuentas/:idCuenta/movimientos', element: <MovimientosCuentaPage /> }],
          },
          {
            element: <RequireProfile allowed={ROUTE_ACCESS.consultarTarjetas} />,
            children: [
              { path: '/tarjetas', element: <BuscarTarjetasPage /> },
              { path: '/tarjetas/:idTarjeta', element: <DetalleTarjetaPage /> },
            ],
          },
          {
            element: <RequireProfile allowed={ROUTE_ACCESS.creditos} />,
            children: [
              {
                path: '/creditos',
                element: (
                  <ModuloEnPreparacion
                    modulo="Créditos"
                    descripcion="Aquí se registrarán, evaluarán y aprobarán las solicitudes de crédito."
                  />
                ),
              },
            ],
          },
          {
            element: <RequireProfile allowed={ROUTE_ACCESS.parametrosGenerales} />,
            children: [
              {
                path: '/parametros',
                element: (
                  <ModuloEnPreparacion
                    modulo="Parámetros generales"
                    descripcion="Aquí se configurarán los productos, subproductos y BIN que necesita la emisión de tarjetas."
                  />
                ),
              },
            ],
          },
          {
            element: <RequireProfile allowed={ROUTE_ACCESS.cuentasContables} />,
            children: [
              {
                path: '/contabilidad',
                element: (
                  <ModuloEnPreparacion
                    modulo="Cuentas contables"
                    descripcion="Aquí se administrará el plan de cuentas contables de la cooperativa."
                  />
                ),
              },
            ],
          },
          {
            element: <RequireProfile allowed={ROUTE_ACCESS.accesosRoles} />,
            children: [
              {
                path: '/accesos',
                element: (
                  <ModuloEnPreparacion
                    modulo="Accesos y roles"
                    descripcion="Aquí se registrarán los funcionarios del sistema y se asignarán sus roles."
                  />
                ),
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
