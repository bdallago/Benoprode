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

// Predictions - Match Comments
addKeys(es, ['predictions'], 'hideComments', 'Ocultar comentarios');
addKeys(en, ['predictions'], 'hideComments', 'Hide comments');
addKeys(pt, ['predictions'], 'hideComments', 'Ocultar comentários');

addKeys(es, ['predictions'], 'beFirstComment', 'Sé el primero en comentar');
addKeys(en, ['predictions'], 'beFirstComment', 'Be the first to comment');
addKeys(pt, ['predictions'], 'beFirstComment', 'Seja o primeiro a comentar');

addKeys(es, ['predictions'], 'writeComment', 'Escribe un comentario...');
addKeys(en, ['predictions'], 'writeComment', 'Write a comment...');
addKeys(pt, ['predictions'], 'writeComment', 'Escreva um comentário...');

addKeys(es, ['predictions'], 'viewCommentsCount', 'Ver comentarios');
addKeys(en, ['predictions'], 'viewCommentsCount', 'View comments');
addKeys(pt, ['predictions'], 'viewCommentsCount', 'Ver comentários');


fs.writeFileSync('src/locales/es/translation.json', JSON.stringify(es, null, 2));
fs.writeFileSync('src/locales/en/translation.json', JSON.stringify(en, null, 2));
fs.writeFileSync('src/locales/pt/translation.json', JSON.stringify(pt, null, 2));

console.log("Translations 4 set.");
