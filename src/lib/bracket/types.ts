// Posición de grupo usada como lado fijo de un cruce de R32 (nunca un tercero).
// Formato: "<posición><grupo>", ej. "1A" = ganador del grupo A, "2D" = segundo del D.
export type GroupSeed = string;

export type SlotId = string; // "R32-1" | "R16-1" | "QF-1" | "SF-1" | "F" ...

export type Round = "R32" | "R16" | "QF" | "SF" | "F";

export interface BracketSlot {
  id: SlotId;
  round: Round;
  // Slots origen cuyos ganadores alimentan este slot (vacío en R32).
  sources: SlotId[];
  // Sólo en R32: lado fijo conocido del cruce.
  fixedSeed?: GroupSeed;
}

// Standings derivados de /standings: por grupo, equipos ordenados por posición (índice 0 = 1°).
export type Standings = Record<string, string[]>;

// Cruce KO tal como lo entrega la API ya mapeado a nombres internos.
export interface KnockoutFixture {
  round: Round;
  teamA: string;
  teamB: string;
}
