import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

// E0-07 · la regla de lint que impide la palabra «socio» en los textos de la app
const eslint = new ESLint({ cwd: process.cwd() })

async function errores(codigo: string, archivo = 'src/features/demo/mensajes.tsx') {
  const [resultado] = await eslint.lintText(codigo, { filePath: archivo })
  return resultado.messages.filter((m) => m.ruleId === 'no-restricted-syntax')
}

describe('regla «socio» (E0-07)', () => {
  it.each([
    ['una cadena', `export const m = 'Busca al socio'`],
    ['una cadena con mayúscula', `export const m = 'Socios activos'`],
    ['el femenino', `export const m = 'La socia nueva'`],
    ['el femenino plural', `export const m = 'Las socias'`],
    ['una plantilla', 'export const m = (n: number) => `Hay ${n} socios`'],
    ['texto JSX', `export const M = () => <p>Lista de socios</p>`],
  ])('falla con %s', async (_caso, codigo) => {
    const lista = await errores(codigo)
    expect(lista).toHaveLength(1)
    expect(lista[0].message).toBe('En la app se habla de clientes, nunca de socios (E0-07).')
  })

  it('acepta «cliente» y palabras que sólo contienen «soci»', async () => {
    expect(await errores(`export const m = 'Clientes asociados a la sociedad'`)).toHaveLength(0)
  })

  it('no aplica a los tests, que pueden afirmar que la palabra no aparece', async () => {
    expect(await errores(`export const m = 'socio'`, 'src/features/demo/mensajes.test.ts')).toHaveLength(0)
  })
})
