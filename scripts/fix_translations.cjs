const fs = require('fs');

const es = JSON.parse(fs.readFileSync('src/locales/es/translation.json', 'utf8'));
const en = JSON.parse(fs.readFileSync('src/locales/en/translation.json', 'utf8'));
const pt = JSON.parse(fs.readFileSync('src/locales/pt/translation.json', 'utf8'));

// Navbar
es.navbar.news = "Noticias";
en.navbar.news = "News";
pt.navbar.news = "Notícias";

es.navbar.logout = "Cerrar sesión";
en.navbar.logout = "Log out";
pt.navbar.logout = "Sair";

// Instructions
const inst_es = {
  "groupStageLabel": "Fase de Grupos",
  "groupStageDesc1": "Ordená los equipos del 1º al 4º puesto. Los 2 primeros y los 8 mejores terceros avanzan a la siguiente ronda.",
  "indivMatchesLabel": "Partidos Individuales",
  "indivMatchesDesc": "Predecí el resultado exacto y/o el ganador/empate de cada encuentro.",
  "specialQuestionsLabel": "Preguntas Especiales",
  "specialQuestionsDesc1": "Animate a responder consignas sobre el goleador, selección decepción y más.",
  "knockoutLabel": "Fase Eliminatoria",
  "knockoutDesc1": "Se habilitará una vez que en el torneo real se definan los resultados de fase de grupos.",
  "importantDraw": "¡Importante!",
  "importantDraftDesc": "Podés guardar borradores todas las veces que quieras. Pero cuando hagas clic en \"Fijar Predicciones\", tu prode quedará bloqueado. Las predicciones de partidos individuales pueden editarse hasta 1 hora antes de cada partido.",
  
  "scoreExactPos": "Acertar posición exacta",
  "scorePerfectGroup": "Grupo Perfecto (4 posiciones)",
  "scoreWinner": "Acertar ganador o empate",
  "scoreExactResult": "Acertar resultado exacto (goles)",
  "scoreAdvance16": "Equipo avanza a 16avos",
  "scoreAdvance8": "Equipo avanza a Octavos",
  "scoreAdvance4": "Equipo avanza a Cuartos",
  "scoreAdvance2": "Equipo avanza a Semis",
  "scoreChampion": "Acertar el Campeón",
  "scoreSpecial": "Acertar la respuesta exacta a cada consigna especial planteada.",

  "friendsDesc1": "Enviale solicitudes de amistad a quien quieras. Cuando ambos hayan \"Fijado\" el prode podrán ver las respuestas del otro y retarse a Duelos para saldar diferencias.",
  "friendsLi1": "Retá a un amigo por una posición de grupo, o el transcurso de un partido.",
  "friendsLi2": "Cada Duelo suma 1 victoria para el ganador del mismo.",
  "friendsLi3": "Si los retás por un Grupo Completo (todas las posiciones juntas), ¡te llevás 3 victorias!",
  "friendsLi4": "Recompensa:",
  "friendsLi5": "Cada 3 victorias de duelo acumuladas, obtenés +1 punto en el Ranking Global.",

  "leagueDesc1": "Jugá entre el trabajo, el club o tu grupo.",
  "leagueDesc2": "Además del ranking global, podés ir a la sección \"Ligas\" y crear torneos privados.",
  "leagueDesc3": "Ponele nombre y foto, e invitá a tus amigos pasándoles el enlace exclusivo. Ser miembro de una liga genera una tabla de posiciones exclusiva entre las personas que forman parte de la misma."
};

