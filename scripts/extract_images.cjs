const fs = require('fs');
const path = require('path');
const data = require('./images.json');
if (!fs.existsSync('public')) { fs.mkdirSync('public', {recursive: true}); }
for (const [filename, base64] of Object.entries(data)) {
  fs.writeFileSync(path.join('public', filename), Buffer.from(base64, 'base64'));
  console.log('Extracted ' + filename);
}
console.log('All images extracted successfully.');
