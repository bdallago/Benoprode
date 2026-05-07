const fs = require('fs');
const path = require('path');

const locales = ['es', 'en', 'pt'];

const newKeys = {
  instructions: {
    es: {
      friendsAndDuels: "Amigos y Duelos",
      leagues: "Torneos y Ligas Privadas"
    },
    en: {
      friendsAndDuels: "Friends & Duels",
      leagues: "Tournaments & Private Leagues"
    },
    pt: {
      friendsAndDuels: "Amigos e Duelos",
      leagues: "Torneios e Ligas Privadas"
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
