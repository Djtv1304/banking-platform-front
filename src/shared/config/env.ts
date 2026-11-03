// Valores públicos de configuración. Todo lo que empieza con VITE_ termina en el bundle del navegador:
// nunca poner secretos aquí (p. ej. el API key de WorkOS y la contraseña de la cookie viven solo en el backend).
export const env = {
  /**
   * Origen del backend. Vacío (recomendado) = mismo origen que la SPA: en desarrollo Vite hace de
   * proxy de `/api` y en producción un reverse proxy sirve SPA y API bajo el mismo dominio.
   * Así la cookie de sesión es de primera parte (SameSite=Lax, sin CORS con credenciales).
   */
  apiUrl: import.meta.env.VITE_API_URL ?? '',
}
