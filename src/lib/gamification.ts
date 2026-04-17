export const LEVELS = [
  { name: 'Hincha Casual', minPoints: 0, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
  { name: 'Simpatizante', minPoints: 50, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  { name: 'Socio', minPoints: 150, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  { name: 'Ojeador', minPoints: 300, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  { name: 'Analista Táctico', minPoints: 500, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  { name: 'Director Técnico', minPoints: 800, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  { name: 'Leyenda Mundial', minPoints: 1200, color: 'text-sky-500', bg: 'bg-sky-100 dark:bg-sky-900/30' },
];

export const BADGES = [
  // Grupos y Resultados
  { id: 'visionario', name: 'Visionario', description: 'Acertaste las posiciones finales exactas de 1 grupo', icon: '👁️', level: 1 },
  { id: 'oraculo', name: 'Oráculo', description: 'Acertaste las posiciones finales exactas de 3 grupos', icon: '🔮', level: 2 },
  { id: 'viajero_tiempo', name: 'Viajero del Tiempo', description: 'Acertaste las posiciones finales exactas de 6 grupos', icon: '⏳', level: 3 },
  
  { id: 'ojo_halcon', name: 'Ojo de Halcón', description: 'Acertaste el resultado exacto de 1 partido', icon: '🦅', level: 1 },
  { id: 'francotirador', name: 'Francotirador', description: 'Acertaste el resultado exacto de 5 partidos', icon: '🎯', level: 2 },
  { id: 'cirujano', name: 'Cirujano', description: 'Acertaste el resultado exacto de 10 partidos', icon: '🔪', level: 3 },
  { id: 'nostradamus', name: 'Nostradamus', description: 'Acertaste el resultado exacto de 20 partidos', icon: '📜', level: 4 },
  
  { id: 'primer_paso', name: 'Primer Paso', description: 'Guardaste o fijaste tus predicciones por primera vez', icon: '📝' },
  { id: 'dia_perfecto', name: 'Día Perfecto', description: 'Acertaste todos los resultados de un día entero', icon: '☀️' },
  { id: 'dueno_fecha', name: 'Dueño de la Fecha', description: 'Acertaste todos los resultados de una fecha entera', icon: '👑' },
  
  { id: 'en_racha', name: 'En Racha', description: 'Acertaste el resultado en 3 partidos consecutivos', icon: '🔥', level: 1 },
  { id: 'on_fire', name: 'On Fire', description: 'Acertaste el resultado en 5 partidos consecutivos', icon: '☄️', level: 2 },
  { id: 'imparable', name: 'Imparable', description: 'Acertaste el resultado en 10 partidos consecutivos', icon: '🚀', level: 3 },
  
  { id: 'sociable', name: 'Sociable', description: 'Invitaste a 1 amigo a jugar', icon: '🤝', level: 1 },
  { id: 'influencer', name: 'Influencer', description: 'Invitaste a 5 amigos a jugar', icon: '📱', level: 2 },
  { id: 'embajador', name: 'Embajador', description: 'Invitaste a 10 amigos a jugar', icon: '🌍', level: 3 },

  // Intermedias
  { id: 'constante', name: 'Constante', description: 'Sumaste puntos en 3 días distintos', icon: '📅', level: 1 },
  { id: 'fiel', name: 'Fiel', description: 'Sumaste puntos en 5 días distintos', icon: '🗓️', level: 2 },
  { id: 'incondicional', name: 'Incondicional', description: 'Sumaste puntos en 10 días distintos', icon: '📆', level: 3 },
  
  { id: 'palo_afuera', name: 'Palo y afuera', description: 'Acertaste todos los resultados del día excepto uno', icon: '🥅' },
  
  { id: 'suma_sigue', name: 'Suma y Sigue', description: 'Acertaste el resultado en 10 partidos', icon: '➕', level: 1 },
  { id: 'hormiga', name: 'Hormiga Trabajadora', description: 'Acertaste el resultado en 20 partidos', icon: '🐜', level: 2 },
  { id: 'calculadora', name: 'Calculadora', description: 'Acertaste el resultado en 30 partidos', icon: '🧮', level: 3 },

  // Duelos
  { id: 'primera_sangre', name: 'Primera Sangre', description: 'Ganaste tu primer duelo contra otro jugador', icon: '🩸', level: 1 },
  { id: 'duelista', name: 'Duelista', description: 'Ganaste 3 duelos', icon: '🤺', level: 2 },
  { id: 'gladiador', name: 'Gladiador', description: 'Ganaste 5 duelos', icon: '🛡️', level: 3 },
  { id: 'invencible', name: 'Invencible', description: 'Ganaste 10 duelos', icon: '👑', level: 4 },

  // Especiales y Difíciles
  { id: 'sobre_hora', name: 'Sobre la Hora', description: 'Fijaste tu predicción 10 minutos antes del cierre', icon: '⏱️' },
  { id: 'piedra', name: 'Piedra', description: 'Erraste un resultado donde el ganador era claro (>70%)', icon: '🗿' },
  { id: 'campeon_barrio', name: 'Campeón de Barrio', description: 'Alcanzaste el primer puesto de un torneo con 4+ jugadores', icon: '🏘️' },
  { id: 'zona_copas', name: 'Zona de copas', description: 'Te ubicaste en el mejor 30% de los jugadores', icon: '🍷', level: 1 },
  { id: 'en_cima', name: 'En la Cima', description: 'Te ubicaste en el mejor 10% de los jugadores', icon: '🏔️', level: 2 },
  { id: 'siempre_arriba', name: 'Siempre Arriba', description: 'Top 30% al finalizar las 3 fechas', icon: '📈', level: 1 },
  { id: 'creme_creme', name: 'Creme de la Creme', description: 'Top 10% al finalizar las 3 fechas', icon: '🎩', level: 2 },
  { id: 'ojo_clinico', name: 'Ojo Clínico', description: 'Acertaste un resultado poco claro (40-60%)', icon: '🩺' },
  { id: 'esta_locura', name: 'Esta Locura', description: 'Acertaste los 3 resultados de Argentina en el Grupo J', icon: '🧉' },
  { id: 'confiado', name: 'Confiado', description: 'Fijaste tus predicciones antes del 1° de Junio', icon: '😎' },
  { id: 'mufa', name: 'Mufa', description: 'Erraste todos los resultados de un grupo entero', icon: '🥶' },

  // Torneos
  { id: 'rival_beno', name: 'Rival de Beno', description: 'Te uniste a la Benoliga', icon: '🥊' },
  { id: 'competitivo', name: 'Mi segundo nombre es competitivo', description: 'Te uniste a un Torneo o Liga', icon: '🏆' },
  
  // Secretas
  { id: 'estrategia', name: 'Jugar mal fue parte de la estrategia', description: 'Sumaste más puntos en la fecha 3 que en la 1 o 2', icon: '🤫', isSecret: true },
  { id: 'cazador_utopias', name: 'Cazador de Utopías imposibles', description: 'Acertaste un ganador poco favorito (<30%)', icon: '🦄', isSecret: true },
  { id: 'hora_juez', name: 'La hora juez!', description: 'Sumaste puntos por un gol después del minuto 80', icon: '⌚', isSecret: true },
  { id: 'muchachos', name: 'Muchaaachos', description: 'Tu torneo privado llegó a 10 integrantes', icon: '🇦🇷', isSecret: true },
  { id: 'zzz', name: 'Zzz', description: 'Acertaste un resultado 0-0', icon: '😴', isSecret: true },
  { id: 'hare_10_veces', name: 'Haré 10 veces más si es necesario. Ellos no están preparados', description: 'Finalizaste en segundo puesto luego de la fase de grupos', icon: '🥈', isSecret: true },
];

export function getUserLevel(points: number) {
  // Find the highest level where the user's points are greater than or equal to the minPoints
  const level = [...LEVELS].reverse().find(l => points >= l.minPoints);
  return level || LEVELS[0];
}

export function getUserBadges(
  points: number, 
  userStats: any = {}
): string[] {
  const earnedBadgeIds: string[] = [];
  
  // Logic to determine earned badges based on userStats
  
  // Example logic based on referrals
  const referrals = userStats.referralsCount || 0;
  if (referrals >= 10) earnedBadgeIds.push('embajador');
  else if (referrals >= 5) earnedBadgeIds.push('influencer');
  else if (referrals >= 1) earnedBadgeIds.push('sociable');

  // Example logic based on saved predictions
  if (userStats.hasSavedPredictions) {
    earnedBadgeIds.push('primer_paso');
  }

  if (userStats.inBenoliga) {
    earnedBadgeIds.push('rival_beno');
  }

  if (userStats.inPrivateLeague) {
    earnedBadgeIds.push('competitivo');
  }

  return earnedBadgeIds;
}
