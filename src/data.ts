export const GROUPS = {
  A: ["México", "Sudáfrica", "Corea del Sur", "República Checa"],
  B: ["Canadá", "Bosnia y Herzegovina", "Qatar", "Suiza"],
  C: ["Brasil", "Marruecos", "Haití", "Escocia"],
  D: ["Estados Unidos", "Paraguay", "Australia", "Turquía"],
  E: ["Alemania", "Curazao", "Costa de Marfil", "Ecuador"],
  F: ["Países Bajos", "Japón", "Suecia", "Túnez"],
  G: ["Bélgica", "Egipto", "Irán", "Nueva Zelanda"],
  H: ["España", "Cabo Verde", "Arabia Saudita", "Uruguay"],
  I: ["Francia", "Senegal", "Irak", "Noruega"],
  J: ["Argentina", "Argelia", "Austria", "Jordania"],
  K: ["Portugal", "República Democrática del Congo", "Uzbekistán", "Colombia"],
  L: ["Inglaterra", "Croacia", "Ghana", "Panamá"]
};

export const ALL_TEAMS = Object.values(GROUPS).flat().sort();

export const SPECIAL_QUESTIONS = [
  { id: "topScorer", label: "¿QUIÉN SERÁ EL GOLEADOR DEL TORNEO?" },
  { id: "missedPenalty", label: "¿QUÉ JUGADOR FALLARÁ UN PENAL EN ALGÚN MOMENTO DEL TORNEO?" },
  { id: "injuredDuring", label: "¿QUÉ JUGADOR SE LESIONARÁ DURANTE EL MUNDIAL?" },
  { id: "fastestGoal", label: "¿QUÉ SELECCIÓN CONVERTIRÁ EL GOL MÁS RÁPIDO?" },
  { id: "latestGoal", label: "¿QUÉ SELECCIÓN CONVERTIRÁ EL GOL MÁS TARDÍO?" },
  { id: "revelation", label: "¿QUÉ SELECCIÓN SERÁ LA REVELACIÓN DEL TORNEO?" },
  { id: "disappointment", label: "¿QUÉ SELECCIÓN SERÁ LA DECEPCIÓN DEL TORNEO?" },
  { id: "bestPlayer", label: "¿QUIÉN SERÁ EL MEJOR JUGADOR DEL TORNEO?" },
  { id: "bestYoungPlayer", label: "¿QUIÉN SERÁ EL MEJOR JUGADOR JOVEN DEL TORNEO?" },
  { id: "mostGoalsInMatch", label: "¿QUÉ SELECCIÓN CONVERTIRÁ MÁS GOLES EN UN PARTIDO?" }
];

export const KNOCKOUT_STAGES = [
  { id: "roundOf16", label: "¿Quién avanza en 16avos? (Pasan a Octavos)", count: 16, points: 2 },
  { id: "quarterFinals", label: "¿Quién avanza en 8vos? (Pasan a Cuartos)", count: 8, points: 4 },
  { id: "semiFinals", label: "¿Quién avanza en 4tos? (Pasan a Semis)", count: 4, points: 6 },
  { id: "finals", label: "¿Quién avanza en semis? (Pasan a la Final)", count: 2, points: 8 },
  { id: "champion", label: "¿Quién sale campeón?", count: 1, points: 15 }
];
