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

// profile fields used in Duels
addKeys(es, ['profile'], 'groupComplete', 'Grupo Completo');
addKeys(en, ['profile'], 'groupComplete', 'Complete Group');
addKeys(pt, ['profile'], 'groupComplete', 'Grupo Completo');

addKeys(es, ['profile'], 'position', 'Posición');
addKeys(en, ['profile'], 'position', 'Position');
addKeys(pt, ['profile'], 'position', 'Posição');

addKeys(es, ['profile'], 'exactResult', 'Resultado Exacto');
addKeys(en, ['profile'], 'exactResult', 'Exact Result');
addKeys(pt, ['profile'], 'exactResult', 'Resultado Exato');

addKeys(es, ['profile'], 'winnerOrTie', 'Ganador/Empate');
addKeys(en, ['profile'], 'winnerOrTie', 'Winner/Tie');
addKeys(pt, ['profile'], 'winnerOrTie', 'Vencedor/Empate');

addKeys(es, ['profile'], 'event', 'Evento');
addKeys(en, ['profile'], 'event', 'Event');
addKeys(pt, ['profile'], 'event', 'Evento');

addKeys(es, ['profile'], 'duelVs', 'Duelo contra');
addKeys(en, ['profile'], 'duelVs', 'Duel vs');
addKeys(pt, ['profile'], 'duelVs', 'Duelo contra');

addKeys(es, ['profile'], 'inProgress', 'En progreso');
addKeys(en, ['profile'], 'inProgress', 'In progress');
addKeys(pt, ['profile'], 'inProgress', 'Em andamento');

addKeys(es, ['profile'], 'accepted', 'Aceptado');
addKeys(en, ['profile'], 'accepted', 'Accepted');
addKeys(pt, ['profile'], 'accepted', 'Aceito');

addKeys(es, ['profile'], 'winner', 'Ganador');
addKeys(en, ['profile'], 'winner', 'Winner');
addKeys(pt, ['profile'], 'winner', 'Vencedor');

addKeys(es, ['profile'], 'loser', 'Perdedor');
addKeys(en, ['profile'], 'loser', 'Loser');
addKeys(pt, ['profile'], 'loser', 'Perdedor');

addKeys(es, ['profile'], 'tie', 'Empate');
addKeys(en, ['profile'], 'tie', 'Tie');
addKeys(pt, ['profile'], 'tie', 'Empate');

// leagues specific for benoliga
addKeys(es, ['leagues'], 'createdByBeno', 'Creado por Beno');
addKeys(en, ['leagues'], 'createdByBeno', 'Created by Beno');
addKeys(pt, ['leagues'], 'createdByBeno', 'Criado por Beno');

addKeys(es, ['leagues'], 'benoligaDesc', 'Competí contra Beno y ganale en su cara y en su cancha. ¡El creador del prode te desafía!');
addKeys(en, ['leagues'], 'benoligaDesc', 'Compete against Beno and beat him on his home turf. The bracket creator challenges you!');
addKeys(pt, ['leagues'], 'benoligaDesc', 'Aposte contra o Beno e vença ele na sua própria casa. O criador do bolão te desafia!');

addKeys(es, ['leagues'], 'joinChallenge', 'Unirse al Desafío');
addKeys(en, ['leagues'], 'joinChallenge', 'Join the Challenge');
addKeys(pt, ['leagues'], 'joinChallenge', 'Entrar no Desafio');

addKeys(es, ['leagues'], 'abandonLeague', 'Abandonar Liga');
addKeys(en, ['leagues'], 'abandonLeague', 'Leave League');
addKeys(pt, ['leagues'], 'abandonLeague', 'Sair da Liga');

addKeys(es, ['leagues'], 'liveChat', 'Chat en vivo');
addKeys(en, ['leagues'], 'liveChat', 'Live Chat');
addKeys(pt, ['leagues'], 'liveChat', 'Chat ao Vivo');

// Dashboard Medallas
addKeys(es, ['dashboard'], 'mysteryMedal', 'Medalla misteriosa');
addKeys(en, ['dashboard'], 'mysteryMedal', 'Mystery Medal');
addKeys(pt, ['dashboard'], 'mysteryMedal', 'Medalha misteriosa');

addKeys(es, ['dashboard'], 'mysteryMedalDesc', 'Sabrás su contenido cuando la obtengas');
addKeys(en, ['dashboard'], 'mysteryMedalDesc', 'You will know its meaning when you earn it');
addKeys(pt, ['dashboard'], 'mysteryMedalDesc', 'Saberá o significado ao obtê-la');

fs.writeFileSync('src/locales/es/translation.json', JSON.stringify(es, null, 2));
fs.writeFileSync('src/locales/en/translation.json', JSON.stringify(en, null, 2));
fs.writeFileSync('src/locales/pt/translation.json', JSON.stringify(pt, null, 2));

console.log("Updated more strings.");
