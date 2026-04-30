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

// knockout
addKeys(es, ['predictions'], 'knockoutStage', 'Eliminatorias');
addKeys(en, ['predictions'], 'knockoutStage', 'Knockout Stage');
addKeys(pt, ['predictions'], 'knockoutStage', 'Eliminatórias');

addKeys(es, ['predictions'], 'knockoutTooltip', 'Acá vas a poder predecir quién avanza en cada fase eliminatoria una vez que termine la fase de grupos. ¡Estate atento!');
addKeys(en, ['predictions'], 'knockoutTooltip', 'Here you can predict who advances in each knockout stage once the group stage is over. Stay tuned!');
addKeys(pt, ['predictions'], 'knockoutTooltip', 'Aqui você poderá prever quem avança em cada fase eliminatória assim que a fase de grupos terminar. Fique atento!');

addKeys(es, ['predictions'], 'stageRoundOf32', '16avos');
addKeys(en, ['predictions'], 'stageRoundOf32', 'Round of 32');
addKeys(pt, ['predictions'], 'stageRoundOf32', '16avos');

addKeys(es, ['predictions'], 'stageRoundOf16', 'Octavos');
addKeys(en, ['predictions'], 'stageRoundOf16', 'Round of 16');
addKeys(pt, ['predictions'], 'stageRoundOf16', 'Oitavas');

addKeys(es, ['predictions'], 'stageQuarterFinals', 'Cuartos');
addKeys(en, ['predictions'], 'stageQuarterFinals', 'Quarter Finals');
addKeys(pt, ['predictions'], 'stageQuarterFinals', 'Quartas');

addKeys(es, ['predictions'], 'stageSemiFinals', 'Semifinal');
addKeys(en, ['predictions'], 'stageSemiFinals', 'Semifinals');
addKeys(pt, ['predictions'], 'stageSemiFinals', 'Semifinal');

addKeys(es, ['predictions'], 'stageFinal', 'Final');
addKeys(en, ['predictions'], 'stageFinal', 'Final');
addKeys(pt, ['predictions'], 'stageFinal', 'Final');

addKeys(es, ['predictions'], 'matchTitle', 'Partido');
addKeys(en, ['predictions'], 'matchTitle', 'Match');
addKeys(pt, ['predictions'], 'matchTitle', 'Partida');

addKeys(es, ['predictions'], 'tbdTeam', 'Por definir');
addKeys(en, ['predictions'], 'tbdTeam', 'To be decided');
addKeys(pt, ['predictions'], 'tbdTeam', 'A definir');

addKeys(es, ['predictions'], 'knockoutDesc', 'Disponible luego de la fase de grupos');
addKeys(en, ['predictions'], 'knockoutDesc', 'Available after the group stage');
addKeys(pt, ['predictions'], 'knockoutDesc', 'Disponível após a fase de grupos');


// Predictions Page Banners
addKeys(es, ['predictions'], 'sign1Title', 'Fase 1 y Especiales');
addKeys(en, ['predictions'], 'sign1Title', 'Phase 1 & Specials');
addKeys(pt, ['predictions'], 'sign1Title', 'Fase 1 e Especiais');

addKeys(es, ['predictions'], 'closedAndLocked', 'Las predicciones de la Fase de Grupos y Predicciones Especiales se encuentran cerradas y fijadas de manera permanente.');
addKeys(en, ['predictions'], 'closedAndLocked', 'Group Stage and Special predictions are permanently closed and locked.');
addKeys(pt, ['predictions'], 'closedAndLocked', 'As previsões da Fase de Grupos e Previsões Especiais estão permanentemente encerradas e bloqueadas.');

addKeys(es, ['predictions'], 'openAndUnlocked', 'Aún podés modificar estas categorías hasta antes del inicio del torneo (10 de Junio).');
addKeys(en, ['predictions'], 'openAndUnlocked', 'You can still modify these categories until before the start of the tournament (June 10).');
addKeys(pt, ['predictions'], 'openAndUnlocked', 'Você ainda pode modificar estas categorias até antes do início do torneio (10 de Junho).');

addKeys(es, ['predictions'], 'sign2Title', 'Partidos Individuales');
addKeys(en, ['predictions'], 'sign2Title', 'Individual Matches');
addKeys(pt, ['predictions'], 'sign2Title', 'Partidas Individuais');

addKeys(es, ['predictions'], 'sign2DescPart1', '¡Recordá guardar y fijar tus predicciones');
addKeys(en, ['predictions'], 'sign2DescPart1', 'Remember to save and lock your predictions');
addKeys(pt, ['predictions'], 'sign2DescPart1', 'Lembre-se de salvar e fixar suas previsões');

addKeys(es, ['predictions'], 'sign2DescPart2', 'antes del cierre de cada partido');
addKeys(en, ['predictions'], 'sign2DescPart2', 'before the start of each match');
addKeys(pt, ['predictions'], 'sign2DescPart2', 'antes do início de cada partida');

addKeys(es, ['predictions'], 'sign2DescPart3', 'para sumar puntos!');
addKeys(en, ['predictions'], 'sign2DescPart3', 'to earn points!');
addKeys(pt, ['predictions'], 'sign2DescPart3', 'para ganhar pontos!');

// UserPredictionsModal
addKeys(es, ['predictions'], 'userPredictionsTitle', 'Predicciones de {{name}}');
addKeys(en, ['predictions'], 'userPredictionsTitle', '{{name}}\'s Predictions');
addKeys(pt, ['predictions'], 'userPredictionsTitle', 'Previsões de {{name}}');

fs.writeFileSync('src/locales/es/translation.json', JSON.stringify(es, null, 2));
fs.writeFileSync('src/locales/en/translation.json', JSON.stringify(en, null, 2));
fs.writeFileSync('src/locales/pt/translation.json', JSON.stringify(pt, null, 2));

console.log("Translations set.");
