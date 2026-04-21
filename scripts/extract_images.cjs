const fs = require('fs');
const path = require('path');

if (!fs.existsSync('public')) { fs.mkdirSync('public', {recursive: true}); }

try {
  const data = JSON.parse(fs.readFileSync('./scripts/images.json', 'utf8'));
  for (const [filename, base64] of Object.entries(data)) {
    fs.writeFileSync(path.join('public', filename), Buffer.from(base64, 'base64'));
    console.log('Extracted ' + filename);
  }
  console.log('All images extracted successfully.');
} catch (e) {
  console.warn('Could not parse images.json, skipping image extraction. Error: ' + e.message);
}
