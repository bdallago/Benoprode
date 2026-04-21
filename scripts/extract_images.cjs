const fs = require('fs');
const path = require('path');

if (!fs.existsSync('public')) { fs.mkdirSync('public', {recursive: true}); }

const scriptDir = __dirname;
const files = fs.readdirSync(scriptDir);
const jsonFiles = files.filter(f => f.startsWith('images_') && f.endsWith('.json'));

let extractedCount = 0;

for (const jsonFile of jsonFiles) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(scriptDir, jsonFile), 'utf8'));
    for (const [filename, base64] of Object.entries(data)) {
      if (filename === 'images.json' || !base64) continue;
      fs.writeFileSync(path.join('public', filename), Buffer.from(base64, 'base64'));
      console.log('Extracted ' + filename);
      extractedCount++;
    }
  } catch (e) {
    console.warn('Could not parse ' + jsonFile + ', skipping. Error: ' + e.message);
  }
}

try {
  if (fs.existsSync(path.join(scriptDir, 'images.json'))) {
     const data = JSON.parse(fs.readFileSync(path.join(scriptDir, 'images.json'), 'utf8'));
     for (const [filename, base64] of Object.entries(data)) {
        if (!base64) continue;
        fs.writeFileSync(path.join('public', filename), Buffer.from(base64, 'base64'));
        console.log('Extracted ' + filename);
        extractedCount++;
     }
  }
} catch (e) {
    console.warn('Could not parse images.json, skipping. Error: ' + e.message);
}

console.log('All ' + extractedCount + ' images extracted successfully.');
