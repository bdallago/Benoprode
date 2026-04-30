const fs = require('fs');

const es = JSON.parse(fs.readFileSync('src/locales/es/translation.json', 'utf8'));
const en = JSON.parse(fs.readFileSync('src/locales/en/translation.json', 'utf8'));
const pt = JSON.parse(fs.readFileSync('src/locales/pt/translation.json', 'utf8'));

const addKeys = (obj, path, key, value) => {
  let curr = obj;
  for(let i=0; i<path.length; i++) {
    if(!curr[path[i]]) curr[path[i]] = {};
    curr = curr[path[i]];
  }
  curr[key] = value;
};

// GlobalLeaderboard & Dashboard translations
const items = {
  competeAgainstAll: {
    es: 'Competí contra todos los usuarios registrados en el prode. Acá vas a ver la posición de cada jugador a nivel mundial.',
    en: 'Compete against all registered users in the pool. Here you will see the position of each player worldwide.',
    pt: 'Compita contra todos os usuários registrados no bolão. Aqui você verá a posição de cada jogador no mundo.'
  },
  worldRanking: {
    es: 'Ranking Mundial',
    en: 'World Ranking',
    pt: 'Ranking Mundial'
  },
  searchPlayer: {
    es: 'Buscar jugador...',
    en: 'Search player...',
    pt: 'Buscar jogador...'
  },
  findMe: {
    es: 'Buscarme',
    en: 'Find Me',
    pt: 'Me Encontrar'
  },
  loadingRanking: {
    es: 'Cargando clasificación...',
    en: 'Loading ranking...',
    pt: 'Carregando classificação...'
  },
  tablePos: {
    es: 'Pos',
    en: 'Pos',
    pt: 'Pos'
  },
  tablePlayer: {
    es: 'Jugador',
    en: 'Player',
    pt: 'Jogador'
  },
  tablePoints: {
    es: 'Puntos',
    en: 'Points',
    pt: 'Pontos'
  },
  noPlayersFound: {
    es: 'No se encontraron jugadores.',
    en: 'No players found.',
    pt: 'Nenhum jogador encontrado.'
  },
  prevPage: {
    es: 'Anterior',
    en: 'Previous',
    pt: 'Anterior'
  },
  page: {
    es: 'Página',
    en: 'Page',
    pt: 'Página'
  },
  nextPage: {
    es: 'Siguiente',
    en: 'Next',
    pt: 'Próxima'
  },
  yourMedals: {
    es: 'Tus Medallas',
    en: 'Your Medals',
    pt: 'Suas Medalhas'
  },
  medalProgress: {
    es: 'Progreso de medallas',
    en: 'Medal progress',
    pt: 'Progresso das medalhas'
  },
  earnedMedals: {
    es: 'Medallas Obtenidas',
    en: 'Earned Medals',
    pt: 'Medalhas Obtidas'
  },
  noMedalsYet: {
    es: 'Aún no has obtenido ninguna medalla. ¡Participá para ganar la primera!',
    en: 'You haven\'t earned any medals yet. Participate to win your first!',
    pt: 'Você ainda não obteve nenhuma medalha. Participe para ganhar a primeira!'
  },
  allMedals: {
    es: 'Todas las Medallas',
    en: 'All Medals',
    pt: 'Todas as Medalhas'
  },
  viewAllMedals: {
    es: 'Ver todas las medallas',
    en: 'View all medals',
    pt: 'Ver todas as medalhas'
  },
  mysteryMedal: {
    es: 'Medalla misteriosa',
    en: 'Mystery medal',
    pt: 'Medalha misteriosa'
  },
  mysteryMedalDesc: {
    es: 'Sabrás su contenido cuando la obtengas',
    en: 'You will know its content when you get it',
    pt: 'Você saberá seu conteúdo quando a obtiver'
  }
};

for (const [key, langs] of Object.entries(items)) {
  addKeys(es, ['dashboard'], key, langs.es);
  addKeys(en, ['dashboard'], key, langs.en);
  addKeys(pt, ['dashboard'], key, langs.pt);
}


fs.writeFileSync('src/locales/es/translation.json', JSON.stringify(es, null, 2));
fs.writeFileSync('src/locales/en/translation.json', JSON.stringify(en, null, 2));
fs.writeFileSync('src/locales/pt/translation.json', JSON.stringify(pt, null, 2));

console.log("Translations 5 set.");
