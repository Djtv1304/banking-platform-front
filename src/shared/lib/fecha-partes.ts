import { z } from 'zod'

export interface PartesFecha {
  dia: string
  mes: string
  anio: string
}

const fechaValida = z.iso.date()

/** ISO persistido o borrador parcial: conserva lo escrito hasta poder validarlo. */
export function partesDeFecha(valor: string): PartesFecha {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor)
  if (iso) return { dia: iso[3], mes: iso[2], anio: iso[1] }
  const partes = valor.split('/')
  const leer = (index: number) => {
    try { return decodeURIComponent(partes[index] ?? '') } catch { return partes[index] ?? '' }
  }
  return { dia: leer(0), mes: leer(1), anio: leer(2) }
}

/** Solo una fecha completa y válida se convierte a ISO; nunca aplica zonas horarias. */
export function fechaDesdePartes(partes: PartesFecha): string {
  const { dia, mes, anio } = partes
  if (!dia && !mes && !anio) return ''
  const iso = `${anio}-${mes}-${dia}`
  if (/^\d{2}$/.test(dia) && /^\d{2}$/.test(mes) &&
      /^\d{4}$/.test(anio) && Number(anio) >= 1 && fechaValida.safeParse(iso).success) {
    return iso
  }
  // El borrador inválido no pasa z.iso.date del formulario ni llega a la API.
  // Escapar cada parte evita perder las otras si se escribe un separador inválido.
  return [dia, mes, anio].map(encodeURIComponent).join('/')
}

export function completarDia(partes: PartesFecha): PartesFecha {
  return /^\d$/.test(partes.dia) ? { ...partes, dia: partes.dia.padStart(2, '0') } : partes
}
