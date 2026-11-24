import { ParametrosPage, ParametroDetallePage } from '@/features/parametros'
import { PARAMETROS_ROLES } from '@/features/parametros/api/parametros.contract'
import { PlantillasPage } from '@/features/contabilidad/pages/PlantillasPage'
import { ImportarCatalogoPage } from '@/features/contabilidad/pages/ImportarCatalogoPage'
import { AprobacionesPage, DetalleAprobacionPage } from '@/features/aprobaciones'
import { createBrowserRouter, Navigate } from 'react-router'

import { DashboardLayout } from '@/app/layouts/DashboardLayout'
import { CLIENTES_ROLES, CUENTAS_ROLES, TARJETAS_ROLES, CREDITOS_ROLES, ORGANIZACION_ROLES, LoginPage, PERMISOS } from '@/features/auth'
import { HomePage } from '@/features/dashboard'
import {
  AgenciasPage,
  DirectoriosAuditoriaPage,
  ROLES_MATRIZ_ORGANIZACION,
  DatosCooperativaPage,
  DetalleProductoPage,
  FichaSubProductoPage,
  ProductosPage,
  ProgramacionSubProductoPage,
  NumeracionSubProductoPage,
} from '@/features/organizacion'
import { CATALOGOS_ROLES, CatalogosPage } from '@/features/catalogos'
import { DetalleUsuarioPage, UsuariosPage, ROLES_GESTION_USUARIOS, ROLES_USUARIO } from '@/features/usuarios'
import { FuncionesRolPage, RolesAccesosPage, ROLES_CONSULTA_ROLES } from '@/features/seguridad'
import { getRoleNavigation } from '@/app/navigation/navigation'
import { BOVEDA_ROLES, BovedasPage, DetalleBovedaPage, DetalleSolicitudPage } from '@/features/boveda'
import { BuscarClientesPage, FichaClientePage, RegistrarClientePage } from '@/features/clientes'
import { BuscarTarjetasPage, DetalleTarjetaPage, SolicitarTarjetaPage } from '@/features/tarjetas'
import { BuscarCuentasPage, CuposCuentaPage, DetalleCuentaPage, MovimientosCuentaPage } from '@/features/cuenta'
import { AbrirCuentaPage } from '@/features/cuenta'
import { AsientosPage, CONTABILIDAD_ROLES, CuentasProductoPage, FechaContablePage, NuevoAsientoPage, PlanCuentasPage } from '@/features/contabilidad'
import { GuestOnly, RequireAuth, RequirePermiso, RequireProfile, RequireRoles } from '@/app/router/guards'
import { ROUTE_ACCESS } from '@/app/router/route-access'
import { Aviso, ModuloEnPreparacion } from '@/shared/ui'

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
          { element: <RequireRoles allowed={PARAMETROS_ROLES} />, children: [
            { path: '/parametros', element: <ParametrosPage /> },
            { path: '/parametros/:clave', element: <ParametroDetallePage /> },
            { path: '/parametros/comisiones', element: <Navigate to="/catalogos?catalogo=comisiones" replace /> },
          ] },
          { element: <RequirePermiso permiso={PERMISOS.plantillasEditar} />, children: [
            { path: '/contabilidad/plantillas', element: <PlantillasPage /> },
          ] },
          { path: '/aprobaciones', element: <AprobacionesPage /> },
          { path: '/aprobaciones/:idSolicitud', element: <DetalleAprobacionPage /> },
          {
            element: <RequireRoles allowed={ORGANIZACION_ROLES.entidad} />,
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
            element: <RequireRoles allowed={CUENTAS_ROLES.consultar} />,
            children: [
              { path: '/cuentas', element: <BuscarCuentasPage /> },
              { path: '/cuentas/:idCuenta', element: <DetalleCuentaPage /> },
            ],
          },
          {
            element: <RequireRoles allowed={CUENTAS_ROLES.cupos} />,
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
            element: <RequireRoles allowed={CUENTAS_ROLES.movimientos} />,
            children: [{ path: '/cuentas/:idCuenta/movimientos', element: <MovimientosCuentaPage /> }],
          },
          {
            element: <RequireRoles allowed={TARJETAS_ROLES.consultar} />,
            children: [
              { path: '/tarjetas', element: <BuscarTarjetasPage /> },
              { path: '/tarjetas/:idTarjeta', element: <DetalleTarjetaPage /> },
            ],
          },
          {
            element: <RequireRoles allowed={CREDITOS_ROLES.consultar} />,
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
            element: <RequireRoles allowed={ORGANIZACION_ROLES.agencias} sinAcceso={<Aviso tono="error">No tienes permiso para administrar agencias.</Aviso>} />,
            children: [{ path: '/organizacion/agencias', element: <AgenciasPage /> }],
          },
          {
            element: <RequireRoles allowed={ROLES_MATRIZ_ORGANIZACION} permisoAlternativo={PERMISOS.organizacionExportar} />,
            children: [
              { path: '/organizacion/directorios', element: <DirectoriosAuditoriaPage /> },
              { path: '/organizacion/historial-parametros', element: <ParametrosPage auditoria /> },
              { path: '/organizacion/historial-parametros/:clave', element: <ParametroDetallePage auditoria /> },
            ],
          },
          {
            // La URL directa respeta los mismos roles que el menú; las acciones son solo de ADMIN
            element: <RequirePermiso permiso={PERMISOS.productosConsultar} />,
            children: [
              { path: '/productos', element: <ProductosPage /> },
              { path: '/productos/:idProducto', element: <DetalleProductoPage /> },
              { path: '/productos/subproductos/:idSubProducto/ficha', element: <FichaSubProductoPage /> },
              { path: '/productos/subproductos/:idSubProducto/condiciones', element: <ProgramacionSubProductoPage /> },
              { path: '/productos/subproductos/:idSubProducto/numeracion', element: <NumeracionSubProductoPage /> },
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
                  { path: '/contabilidad/importar-catalogo', element: <ImportarCatalogoPage /> },
                  // E3-05: cuentas contables de los productos; asignar exige con-cuenta-editar
                  { path: '/contabilidad/cuentas-producto', element: <CuentasProductoPage /> },
                  // CON-04: mismos roles que el plan de cuentas, solo consulta
                  { path: '/contabilidad/asientos', element: <AsientosPage /> },
                  {
                    // E4-04: registrar asientos manuales (CONTADOR y ADMIN, o la función contabilidad.asientos.crear)
                    element: <RequireRoles allowed={CONTABILIDAD_ROLES.asientosManuales} />,
                    children: [
                      { path: '/contabilidad/asientos/nuevo', element: <NuevoAsientoPage /> },
                      { path: '/contabilidad/asientos/:idAsiento/editar', element: <NuevoAsientoPage /> },
                    ],
                  },
                  // E4-05: fecha contable vigente y calendario, solo consulta
                  { path: '/contabilidad/fecha-contable', element: <FechaContablePage /> },
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
              { path: '/seguridad/pestanas', element: <FuncionesRolPage /> },
            ],
          },
          {
            // BOV-01 a BOV-06: cada bloque y acción de la página se muestra según el rol exacto
            element: <RequireRoles allowed={BOVEDA_ROLES.acceso} />,
            children: [
              { path: '/bovedas', element: <BovedasPage /> },
              { path: '/bovedas/:idBoveda', element: <DetalleBovedaPage /> },
              { path: '/bovedas/solicitudes/:idSolicitud', element: <DetalleSolicitudPage /> },
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
