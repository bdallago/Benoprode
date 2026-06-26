import type { Round, KnockoutFixture } from "./types";

const ROUND_MAP: Record<string, Round> = {
  "round of 32": "R32",
  "round of 16": "R16",
  "quarter-finals": "QF",
  "quarterfinals": "QF",
  "semi-finals": "SF",
  "semifinals": "SF",
  "final": "F",
};

// Mapea el label de ronda de la API a nuestra Round, o null si no es KO principal
// (fase de grupos, tercer puesto, etc.).
export function mapApiRound(apiRound: string): Round | null {
  const key = apiRound.trim().toLowerCase();
  return ROUND_MAP[key] ?? null;
}

interface ApiFixtureLike {
  league?: { round?: string };
  teams?: { home?: { name?: string }; away?: { name?: string } };
}

// Convierte fixtures de la API a KnockoutFixture[], mapeando nombres ES.
// Los nombres ausentes del mapa se usan crudos y se reportan en `unmapped`.
export function toKnockoutFixtures(
  apiFixtures: ApiFixtureLike[],
  nameMap: Record<string, string>
): { fixtures: KnockoutFixture[]; unmapped: string[] } {
  const fixtures: KnockoutFixture[] = [];
  const unmapped: string[] = [];
  const mapName = (raw?: string): string => {
    const name = raw ?? "";
    if (name && !(name in nameMap)) unmapped.push(name);
    return nameMap[name] ?? name;
  };
  for (const fx of apiFixtures) {
    const round = mapApiRound(fx.league?.round ?? "");
    if (!round) continue;
    fixtures.push({
      round,
      teamA: mapName(fx.teams?.home?.name),
      teamB: mapName(fx.teams?.away?.name),
    });
  }
  return { fixtures, unmapped };
}
