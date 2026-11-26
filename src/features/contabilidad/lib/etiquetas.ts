const etiquetas: Readonly<Record<string, string>> = {
  // Familias del manifiesto E4-03
  RET_EFECTIVO_CAJA: 'Retiro en efectivo en ventanilla',
  RET_EFECTIVO_ATM: 'Retiro en efectivo en ATM',
  DEV_ATM: 'Devolución de efectivo ATM a bóveda',
  CAJA_FALTANTE: 'Faltante aprobado de ventanilla',
  CAJA_SOBRANTE: 'Sobrante aprobado de ventanilla',
  ATM_SOBRANTE: 'Sobrante aprobado de ATM',
  CUENTAS_TRANSFERENCIA_INTERNA: 'Transferencia interna de depósitos',
  CUENTAS_COMISION: 'Comisión autónoma de cuenta sin impuesto',
  CUENTAS_INTERES_DEVENGO: 'Devengo de interés ordinario de depósitos',
  CUENTAS_INTERES_CAPITALIZACION: 'Capitalización de interés sin retención fiscal',
  CREDITO_PAGO_CUENTA: 'Pago desde cuenta de principal e interés devengado',
  CREDITO_INTERES_DEVENGO: 'Devengo de interés ordinario de crédito',
  CREDITO_SEGURO_COBRO_CUENTA: 'Prima autónoma de desgravamen desde cuenta',
  APORTE_CERTIFICADO: 'Aporte a certificados recibido en caja',
  APORTE_REDENCION_CAJA: 'Redención de aporte pagada en caja',
  APORTE_REDENCION_AHORRO: 'Redención de aporte abonada a ahorro',
  RED_COMISION_CAUSADA: 'Comisión causada de red de pagos',
  RED_INTERCHANGE_GANADO: 'Comisión ganada de red de pagos',
  CON_PRIMA_SEGURO_DEPOSITOS: 'Devengo de prima fija y variable del seguro de depósitos',
  CON_DEPOSITOS_NO_CUBIERTOS_ALTA: 'Aumento del saldo de captaciones no cubiertas',
  CON_DEPOSITOS_NO_CUBIERTOS_BAJA: 'Disminución del saldo de captaciones no cubiertas',
  BOV_001_AJUSTEFALTANTE_E: 'Faltante aprobado de bóveda 001',
  BOV_002_AJUSTEFALTANTE_E: 'Faltante aprobado de bóveda 002',
  BOV_001_AJUSTESOBRANTE_I: 'Sobrante aprobado de bóveda 001',
  BOV_002_AJUSTESOBRANTE_I: 'Sobrante aprobado de bóveda 002',
  BOV_001_TRASLADO_I: 'Recepción de efectivo en bóveda 001',
  BOV_001_TRASLADO_E: 'Despacho de efectivo desde bóveda 001',
  BOV_002_TRASLADO_I: 'Recepción de efectivo en bóveda 002',
  BOV_002_TRASLADO_E: 'Despacho de efectivo desde bóveda 002',
  BOV_001_PROVISIONEXTERNA_I: 'Provisión externa de efectivo a bóveda 001',
  BOV_002_PROVISIONEXTERNA_I: 'Provisión externa de efectivo a bóveda 002',
  BOV_001_ENVIOEXCEDENTE_E: 'Envío de excedente de efectivo desde bóveda 001',
  BOV_002_ENVIOEXCEDENTE_E: 'Envío de excedente de efectivo desde bóveda 002',
  CAJA_DEPOSITO: 'Depósito en efectivo en ventanilla',
  CUENTAS_RETENCION: 'Retención de fondos en cuenta',
  CUENTAS_LIBERACION: 'Liberación de fondos retenidos',
  CUENTAS_RECLASIFICACION: 'Reclasificación de saldos de cuentas',
  DOT_CAJA: 'Dotación de efectivo a caja',
  DEV_CAJA: 'Devolución de efectivo de caja a bóveda',
  DOT_ATM: 'Dotación de efectivo a ATM',
  CAJA_RETIRO: 'Retiro en efectivo en ventanilla',
  ATM_RETIRO: 'Retiro en efectivo en ATM',
  ATM_FALTANTE: 'Ajuste por faltante en ATM',
  AJUSTE_FALTANTE: 'Ajuste por faltante de efectivo',
  AJUSTE_SOBRANTE: 'Ajuste por sobrante de efectivo',
  RET_EFECTIVO: 'Retiro en efectivo en ventanilla',
  CUENTAS_TRANSFERENCIA: 'Transferencia interna entre cuentas',
  CREDITO_PAGO: 'Pago de crédito',
  PAGO_CREDITO: 'Pago de crédito',
  CREDITO_DESEMBOLSO_CUENTA: 'Desembolso de crédito en cuenta',
  APORTE_REDENCION: 'Redención de certificados de aportación',
  RED_COMISION: 'Comisiones de la red de pagos',
  CON_DEPOSITOS_NO_CUBIERTOS: 'Ajuste de depósitos no cubiertos por el seguro',
  BOVEDA_FALTANTE: 'Ajuste por faltante en bóveda',
  BOVEDA_SOBRANTE: 'Ajuste por sobrante en bóveda',
  AJUSTEFALTANTE: 'Ajuste por faltante de efectivo',
  AJUSTESOBRANTE: 'Ajuste por sobrante de efectivo',
  PROVISIONEXTERNA: 'Provisión externa de efectivo',
  ENVIOEXCEDENTE: 'Envío de excedente de efectivo',
  TRASLADO: 'Traslado de efectivo',
  DEBITO: 'Débito',
  CREDITO: 'Crédito',
  PRINCIPAL: 'Principal',
  COMISION: 'Comisión',
  IMPUESTO: 'Impuesto',
  INTERES: 'Interés',
  MORA: 'Interés de mora',
  SEGURO: 'Seguro',
  DIFERENCIA: 'Diferencia de efectivo o saldo',
  TOTAL: 'Importe total',
  PRIMA_FIJA: 'Prima fija',
  PRIMA_VARIABLE: 'Prima variable',
  CAJA: 'Caja',
  CUENTA: 'Cuenta',
  CLIENTE: 'Cliente',
  EXTERNO: 'Origen o destino externo',
  DIFERENCIA_ARQUEO: 'Diferencia de arqueo',
  INGRESO_COMISION: 'Ingresos por comisiones',
  GASTO_INTERES: 'Gastos por intereses',
  INGRESO_INTERES: 'Ingresos por intereses',
  DEPOSITO_RESTRINGIDO: 'Depósitos con fondos retenidos',
  SEGURO_POR_PAGAR: 'Seguros por pagar',
  'CAJ-07': 'Dotación de efectivo a caja',
  'CAJ-15': 'Devolución de efectivo de caja a bóveda',
  'BOV-04': 'Movimientos de efectivo de bóveda',
  'BOV-06': 'Ajustes de arqueo de bóveda',
  'E6-05': 'Retención y liberación de fondos',
  'E6-06': 'Cambio de subproducto',
  EFECTIVO_EN_TRANSITO: 'Efectivo en tránsito',
  DEPOSITO: 'Depósito',
  CREDITO_DESEMBOLSO: 'Desembolso de crédito',
  MANUAL: 'Manual',
  AUTOMATICO: 'Automático',
  AUTOMATICA: 'Automática',
  REVISION: 'En revisión',
  ATM: 'ATM',
  BOVEDA: 'Bóveda',
  CUENTAS: 'Cuentas',
  CONTABILIDAD: 'Contabilidad',
  NOMINA: 'Nómina',
  RED: 'Red de pagos',
  APORTES: 'Aportes',
  CAPITAL: 'Capital',
  CARTERA: 'Cartera de crédito',
  INTERES_GASTO: 'Gasto por intereses',
  INTERES_GANADO: 'Ingresos por intereses',
  INTERES_POR_PAGAR: 'Intereses por pagar',
  INTERES_POR_COBRAR: 'Intereses por cobrar',
  INTERES_SUSPENSO: 'Intereses en suspenso',
  DEPOSITO_NO_CUBIERTO: 'Depósitos no cubiertos por el seguro',
  CONTRA_DEPOSITO_NO_CUBIERTO: 'Contrapartida de depósitos no cubiertos',
  CASTIGO: 'Cartera castigada',
  APROBADO_NO_DESEMBOLSADO: 'Crédito aprobado pendiente de desembolso',
  CUPO_NO_UTILIZADO: 'Cupo de crédito sin utilizar',
  PENDIENTE_APROBACION: 'Pendiente de aprobación',
  EN_EJECUCION: 'En ejecución',
  A: 'Activo',
  I: 'Inactivo',
  PLANTILLAASIENTO: 'Versión de plantilla contable',
  PLANTILLA_ASIENTO: 'Versión de plantilla contable',
  'CON-PLANTILLA': 'Versión de plantilla contable',
}

