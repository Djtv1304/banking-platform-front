import { createBrowserRouter, Navigate } from 'react-router'

import { DashboardLayout } from '@/app/layouts/DashboardLayout'
import { CLIENTES_ROLES, LoginPage } from '@/features/auth'
import { HomePage } from '@/features/dashboard'
import {
  AgenciasPage,
  DatosCooperativaPage,
  DetalleProductoPage,
  FichaSubProductoPage,
  PRODUCTOS_ROLES,
  ProductosPage,
} from '@/features/organizacion'
import { CATALOGOS_ROLES, CatalogosPage } from '@/features/catalogos'
import { DetalleUsuarioPage, UsuariosPage } from '@/features/usuarios'
import { BuscarClientesPage, FichaClientePage, RegistrarClientePage } from '@/features/clientes'
import { BuscarTarjetasPage, DetalleTarjetaPage, SolicitarTarjetaPage } from '@/features/tarjetas'
import { BuscarCuentasPage, CuposCuentaPage, DetalleCuentaPage, MovimientosCuentaPage } from '@/features/cuenta'
import { AbrirCuentaPage } from '@/features/cuenta'
import { CONTABILIDAD_ROLES, PlanCuentasPage } from '@/features/contabilidad'
import { GuestOnly, RequireAuth, RequireProfile, RequireRoles } from '@/app/router/guards'
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
            element: <RequireProfile allowed={ROUTE_ACCESS.datosCooperativa} />,
            children: [{ path: '/organizacion/entidad', element: <DatosCooperativaPage /> }],
          },
          {
            element: <RequireRoles allowed={CLIENTES_ROLES.registrar} />,
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
            element: <RequireRoles allowed={CLIENTES_ROLES.consultar} />,
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
            element: <RequireProfile allowed={ROUTE_ACCESS.agencias} />,
            children: [{ path: '/organizacion/agencias', element: <AgenciasPage /> }],
          },
          {
            // La URL directa respeta los mismos roles que el menú; las acciones son solo de ADMIN
            element: <RequireRoles allowed={PRODUCTOS_ROLES.consultar} />,
            children: [
              { path: '/productos', element: <ProductosPage /> },
              { path: '/productos/:idProducto', element: <DetalleProductoPage /> },
              { path: '/productos/subproductos/:idSubProducto/ficha', element: <FichaSubProductoPage /> },
            ],
          },
          {
            element: <RequireRoles allowed={CATALOGOS_ROLES.consultar} />,
            children: [{ path: '/catalogos', element: <CatalogosPage /> }],
          },
          {
            element: <RequireProfile allowed={ROUTE_ACCESS.cuentasContables} />,
            children: [
              {
                // CON-03: CONTADOR, AUDITOR y ADMIN (las acciones se deciden por rol dentro de la página)
                element: <RequireRoles allowed={CONTABILIDAD_ROLES.consultar} />,
                children: [{ path: '/contabilidad', element: <PlanCuentasPage /> }],
              },
            ],
          },
          {
            element: <RequireProfile allowed={ROUTE_ACCESS.gestionUsuarios} />,
            children: [
              { path: '/usuarios', element: <UsuariosPage /> },
              { path: '/usuarios/:idUsuario', element: <DetalleUsuarioPage /> },
            ],
          },
          {
            // Estática: React Router la prefiere a /cuentas/:idCuenta aunque se declare después
            element: <RequireProfile allowed={ROUTE_ACCESS.abrirCuenta} />,
            children: [{ path: '/cuentas/abrir', element: <AbrirCuentaPage /> }],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
