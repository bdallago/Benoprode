const fs = require('fs');

const es = JSON.parse(fs.readFileSync('src/locales/es/translation.json', 'utf8'));
const en = JSON.parse(fs.readFileSync('src/locales/en/translation.json', 'utf8'));
const pt = JSON.parse(fs.readFileSync('src/locales/pt/translation.json', 'utf8'));

// Notifications
es.notifications.title = "Notificaciones";
en.notifications.title = "Notifications";
pt.notifications.title = "Notificações";

// Predictions Modal Translations
const pred_es = {
  "share": "Compartir",
  "draftShort": "Borrador",
  "lockShort": "Fijar",
  "lockedShort": "Fijadas",
  "incompleteTitle": "¡Atención! Predicciones incompletas",
  "incompleteWarning": "Estás a punto de fijar tu prode, pero dejaste algunas secciones sin responder:",
  "missingMatches": "Te faltan {{count}} partidos individuales.",
  "missingSpecials": "Te faltan {{count}} preguntas especiales.",
  "losePointsWarning": "Si fijás ahora, perderás la oportunidad de sumar esos puntos. ¿Estás seguro/a?",
  "reviewAgain": "Revisar de nuevo",
  "lockWithEmpty": "Fijar con espacios vacíos"
};

const pred_en = {
  "share": "Share",
  "draftShort": "Draft",
  "lockShort": "Lock",
  "lockedShort": "Locked",
  "incompleteTitle": "Attention! Incomplete predictions",
  "incompleteWarning": "You are about to lock your bracket, but you left some sections unanswered:",
  "missingMatches": "You are missing {{count}} individual matches.",
  "missingSpecials": "You are missing {{count}} special questions.",
  "losePointsWarning": "If you lock now, you will lose the chance to earn those points. Are you sure?",
  "reviewAgain": "Review again",
  "lockWithEmpty": "Lock with empty fields"
};

const pred_pt = {
  "share": "Compartilhar",
  "draftShort": "Rascunho",
  "lockShort": "Fixar",
  "lockedShort": "Fixadas",
  "incompleteTitle": "Atenção! Palpites incompletos",
  "incompleteWarning": "Você está prestes a fixar seu bolão, mas deixou algumas seções sem resposta:",
  "missingMatches": "Faltam {{count}} partidas individuais.",
  "missingSpecials": "Faltam {{count}} perguntas especiais.",
  "losePointsWarning": "Se você fixar agora, perderá a chance de ganhar esses pontos. Tem certeza?",
  "reviewAgain": "Revisar novamente",
  "lockWithEmpty": "Fixar com campos vazios"
};

Object.assign(es.predictions, pred_es);
Object.assign(en.predictions, pred_en);
Object.assign(pt.predictions, pred_pt);

// Dashboard / Ranking page text
const rank_es = {
  "ranks": {
    "guru": "Gurú Mundial",
    "expert": "Experto",
    "apprentice": "Aprendiz"
  }
};
const rank_en = {
  "ranks": {
    "guru": "World Guru",
    "expert": "Expert",
    "apprentice": "Apprentice"
  }
};
const rank_pt = {
  "ranks": {
    "guru": "Guru Mundial",
    "expert": "Especialista",
    "apprentice": "Aprendiz"
  }
};
Object.assign(es.dashboard, rank_es);
Object.assign(en.dashboard, rank_en);
Object.assign(pt.dashboard, rank_pt);

es.profile.noMedals = "Aún no hay medallas para mostrar.";
en.profile.noMedals = "No badges to show yet.";
pt.profile.noMedals = "Nenhuma medalha para mostrar ainda.";

es.profile.badges = {
  "sociableTitle": "Sociable",
  "sociableDesc": "Has invitado amigos o te has unido a ligas",
  "riskTakerTitle": "Arriesgado",
  "riskTakerDesc": "Apuestas por resultados poco probables",
  "perfectGroupTitle": "Grupo Perfecto",
  "perfectGroupDesc": "Has acertado todas las posiciones de un grupo",
  "duelMasterTitle": "Maestro Duelo",
  "duelMasterDesc": "Has ganado varios duelos contra amigos",
  "firstToPredictTitle": "Tempranero",
  "firstToPredictDesc": "De los primeros en fijar su prode",
  "championTitle": "Campeón",
  "championDesc": "Ganador de una liga o torneo"
};

en.profile.badges = {
  "sociableTitle": "Sociable",
  "sociableDesc": "You invited friends or joined leagues",
  "riskTakerTitle": "Risk Taker",
  "riskTakerDesc": "You bet on unlikely results",
  "perfectGroupTitle": "Perfect Group",
  "perfectGroupDesc": "Guessed all positions in a group",
  "duelMasterTitle": "Duel Master",
  "duelMasterDesc": "Won several duels against friends",
  "firstToPredictTitle": "Early Bird",
  "firstToPredictDesc": "One of the first to lock predictions",
  "championTitle": "Champion",
  "championDesc": "Winner of a league or tournament"
};

pt.profile.badges = {
  "sociableTitle": "Sociável",
  "sociableDesc": "Você convidou amigos ou entrou em ligas",
  "riskTakerTitle": "Ousado",
  "riskTakerDesc": "Você aposta em resultados pouco prováveis",
  "perfectGroupTitle": "Grupo Perfeito",
  "perfectGroupDesc": "Acertou todas as posições de um grupo",
  "duelMasterTitle": "Mestre dos Duelos",
  "duelMasterDesc": "Venceu vários duelos contra amigos",
  "firstToPredictTitle": "Pioneiro",
  "firstToPredictDesc": "Um dos primeiros a fixar o bolão",
  "championTitle": "Campeão",
  "championDesc": "Vencedor de uma liga ou torneio"
};


fs.writeFileSync('src/locales/es/translation.json', JSON.stringify(es, null, 2));
fs.writeFileSync('src/locales/en/translation.json', JSON.stringify(en, null, 2));
fs.writeFileSync('src/locales/pt/translation.json', JSON.stringify(pt, null, 2));

console.log("Locales updated missing keys.");
