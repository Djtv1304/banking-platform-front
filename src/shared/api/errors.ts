import { isAxiosError } from 'axios'

// Error normalizado de la API. Soporta:
//   - ProblemDetails (RFC 9457): { "type", "title", "status", "detail", "instance", ...extensiones (p. ej. "codigo") }
//     con la extensión "errors": [{ "field", "message" }] para los errores por campo (400/409/422)
//   - HTTPException de FastAPI:  { "detail": "mensaje" } o { "detail": { "code": "...", "message": "..." } }
//   - Validación 422 de FastAPI: { "detail": [{ "loc": [...], "msg": "...", "type": "..." }] }
/** Error de un campo concreto del body (ProblemDetails → `errors`) */
export interface ApiFieldError {
  field: string
  message: string
}

export class ApiError extends Error {
  readonly status: number | null
  readonly code: string
  /** Errores por campo que envió el backend; vacío si no hay */
  readonly fields: readonly ApiFieldError[]
  readonly traceId?: string

  constructor(message: string, status: number | null, code: string, fields: readonly ApiFieldError[] = [], traceId?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
    this.traceId = traceId
  }
}

const DEFAULT_MESSAGE = 'Ocurrió un error inesperado. Inténtalo nuevamente.'
const NETWORK_MESSAGE = 'No pudimos conectarnos con el servidor. Revisa tu conexión.'

interface ApiErrorBody {
  traceId?: string
  title?: string
  codigo?: string
  code?: string
  detail?: string | { code?: string; message?: string } | Array<{ msg?: string }>
  errors?: unknown
}

/** Solo las entradas con `field` y `message` de texto: el resto se ignora */
function readFieldErrors(errors: unknown): ApiFieldError[] {
  if (!Array.isArray(errors)) return []
  return errors.flatMap((item: unknown) => {
    if (typeof item !== 'object' || item === null) return []
    const { field, message } = item as Record<string, unknown>
    return typeof field === 'string' && typeof message === 'string' ? [{ field, message }] : []
  })
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (!isAxiosError<ApiErrorBody>(error)) return new ApiError(DEFAULT_MESSAGE, null, 'unknown')
  if (!error.response) return new ApiError(NETWORK_MESSAGE, null, 'network_error')

  const { status, data } = error.response
  const detail = data?.detail
  const code = data?.codigo ?? data?.code ?? `http_${status}`
  const fields = readFieldErrors(data?.errors)
  const traceId = typeof data?.traceId === 'string' ? data.traceId : undefined

  if (typeof detail === 'string') return new ApiError(detail, status, code, fields, traceId)
  if (Array.isArray(detail)) {
    return new ApiError(detail[0]?.msg ?? DEFAULT_MESSAGE, status, 'validation_error')
  }
  if (detail) return new ApiError(detail.message ?? DEFAULT_MESSAGE, status, detail.code ?? code, fields, traceId)
  return new ApiError(data?.title ?? DEFAULT_MESSAGE, status, code, fields, traceId)
}
