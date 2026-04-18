import fs from 'fs';
import path from 'path';

const files = ['portada-escritorio.jpeg', 'portada-telefono.jpeg', 'navbar.jpeg'];
const publicDir = path.join(process.cwd(), 'public');

console.log('Restaurando imágenes binarias desde archivos base64...');

files.forEach(file => {
  const b64Path = path.join(publicDir, `${file}.b64`);
  const imgPath = path.join(publicDir, file);
  
  if (fs.existsSync(b64Path)) {
    const b64Data = fs.readFileSync(b64Path, 'utf8');
    fs.writeFileSync(imgPath, Buffer.from(b64Data, 'base64'));
    console.log(`✅ ${file} restaurado con éxito.`);
  } else {
    console.log(`⚠️ No se encontró ${b64Path}, omitiendo.`);
  }
});
