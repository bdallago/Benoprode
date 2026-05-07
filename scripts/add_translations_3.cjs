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

// Predictions - Matches Stage
addKeys(es, ['predictions'], 'matchesStageDesc', '¿Le tuviste demasiada fe a un equipo en la previa? ¿Una lesión de última hora? ¡No pasa nada! Podés hacer tu predicción del resultado final hasta 1 hora antes de cada partido.');
addKeys(en, ['predictions'], 'matchesStageDesc', 'Did you have too much faith in a team beforehand? A last minute injury? No problem! You can make your prediction of the final result up to 1 hour before each match.');
addKeys(pt, ['predictions'], 'matchesStageDesc', 'Você teve muita fé em uma equipe antes? Uma lesão de última hora? Sem problema! Você pode fazer sua previsão do resultado final até 1 hora antes de cada partida.');

addKeys(es, ['predictions'], 'pointsSystem', 'Sistema de Puntos');
addKeys(en, ['predictions'], 'pointsSystem', 'Points System');
addKeys(pt, ['predictions'], 'pointsSystem', 'Sistema de Pontos');

addKeys(es, ['predictions'], 'result', 'Resultado');
addKeys(en, ['predictions'], 'result', 'Result');
addKeys(pt, ['predictions'], 'result', 'Resultado');

addKeys(es, ['predictions'], 'resultDesc', 'Acertando quién gana el partido o si hay empate.');
addKeys(en, ['predictions'], 'resultDesc', 'Guessing who wins the match or if there is a tie.');
addKeys(pt, ['predictions'], 'resultDesc', 'Acertando quem ganha a partida ou se há empate.');

addKeys(es, ['predictions'], 'exactResultTitle', 'Resultado Exacto');
addKeys(en, ['predictions'], 'exactResultTitle', 'Exact Result');
addKeys(pt, ['predictions'], 'exactResultTitle', 'Resultado Exato');

addKeys(es, ['predictions'], 'exactResultDesc', 'Acertando además la cantidad exacta de goles de cada equipo.');
addKeys(en, ['predictions'], 'exactResultDesc', 'Also guessing the exact amount of goals for each team.');
addKeys(pt, ['predictions'], 'exactResultDesc', 'Acertando também a quantidade exata de gols de cada equipe.');

addKeys(es, ['predictions'], 'homeWin', 'Gana Local');
addKeys(en, ['predictions'], 'homeWin', 'Home Win');
addKeys(pt, ['predictions'], 'homeWin', 'Vitória Casa');

addKeys(es, ['predictions'], 'tie', 'Empate');
addKeys(en, ['predictions'], 'tie', 'Tie');
addKeys(pt, ['predictions'], 'tie', 'Empate');

addKeys(es, ['predictions'], 'awayWin', 'Gana Visita');
addKeys(en, ['predictions'], 'awayWin', 'Away Win');
addKeys(pt, ['predictions'], 'awayWin', 'Vitória Visitante');

addKeys(es, ['predictions'], 'viewComments', 'Ver comentarios');
addKeys(en, ['predictions'], 'viewComments', 'View comments');
addKeys(pt, ['predictions'], 'viewComments', 'Ver comentários');

addKeys(es, ['predictions'], 'today', 'Hoy');
addKeys(en, ['predictions'], 'today', 'Today');
addKeys(pt, ['predictions'], 'today', 'Hoje');

addKeys(es, ['predictions'], 'point', 'Punto');
addKeys(en, ['predictions'], 'point', 'Point');
addKeys(pt, ['predictions'], 'point', 'Ponto');

// Live Chat
addKeys(es, ['liveChat'], 'title', 'Chat en vivo');
addKeys(en, ['liveChat'], 'title', 'Live Chat');
addKeys(pt, ['liveChat'], 'title', 'Chat ao Vivo');

addKeys(es, ['liveChat'], 'live', 'EN VIVO');
addKeys(en, ['liveChat'], 'live', 'LIVE');
addKeys(pt, ['liveChat'], 'live', 'AO VIVO');

addKeys(es, ['liveChat'], 'noMessages', 'No hay mensajes recientes. ¡Sé el primero en comentar!');
addKeys(en, ['liveChat'], 'noMessages', 'No recent messages. Be the first to comment!');
addKeys(pt, ['liveChat'], 'noMessages', 'Não há mensagens recentes. Seja o primeiro a comentar!');

addKeys(es, ['liveChat'], 'placeholder', 'Chat en vivo - Próximamente');
addKeys(en, ['liveChat'], 'placeholder', 'Live Chat - Coming Soon');
addKeys(pt, ['liveChat'], 'placeholder', 'Chat ao vivo - Em breve');

// Footer update
addKeys(es, ['footer'], 'contact', 'Contacto:');
addKeys(en, ['footer'], 'contact', 'Contact:');
addKeys(pt, ['footer'], 'contact', 'Contato:');

fs.writeFileSync('src/locales/es/translation.json', JSON.stringify(es, null, 2));
fs.writeFileSync('src/locales/en/translation.json', JSON.stringify(en, null, 2));
fs.writeFileSync('src/locales/pt/translation.json', JSON.stringify(pt, null, 2));

console.log("Translations set.");