const inst_en = {
  "groupStageLabel": "Group Stage",
  "groupStageDesc1": "Order the teams from 1st to 4th place. The top 2 and the 8 best third-placed teams advance to the next round.",
  "indivMatchesLabel": "Individual Matches",
  "indivMatchesDesc": "Predict the exact result and/or the winner/tie of each match.",
  "specialQuestionsLabel": "Special Questions",
  "specialQuestionsDesc1": "Dare to answer prompts about the top scorer, biggest disappointment, and more.",
  "knockoutLabel": "Knockout Stage",
  "knockoutDesc1": "It will be enabled once the actual tournament defines the group stage results.",
  "importantDraw": "Important!",
  "importantDraftDesc": "You can save drafts as many times as you want. But when you click on \"Lock Predictions\", your bracket will be locked. Individual match predictions can be edited up to 1 hour before each match.",
  
  "scoreExactPos": "Guess exact position",
  "scorePerfectGroup": "Perfect Group (4 positions)",
  "scoreWinner": "Guess winner or tie",
  "scoreExactResult": "Guess exact result (goals)",
  "scoreAdvance16": "Team advances to Round of 32",
  "scoreAdvance8": "Team advances to Round of 16",
  "scoreAdvance4": "Team advances to Quarterfinals",
  "scoreAdvance2": "Team advances to Semifinals",
  "scoreChampion": "Guess the Champion",
  "scoreSpecial": "Guess the exact answer to each special prompt.",

  "friendsDesc1": "Send friend requests to whoever you want. When both have \"Locked\" their bracket you will be able to see each other's answers and challenge each other to Duels.",
  "friendsLi1": "Challenge a friend for a group position, or a match result.",
  "friendsLi2": "Each Duel adds 1 win for the winner of it.",
  "friendsLi3": "If you challenge them for a Full Group (all positions together), you get 3 wins!",
  "friendsLi4": "Reward:",
  "friendsLi5": "Every 3 duel wins accumulated, you get +1 point in the Global Ranking.",

  "leagueDesc1": "Play with your work, club or group.",
  "leagueDesc2": "In addition to the global ranking, you can go to the \"Leagues\" section and create private tournaments.",
  "leagueDesc3": "Give it a name and picture, and invite your friends by sharing the exclusive link. Being a member of a league generates an exclusive leaderboard among the people who are part of it."
};

const inst_pt = {
  "groupStageLabel": "Fase de Grupos",
  "groupStageDesc1": "Ordene as equipes do 1º ao 4º lugar. Os 2 primeiros e os 8 melhores terceiros colocados avançam para a próxima rodada.",
  "indivMatchesLabel": "Partidas Individuais",
  "indivMatchesDesc": "Preveja o resultado exato e/ou o vencedor/empate de cada partida.",
  "specialQuestionsLabel": "Perguntas Especiais",
  "specialQuestionsDesc1": "Atreva-se a responder perguntas sobre o artilheiro, maior decepção e muito mais.",
  "knockoutLabel": "Fase Eliminatória",
  "knockoutDesc1": "Será ativado assim que o torneio real definir os resultados da fase de grupos.",
  "importantDraw": "Importante!",
  "importantDraftDesc": "Você pode salvar rascunhos quantas vezes quiser. Mas quando clicar em \"Fixar Palpites\", seu bolão será bloqueado. Palpites de partidas individuais podem ser editados até 1 hora antes de cada partida.",
  
  "scoreExactPos": "Acertar posição exata",
  "scorePerfectGroup": "Grupo Perfeito (4 posições)",
  "scoreWinner": "Acertar vencedor ou empate",
  "scoreExactResult": "Acertar resultado exato (gols)",
  "scoreAdvance16": "Equipe avança para 16 avos",
  "scoreAdvance8": "Equipe avança para Oitavas",
  "scoreAdvance4": "Equipe avança para Quartas",
  "scoreAdvance2": "Equipe avança para Semis",
  "scoreChampion": "Acertar o Campeão",
  "scoreSpecial": "Acertar a resposta exata para cada pergunta especial.",

  "friendsDesc1": "Envie pedidos de amizade para quem quiser. Quando ambos tiverem \"Fixado\" o bolão, poderão ver as respostas do outro e desafiar para Duelos.",
  "friendsLi1": "Desafie um amigo por uma posição de grupo ou resultado de partida.",
  "friendsLi2": "Cada Duelo adiciona 1 vitória ao vencedor do mesmo.",
  "friendsLi3": "Se você os desafiar por um Grupo Completo (todas as posições juntas), você ganha 3 vitórias!",
  "friendsLi4": "Recompensa:",
  "friendsLi5": "A cada 3 vitórias de duelo acumuladas, você ganha +1 ponto no Ranking Global.",

  "leagueDesc1": "Jogue com seu trabalho, clube ou grupo.",
  "leagueDesc2": "Além do ranking global, você pode ir na seção \"Ligas\" e criar torneios privados.",
  "leagueDesc3": "Dê um nome e foto, e convide seus amigos compartilhando o link exclusivo. Ser membro de uma liga gera uma tabela de classificação exclusiva entre as pessoas que fazem parte dela."
};

