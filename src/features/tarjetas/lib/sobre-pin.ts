/*
 * Descarga del sobre de PIN (TAR-07). El PDF lleva el PIN temporal: no se guarda en ningún estado,
 * caché ni consola. Solo vive mientras el navegador inicia la descarga.
 */

export const nombreSobrePin = (idTarjeta: number) => `sobre-pin-${idTarjeta}.pdf`

/** Entrega el Blob al navegador como archivo y libera su URL en el acto */
export function guardarArchivo(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  try {
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = nombre
    enlace.rel = 'noopener'
    document.body.append(enlace)
    enlace.click()
    enlace.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}
