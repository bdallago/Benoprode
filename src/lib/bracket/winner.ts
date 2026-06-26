interface FixtureLike {
  teams?: { home?: { name?: string; winner?: boolean | null }; away?: { name?: string; winner?: boolean | null } };
  goals?: { home?: number | null; away?: number | null };
}

// Determina el equipo ganador de un cruce KO. Prioriza el flag de la API
// (que ya contempla alargue/penales); si no está, usa goles. Null si no resoluble.
export function winnerOf(fx: FixtureLike): string | null {
  const home = fx.teams?.home;
  const away = fx.teams?.away;
  if (home?.winner === true) return home.name ?? null;
  if (away?.winner === true) return away.name ?? null;
  const gh = fx.goals?.home;
  const ga = fx.goals?.away;
  if (gh == null || ga == null) return null;
  if (gh > ga) return home?.name ?? null;
  if (ga > gh) return away?.name ?? null;
  return null;
}
