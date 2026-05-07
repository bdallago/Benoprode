const fs = require('fs');
const path = require('path');

const locales = ['es', 'en', 'pt'];

const newKeys = {
  dashboard: {
    es: {
      pointsCalcInfo: "Los puntos se calculan automáticamente según tus aciertos.",
      top10badge: "Top 10% Mundial 🏆",
      top30badge: "Top 30% Mundial 🥈"
    },
    en: {
      pointsCalcInfo: "Points are calculated automatically based on your correct predictions.",
      top10badge: "Top 10% Worldwide 🏆",
      top30badge: "Top 30% Worldwide 🥈"
    },
    pt: {
      pointsCalcInfo: "Os pontos são calculados automaticamente com base nos seus acertos.",
      top10badge: "Top 10% Mundial 🏆",
      top30badge: "Top 30% Mundial 🥈"
    }
  }
};

for (const lang of locales) {
  const filePath = path.join(__dirname, 'src', 'locales', lang, 'translation.json');
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Inject new keys
    for (const key of Object.keys(newKeys)) {
      if (!data[key]) data[key] = {};
      Object.assign(data[key], newKeys[key][lang] || newKeys[key]['es']);
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Updated ${lang}/translation.json`);
  }
}