const origenCuenta: Readonly<Record<string, string>> = {
  FIJA: 'Cuenta fija',
  PRODUCTO: 'Cuenta del producto',
  CONTRAPRODUCTO: 'Cuenta del producto de contrapartida',
  COMISION: 'Cuenta de comisión',
}

export function etiquetaContable(codigo?: string | null, descripcion?: string | null): string {
  const valor = codigo?.trim() ?? ''
  const clave = valor.toLocaleUpperCase('es')
  const nombre = descripcion?.trim()
  if (nombre && (/\s/.test(nombre) || nombre.toLocaleUpperCase('es') !== clave) && !/^[A-Z0-9]+(?:[_-][A-Z0-9]+)+$/.test(nombre)) return nombre
  if (Object.hasOwn(etiquetas, clave)) return etiquetas[clave]
  const legible = valor.replace(/([\p{Ll}\d])(\p{Lu})/gu, '$1 $2')
    .replace(/[_-]+/g, ' ').trim().toLocaleLowerCase('es')
  return legible ? legible.charAt(0).toLocaleUpperCase('es') + legible.slice(1) : 'Sin identificar'
}

export function etiquetaOrigenCuenta(codigo: string) {
  return Object.hasOwn(origenCuenta, codigo) ? origenCuenta[codigo] : etiquetaContable(codigo)
}