Object.assign(es.instructions, inst_es);
Object.assign(en.instructions, inst_en);
Object.assign(pt.instructions, inst_pt);

// Predictions 
const pred_es = {
  "vs": "vs",
  "tbd": "por definir"
};
const pred_en = {
  "vs": "vs",
  "tbd": "TBD"
};
const pred_pt = {
  "vs": "vs",
  "tbd": "a definir"  
};

if (!es.predictions) es.predictions = {};
if (!en.predictions) en.predictions = {};
if (!pt.predictions) pt.predictions = {};

Object.assign(es.predictions, pred_es);
Object.assign(en.predictions, pred_en);
Object.assign(pt.predictions, pred_pt);

// Share button
es.dashboard.share = "Compartir";
en.dashboard.share = "Share";
pt.dashboard.share = "Compartilhar";

es.dashboard.worldRank = "Ranking Mundial";
en.dashboard.worldRank = "World Ranking";
pt.dashboard.worldRank = "Ranking Mundial";

// Dashboard Medals etc.
const dash_es = {
  "medalsTitle": "Medallas",
  "rankingTitle": "Clasificación Mundial"
};
const dash_en = {
  "medalsTitle": "Badges",
  "rankingTitle": "World Leaderboard"
};
const dash_pt = {
  "medalsTitle": "Medalhas",
  "rankingTitle": "Classificação Mundial"
};
Object.assign(es.dashboard, dash_es);
Object.assign(en.dashboard, dash_en);
Object.assign(pt.dashboard, dash_pt);

// Other
es.footer = {
  "developedBy": "desarrollado por"
};
en.footer = {
  "developedBy": "developed by"
};
pt.footer = {
  "developedBy": "desenvolvido por"
};

es.news.notTranslate = "Las noticias se muestran en su idioma original.";
en.news.notTranslate = "News are shown in their original language.";
pt.news.notTranslate = "As notícias são mostradas em seu idioma original.";

// Leagues page translations (missed ones)
const leag_es = {
  "search": "Buscar",
  "noLeaguesFound": "No se encontraron ligas.",
  "joinTitle": "Unirse a Liga",
  "membersList": "Lista de miembros",
  "leaveLeague": "Abandonar Liga",
  "leagueSettings": "Ajustes de la Liga"
};
const leag_en = {
  "search": "Search",
  "noLeaguesFound": "No leagues found.",
  "joinTitle": "Join League",
  "membersList": "Members List",
  "leaveLeague": "Leave League",
  "leagueSettings": "League Settings"
};
const leag_pt = {
  "search": "Buscar",
  "noLeaguesFound": "Nenhuma liga encontrada.",
  "joinTitle": "Entrar na Liga",
  "membersList": "Lista de membros",
  "leaveLeague": "Sair da Liga",
  "leagueSettings": "Configurações da Liga"
};
Object.assign(es.leagues, leag_es);
Object.assign(en.leagues, leag_en);
Object.assign(pt.leagues, leag_pt);

fs.writeFileSync('src/locales/es/translation.json', JSON.stringify(es, null, 2));
fs.writeFileSync('src/locales/en/translation.json', JSON.stringify(en, null, 2));
fs.writeFileSync('src/locales/pt/translation.json', JSON.stringify(pt, null, 2));

console.log("Translations added.");
