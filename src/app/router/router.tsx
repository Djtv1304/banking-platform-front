import { createBrowserRouter, Navigate } from 'react-router'

import { DashboardLayout } from '@/app/layouts/DashboardLayout'
import { CLIENTES_ROLES, LoginPage, PERMISOS } from '@/features/auth'
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
import { DetalleUsuarioPage, UsuariosPage, ROLES_GESTION_USUARIOS, ROLES_USUARIO } from '@/features/usuarios'
import { RolesAccesosPage, ROLES_CONSULTA_ROLES } from '@/features/seguridad'
import { BOVEDA_ROLES, BovedasPage, DetalleBovedaPage } from '@/features/boveda'
import { getRoleNavigation } from '@/app/navigation/navigation'
import { BuscarClientesPage, FichaClientePage, RegistrarClientePage } from '@/features/clientes'
import { BuscarTarjetasPage, DetalleTarjetaPage, SolicitarTarjetaPage } from '@/features/tarjetas'
import { BuscarCuentasPage, CuposCuentaPage, DetalleCuentaPage, MovimientosCuentaPage } from '@/features/cuenta'
import { AbrirCuentaPage } from '@/features/cuenta'
import { AsientosPage, CONTABILIDAD_ROLES, PlanCuentasPage } from '@/features/contabilidad'
import { GuestOnly, RequireAuth, RequirePermiso, RequireProfile, RequireRoles } from '@/app/router/guards'
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
            element: <RequirePermiso permiso={PERMISOS.clientesEditar} />,
            children: [{ path: '/registrar-cliente', element: <RegistrarClientePage /> }],
          },
          {
            element: <RequirePermiso permiso={PERMISOS.tarjetasEmitir} />,
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
                children: [
                  { path: '/contabilidad', element: <PlanCuentasPage /> },
                  // CON-04: mismos roles que el plan de cuentas, solo consulta
                  { path: '/contabilidad/asientos', element: <AsientosPage /> },
                ],
              },
            ],
          },
          {
            element: <RequireRoles allowed={ROLES_GESTION_USUARIOS} />,
            children: [
              { path: '/usuarios', element: <UsuariosPage /> },
              { path: '/usuarios/:idUsuario', element: <DetalleUsuarioPage /> },
            ],
          },
          {
            element: <RequireRoles allowed={ROLES_CONSULTA_ROLES} />,
            children: [
              { path: '/seguridad/roles', element: <RolesAccesosPage roles={ROLES_USUARIO} seccionesParaRol={getRoleNavigation} /> },
            ],
          },
          {
            // BOV-01 a BOV-06: cada bloque y acción de la página se muestra según el rol exacto
            element: <RequireRoles allowed={BOVEDA_ROLES.acceso} />,
            children: [
              { path: '/bovedas', element: <BovedasPage /> },
              { path: '/bovedas/:idBoveda', element: <DetalleBovedaPage /> },
            ],
          },
          {
            // Estática: React Router la prefiere a /cuentas/:idCuenta aunque se declare después
            element: <RequirePermiso permiso={PERMISOS.cuentasAbrir} />,
            children: [{ path: '/cuentas/abrir', element: <AbrirCuentaPage /> }],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
