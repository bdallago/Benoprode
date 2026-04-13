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
  { id: 'competitivo', name: 'Mi segundo nombre es Competitivo', description: 'Fundaste o te uniste a un torneo', icon: '🏆' },
  { id: 'social', name: 'Sociable', description: 'Invitaste a tus amigos a participar en el Prode de Beno', icon: '🤝' },
  { id: 'beno_rival', name: 'Rival de Beno', description: 'Te uniste a la Benoliga', icon: '👑' },
  { id: 'el_mejor', name: 'Yo, el mejor de todos', description: 'Acertaste un grupo exacto', icon: '🎯' },
];

export function getUserLevel(points: number) {
  // Find the highest level where the user's points are greater than or equal to the minPoints
  const level = [...LEVELS].reverse().find(l => points >= l.minPoints);
  return level || LEVELS[0];
}

// Mock function to determine badges (in a real app, this would be calculated by Cloud Functions)
export function getUserBadges(points: number, isLeagueCreatorOrMember: boolean, inBenoliga: boolean, hasPerfectGroup: boolean = false, hasInvitedFriends: boolean = false) {
  const earnedBadges: (typeof BADGES[0] | undefined)[] = [];
  
  if (isLeagueCreatorOrMember) earnedBadges.push(BADGES.find(b => b.id === 'competitivo'));
  if (hasInvitedFriends) earnedBadges.push(BADGES.find(b => b.id === 'social'));
  if (inBenoliga) earnedBadges.push(BADGES.find(b => b.id === 'beno_rival'));
  if (hasPerfectGroup) earnedBadges.push(BADGES.find(b => b.id === 'el_mejor'));
  
  return earnedBadges.filter((b): b is typeof BADGES[0] => Boolean(b));
}
