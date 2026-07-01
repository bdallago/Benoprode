// La API de fútbol está ACTIVA solo si API_ENABLED === "true".
// Ausente o cualquier otro valor = pausada (modo carga manual).
export function isApiEnabled(): boolean {
  return process.env.API_ENABLED === "true";
}