const camposSolicitud: Readonly<Record<string, string>> = {
  codigoplantilla: 'Familia de plantillas',
  nombre: 'Nombre de la versión',
  idplantillaasiento: 'Identificador de la versión',
  idtipoasiento: 'Identificador del tipo de asiento',
  codigotipoasiento: 'Tipo de asiento',
  codigoconcepto: 'Concepto contable',
  vigenciadesde: 'Inicio de vigencia',
  vigenciahasta: 'Fin de vigencia',
  lineas: 'Movimientos contables',
  lado: 'Movimiento',
  tipomovimiento: 'Movimiento',
  origen: 'Origen',
  origencuenta: 'Origen de cuenta',
  base: 'Componente del importe',
  componenteimporte: 'Componente del importe',
  rol: 'Rol contable',
  codigorol: 'Rol contable',
  cuenta: 'Identificador de la cuenta contable',
  idcuentacontable: 'Identificador de la cuenta contable',
}

export const presentacionSolicitudPlantilla = {
  campo(clave: string) {
    const normalizada = clave.toLowerCase()
    return Object.hasOwn(camposSolicitud, normalizada) ? camposSolicitud[normalizada] : etiquetaContable(clave)
  },
  valor(clave: string, valor: string, datos: Record<string, unknown>) {
    const campo = clave.toLowerCase()
    if (campo === 'origencuenta' || (campo === 'origen' && ['base', 'lado'].some(c => Object.hasOwn(datos, c)))) {
      return etiquetaOrigenCuenta(valor)
    }
    if (campo === 'codigoplantilla') {
      const nombre = datos.nombre ?? datos.Nombre
      return etiquetaContable(valor, typeof nombre === 'string' ? nombre : undefined)
    }
    if (['lado', 'tipomovimiento', 'base', 'componenteimporte', 'rol', 'codigorol', 'origen', 'estado', 'codigotipoasiento', 'codigoconcepto'].includes(campo)) {
      return etiquetaContable(valor)
    }
    return undefined
  },
}
