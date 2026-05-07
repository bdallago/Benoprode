const fs = require('fs');
const path = require('path');
const imgPath = path.join(__dirname, '../public/sharecard.png');
const jsonPath = path.join(__dirname, 'images.json');

const imgBase64 = fs.readFileSync(imgPath).toString('base64');
const data = require(jsonPath);
data['sharecard.png'] = imgBase64;
fs.writeFileSync(jsonPath, JSON.stringify(data));
console.log('Successfully added sharecard.png to images.json!');
