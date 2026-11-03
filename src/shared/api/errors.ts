import { isAxiosError } from 'axios'

// Error normalizado de la API. Soporta:
//   - ProblemDetails (RFC 9457): { "type", "title", "status", "detail", "instance", ...extensiones (p. ej. "codigo") }
//   - HTTPException de FastAPI:  { "detail": "mensaje" } o { "detail": { "code": "...", "message": "..." } }
//   - Validación 422 de FastAPI: { "detail": [{ "loc": [...], "msg": "...", "type": "..." }] }
export class ApiError extends Error {
  readonly status: number | null
  readonly code: string

  constructor(message: string, status: number | null, code: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

const DEFAULT_MESSAGE = 'Ocurrió un error inesperado. Inténtalo nuevamente.'
const NETWORK_MESSAGE = 'No pudimos conectarnos con el servidor. Revisa tu conexión.'

interface ApiErrorBody {
  title?: string
  codigo?: string
  code?: string
  detail?: string | { code?: string; message?: string } | Array<{ msg?: string }>
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (!isAxiosError<ApiErrorBody>(error)) return new ApiError(DEFAULT_MESSAGE, null, 'unknown')
  if (!error.response) return new ApiError(NETWORK_MESSAGE, null, 'network_error')

  const { status, data } = error.response
  const detail = data?.detail
  const code = data?.codigo ?? data?.code ?? `http_${status}`

  if (typeof detail === 'string') return new ApiError(detail, status, code)
  if (Array.isArray(detail)) {
    return new ApiError(detail[0]?.msg ?? DEFAULT_MESSAGE, status, 'validation_error')
  }
  if (detail) return new ApiError(detail.message ?? DEFAULT_MESSAGE, status, detail.code ?? code)
  return new ApiError(data?.title ?? DEFAULT_MESSAGE, status, code)
}
