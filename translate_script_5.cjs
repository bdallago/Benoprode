const fs = require('fs');
const path = require('path');

const locales = ['es', 'en', 'pt'];

const newKeys = {
  landing: {
    es: {
      subtitle: "Demostrá cuánto sabés de fútbol. Jugá al prode del Mundial 2026, creá ligas con amigos y competí por ser el mejor pronosticador.",
      loginWithGoogle: "Ingresar con Google",
      howItWorks: "¿Cómo funciona?",
      howItWorksDesc: "Todo lo que necesitás para vivir el Mundial de otra manera.",
      feature1Title: "Pronósticos Completos",
      feature1Desc: "Completá la fase de grupos y armá tu propio cuadro para las fases eliminatorias hasta llegar al campeón.",
      feature2Title: "Ligas Privadas",
      feature2Desc: "Creá torneos con amigos, compañeros de trabajo o familiares. El sistema calcula los puntos automáticamente.",
      feature3Title: "Ranking Global",
      feature3Desc: "Competí contra todos los usuarios de la plataforma y ganá el respeto de la comunidad.",
      playNow: "¡Empezá a jugar ahora!"
    },
    en: {
      subtitle: "Show how much you know about football. Play the 2026 World Cup predictor, create leagues with friends, and compete to be the best.",
      loginWithGoogle: "Sign in with Google",
      howItWorks: "How does it work?",
      howItWorksDesc: "Everything you need to experience the World Cup in a different way.",
      feature1Title: "Complete Predictions",
      feature1Desc: "Complete the group stage and build your own bracket for the knockout stages until you reach the champion.",
      feature2Title: "Private Leagues",
      feature2Desc: "Create tournaments with friends, coworkers, or family. The system calculates points automatically.",
      feature3Title: "Global Ranking",
      feature3Desc: "Compete against all users on the platform and earn the community's respect.",
      playNow: "Start playing now!"
    },
    pt: {
      subtitle: "Mostre o quanto sabe de futebol. Jogue o bolão da Copa do Mundo 2026, crie ligas com amigos e compita para ser o melhor.",
      loginWithGoogle: "Entrar com o Google",
      howItWorks: "Como funciona?",
      howItWorksDesc: "Tudo o que você precisa para viver a Copa do Mundo de uma forma diferente.",
      feature1Title: "Previsões Completas",
      feature1Desc: "Complete a fase de grupos e monte sua própria chave para as fases eliminatórias até chegar ao campeão.",
      feature2Title: "Ligas Privadas",
      feature2Desc: "Crie torneios com amigos, colegas de trabalho ou familiares. O sistema calcula os pontos automaticamente.",
      feature3Title: "Ranking Global",
      feature3Desc: "Compita contra todos os usuários da plataforma e ganhe o respeito da comunidade.",
      playNow: "Comece a jogar agora!"
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
