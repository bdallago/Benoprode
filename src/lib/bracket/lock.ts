const ONE_HOUR_MS = 60 * 60 * 1000;

// Un cruce queda bloqueado desde 1h antes de su kickoff. Si el kickoff es
// desconocido (la API aún no lo programó), permanece editable.
export function isSlotLocked(kickoffMs: number | undefined, now: number): boolean {
  if (kickoffMs == null) return false;
  return now >= kickoffMs - ONE_HOUR_MS;
}
