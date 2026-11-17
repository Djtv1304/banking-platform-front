import { afterEach, describe, expect, it, vi } from 'vitest'

import { guardarArchivo, nombreSobrePin } from '@/features/tarjetas/lib/sobre-pin'

afterEach(() => vi.unstubAllGlobals())

describe('guardarArchivo', () => {
  it('descarga con el nombre del sobre y revoca la URL en el acto', () => {
    const enlace = { href: '', download: '', rel: '', click: vi.fn(), remove: vi.fn() }
    const append = vi.fn()
    vi.stubGlobal('document', { createElement: () => enlace, body: { append } })
    const crear = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:sobre')
    const revocar = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    guardarArchivo(new Blob(['%PDF']), nombreSobrePin(7))

    expect(crear).toHaveBeenCalledOnce()
    expect(enlace).toMatchObject({ href: 'blob:sobre', download: 'sobre-pin-7.pdf' })
    expect(enlace.click).toHaveBeenCalledOnce()
    expect(enlace.remove).toHaveBeenCalledOnce()
    expect(revocar).toHaveBeenCalledWith('blob:sobre')
  })
})
