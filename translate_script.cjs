const fs = require('fs');
const path = require('path');

const locales = ['es', 'en', 'pt'];

const newKeys = {
  profile: {
    es: {
      sendFriendRequest: "Enviar Solicitud de Amistad",
      requestSent: "Solicitud Enviada",
      areFriends: "Son Amigos",
      viewPredictionsAndChallenge: "Ver sus predicciones y Retar",
      viewPredictions: "Ver predicciones",
      editPredictions: "Editar predicciones",
      summary: "Resumen",
      friends: "Amigos",
      duels: "Duelos",
      headToHead: "Cara a Cara",
      you: "TÚ",
      globalRank: "POSICIÓN GLOBAL",
      goToLeaderboard: "Ir a la tabla general",
      medals: "Medallero",
      noMedals: "Aún no hay medallas para mostrar.",
      searchFriends: "Buscar Amigos",
      searchPlaceholder: "Buscar por nombre de Google...",
      viewProfile: "Ver Perfil",
      noUsersFound: "No se encontraron usuarios.",
      incomingRequests: "Solicitudes Entrantes",
      friendsList: "Lista de Amigos",
      noFriends: "Aún no hay amigos en esta lista.",
      duelHistory: "Historial de Duelos",
      wonDuels: "Duelos Ganados",
      lostDuels: "Duelos Perdidos",
      extraPoints: "Puntos Extra (3 = 1 pt)",
      duelVs: "Duelo vs",
      event: "Evento",
      inProgress: "En curso",
      accepted: "Aceptado",
      winner: "Ganador",
      loser: "Perdedor",
      tie: "Empate",
      exactResult: "Resultado Exacto",
      winnerOrTie: "Ganador/Empate"
    },
    en: {
      sendFriendRequest: "Send Friend Request",
      requestSent: "Request Sent",
      areFriends: "Are Friends",
      viewPredictionsAndChallenge: "View Predictions & Challenge",
      viewPredictions: "View Predictions",
      editPredictions: "Edit Predictions",
      summary: "Summary",
      friends: "Friends",
      duels: "Duels",
      headToHead: "Head to Head",
      you: "YOU",
      globalRank: "GLOBAL RANK",
      goToLeaderboard: "Go to leaderboard",
      medals: "Medals",
      noMedals: "No medals to show yet.",
      searchFriends: "Search Friends",
      searchPlaceholder: "Search by Google name...",
      viewProfile: "View Profile",
      noUsersFound: "No users found.",
      incomingRequests: "Incoming Requests",
      friendsList: "Friends List",
      noFriends: "No friends in this list yet.",
      duelHistory: "Duel History",
      wonDuels: "Won Duels",
      lostDuels: "Lost Duels",
      extraPoints: "Extra Points (3 = 1 pt)",
      duelVs: "Duel vs",
      event: "Event",
      inProgress: "In progress",
      accepted: "Accepted",
      winner: "Winner",
      loser: "Loser",
      tie: "Tie",
      exactResult: "Exact Result",
      winnerOrTie: "Winner/Tie"
    },
    pt: {
      sendFriendRequest: "Enviar Pedido de Amizade",
      requestSent: "Pedido Enviado",
      areFriends: "São Amigos",
      viewPredictionsAndChallenge: "Ver Previsões e Desafiar",
      viewPredictions: "Ver Previsões",
      editPredictions: "Editar Previsões",
      summary: "Resumo",
      friends: "Amigos",
      duels: "Duelos",
      headToHead: "Frente a Frente",
      you: "VOCÊ",
      globalRank: "POSIÇÃO GLOBAL",
      goToLeaderboard: "Ir para a classificação",
      medals: "Medalhas",
      noMedals: "Ainda não há medalhas.",
      searchFriends: "Procurar Amigos",
      searchPlaceholder: "Procurar por nome do Google...",
      viewProfile: "Ver Perfil",
      noUsersFound: "Nenhum usuário encontrado.",
      incomingRequests: "Pedidos Recebidos",
      friendsList: "Lista de Amigos",
      noFriends: "Ainda não tem amigos na lista.",
      duelHistory: "Histórico de Duelos",
      wonDuels: "Duelos Ganhos",
      lostDuels: "Duelos Perdidos",
      extraPoints: "Pontos Extras (3 = 1 pt)",
      duelVs: "Duelo vs",
      event: "Evento",
      inProgress: "Em curso",
      accepted: "Aceito",
      winner: "Vencedor",
      loser: "Perdedor",
      tie: "Empate",
      exactResult: "Resultado Exato",
      winnerOrTie: "Ganhador/Empate"
    }
  },
  news: {
     es: {
       title: "Últimas Noticias",
       desc: "Información relevante para tus predicciones.",
       modifyPredictions: "Modificar mis predicciones",
       readMore: "Leer artículo completo",
       on: "en",
       noNews: "No hay noticias relevantes en este momento."
     },
     en: {
       title: "Latest News",
       desc: "Relevant info for your predictions.",
       modifyPredictions: "Modify my predictions",
       readMore: "Read full article",
       on: "on",
       noNews: "No relevant news at the moment."
     },
     pt: {
       title: "Últimas Notícias",
       desc: "Informações relevantes para seus palpites.",
       modifyPredictions: "Modificar meus palpites",
       readMore: "Ler artigo completo",
       on: "em",
       noNews: "Não há notícias relevantes no momento."
     }
  },
  instructions: {
    es: {
      manual: "Manual de Juego",
      manualDesc: "Aprendé a jugar al Prode de Beno en 5 minutos. Desplegá los paneles para leer las reglas.",
      howToPlay: "¿Cómo arranco a jugar?",
      points: "Sistema de Puntuación",
      medals: "Medallas y Logros"
    },
    en: {
      manual: "Game Manual",
      manualDesc: "Learn how to play in 5 minutes. Expand the panels to read the rules.",
      howToPlay: "How do I play?",
      points: "Scoring System",
      medals: "Medals & Achievements"
    },
    pt: {
      manual: "Manual do Jogo",
      manualDesc: "Aprenda a jogar em 5 minutos. Expanda os painéis para ler as regras.",
      howToPlay: "Como eu jogo?",
      points: "Sistema de Pontuação",
      medals: "Medalhas e Conquistas"
    }
  }
};

for (const lang of locales) {
  const filePath = path.join(__dirname, 'src', 'locales', lang, 'translation.json');
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Inject new keys
    for (const key of Object.keys(newKeys)) {
      if (!data[key]) {
         data[key] = newKeys[key][lang] || newKeys[key]['es'];
      } else {
         Object.assign(data[key], newKeys[key][lang] || newKeys[key]['es']);
      }
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Updated ${lang}/translation.json`);
  }
}
