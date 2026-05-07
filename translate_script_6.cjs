const fs = require('fs');
const path = require('path');

const locales = ['es', 'en', 'pt'];

const newKeys = {
  landing: {
    es: {
      feature1Title: "1. Hacé tus predicciones",
      feature1Desc: "Pronosticá las posiciones de la fase de grupos, los resultados de los partidos y quiénes llegarán a la final.",
      feature2Title: "2. Creá tu Liga",
      feature2Desc: "Armá una liga privada con tus amigos, familia o compañeros de trabajo y compartiles el link para que se unan.",
      feature3Title: "3. Sumá puntos",
      feature3Desc: "A medida que se den los resultados reales, sumarás puntos. ¡El que más puntos tenga al final del Mundial, gana!",
      readyToPlay: "¿Estás listo para demostrar que sabés más que tus amigos?"
    },
    en: {
      feature1Title: "1. Make your predictions",
      feature1Desc: "Predict group stage standings, match results, and who will reach the final.",
      feature2Title: "2. Create your League",
      feature2Desc: "Set up a private league with friends, family, or coworkers and share the link for them to join.",
      feature3Title: "3. Earn points",
      feature3Desc: "As real results come in, you'll earn points. The one with the most points at the end of the World Cup wins!",
      readyToPlay: "Are you ready to prove you know more than your friends?"
    },
    pt: {
      feature1Title: "1. Faça seus palpites",
      feature1Desc: "Preveja as posições da fase de grupos, os resultados dos jogos e quem chegará à final.",
      feature2Title: "2. Crie sua Liga",
      feature2Desc: "Monte uma liga privada com amigos, família ou colegas de trabalho e compartilhe o link para eles entrarem.",
      feature3Title: "3. Ganhe pontos",
      feature3Desc: "À medida que os resultados reais acontecem, você ganha pontos. Quem tiver mais pontos no final da Copa ganha!",
      readyToPlay: "Pronto para provar que sabe mais que seus amigos?"
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
