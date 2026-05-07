const fs = require('fs');
const path = require('path');

const locales = ['es', 'en', 'pt'];

const newKeys = {
  predictions: {
    es: {
      sign1Title: "Fase de Grupos & Preguntas",
      closedAndLocked: "Predicciones cerradas y fijadas",
      openAndUnlocked: "Predicciones abiertas y sin fijar",
      sign2Title: "Partidos Individuales",
      sign2DescPart1: "Podés modificar hasta",
      sign2DescPart2: "una hora antes",
      sign2DescPart3: "del inicio de cada encuentro",
      tabGroups: "Fase de Grupos",
      tabMatches: "Partidos Individuales",
      tabKnockout: "Fase Eliminatoria",
      tabSpecials: "Preguntas Especiales"
    },
    en: {
      sign1Title: "Group Stage & Specials",
      closedAndLocked: "Predictions closed and locked",
      openAndUnlocked: "Predictions open and unlocked",
      sign2Title: "Individual Matches",
      sign2DescPart1: "Can be modified up to",
      sign2DescPart2: "one hour before",
      sign2DescPart3: "each match starts",
      tabGroups: "Group Stage",
      tabMatches: "Individual Matches",
      tabKnockout: "Knockout Stage",
      tabSpecials: "Special Questions"
    },
    pt: {
      sign1Title: "Fase de Grupos e Especiais",
      closedAndLocked: "Palpites fechados e trancados",
      openAndUnlocked: "Palpites abertos e destrancados",
      sign2Title: "Partidas Individuais",
      sign2DescPart1: "Pode modificar até",
      sign2DescPart2: "uma hora antes",
      sign2DescPart3: "do início de cada jogo",
      tabGroups: "Fase de Grupos",
      tabMatches: "Partidas Individuais",
      tabKnockout: "Fase Eliminatória",
      tabSpecials: "Perguntas Especiais"
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
