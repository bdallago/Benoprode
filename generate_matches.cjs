const fs = require('fs');

const input = `
Jueves, 11 de junio 2026
16:00 (Argentina) / 15:00 (Este EE.UU) México vs. Sudáfrica - Grupo A - Estadio Ciudad de México
23:00 (Argentina) / 22.00 (Este EE.UU) Corea del Sur vs. República Checa – Grupo A - Estadio Guadalajara
Viernes, 12 de junio 2026
16:00 (Argentina) / 15:00 (Este EE.UU) Canadá vs. Bosnia y Herzegovina – Grupo B - Toronto Stadium
22:00 (Argentina) / 21:00 (Este EE.UU) Estados Unidos vs. Paraguay – Grupo D - Los Angeles Stadium
Sábado, 13 de junio 2026
16:00 (Argentina) / 15:00 (Este EE.UU) Qatar vs. Suiza – Grupo B - San Francisco Bay Area Stadium
19:00 (Argentina) / 18:00 (Este EE.UU) Brasil vs. Marruecos – Grupo C - Nueva York Nueva Jersey Stadium
22:00 (Argentina) / 21:00 (Este EE.UU) Haití vs. Escocia – Grupo C - Boston Stadium
01:00 (domingo 14/6 de Argentina) / 00.00 (Este EE.UU) Australia vs. Turquía – Grupo D - BC Place Vancouver
Domingo, 14 de junio 2026
14:00 (Argentina) / 13:00 (Este EE.UU) Alemania vs. Curazao – Grupo E - Houston Stadium
17:00 (Argentina) / 16:00 (Este EE.UU) Países Bajos vs. Japón – Grupo F - Dallas Stadium
20:00 (Argentina) / 19:00 (Este EE.UU) Costa de Marfil vs. Ecuador – Grupo E - Philadelphia Stadium
23:00 (Argentina) / 22.00 (Este EE.UU) Suecia vs. Túnez – Grupo F - Estadio Monterrey
Lunes, 15 de junio 2026
13:00 (Argentina) / 12:00 (Este EE.UU) España vs. Cabo Verde – Grupo H - Atlanta Stadium
16:00 (Argentina) / 15:00 (Este EE.UU) Bélgica vs. Egipto – Grupo G - Seattle Stadium
19:00 (Argentina) / 18:00 (Este EE.UU) Arabia Saudita vs. Uruguay – Grupo H - Miami Stadium
22:00 (Argentina) / 21:00 (Este EE.UU) Irán vs. Nueva Zelanda – Grupo G - Los Angeles Stadium
Martes, 16 de junio 2026
16:00 (Argentina) / 15:00 (Este EE.UU) Francia vs. Senegal – Grupo I - New York New Jersey Stadium
19:00 (Argentina) / 18:00 (Este EE.UU) Irak vs. Noruega – Grupo I - Boston Stadium
22:00 (Argentina) / 21:00 (Este EE.UU) Argentina vs. Argelia – Grupo J - Kansas City Stadium
01:00 (miércoles 17/6 de Argentina) / 00:00 (Este EE.UU) Austria vs. Jordania – Grupo J - San Francisco Bay Area Stadium
Miércoles, 17 de junio 2026
14:00 (Argentina) / 13:00 (Este EE.UU) Portugal vs. República Democrática del Congo – Grupo K - Houston Stadium
17:00 (Argentina) / 16:00 (Este EE.UU) Inglaterra vs. Croacia – Grupo L - Dallas Stadium
20:00 (Argentina) / 19:00 (Este EE.UU) Ghana vs. Panamá – Grupo L - Toronto Stadium
23:00 (Argentina) / 22.00 (Este EE.UU) Uzbekistán vs. Colombia – Grupo K - Estadio Ciudad de México
Jueves, 18 de junio 2026
13:00 (Argentina) / 12:00 (Este EE.UU) República Checa vs. Sudáfrica – Grupo A - Atlanta Stadium
16:00 (Argentina) / 15:00 (Este EE.UU) Suiza vs. Bosnia y Herzegovina – Grupo B - Los Angeles Stadium
19:00 (Argentina) / 18:00 (Este EE.UU) Canadá vs. Qatar – Grupo B - BC Place Vancouver
22:00 (Argentina) / 21:00 (Este EE.UU) México vs. Corea del Sur – Grupo A - Estadio Guadalajara
Viernes, 19 de junio 2026
16:00 (Argentina) / 15:00 (Este EE.UU) Estados Unidos vs. Australia – Grupo D - Seattle Stadium
19:00 (Argentina) / 18:00 (Este EE.UU) Escocia vs. Marruecos – Grupo C - Boston Stadium
22:00 (Argentina) / 21:00 (Este EE.UU) Brasil vs. Haití – Grupo C - Philadelphia Stadium
01:00 (sábado 20/6 de Argentina) / 00:00 (Este EE.UU) Turquía vs. Paraguay – Grupo D - San Francisco Bay Area Stadium
Sábado, 20 de junio 2026
14:00 (Argentina) / 13:00 (Este EE.UU) Países Bajos vs. Suecia – Grupo F - Houston Stadium
17:00 (Argentina) / 16:00 (Este EE.UU) Alemania vs. Costa de Marfil – Grupo E - Toronto Stadium
21:00 (Argentina) / 20:00 (Este EE.UU) Ecuador vs. Curazao – Grupo E - Kansas City Stadium
01:00 (domingo 21/6 de Argentina) / 00:00 (Este EE.UU) Túnez vs. Japón – Grupo F - Estadio Monterrey
Domingo, 21 de junio 2026
13:00 (Argentina) / 12:00 (Este EE.UU) España vs. Arabia Saudita – Grupo H - Atlanta Stadium
16:00 (Argentina) / 15:00 (Este EE.UU) Bélgica vs. Irán – Grupo G - Los Angeles Stadium
19:00 (Argentina) / 18:00 (Este EE.UU) Uruguay vs. Cabo Verde – Grupo H - Miami Stadium
22:00 (Argentina) / 21:00 (Este EE.UU) Nueva Zelanda vs. Egipto – Grupo G - BC Place Vancouver
Lunes, 22 de junio 2026
14:00 (Argentina) / 13:00 (Este EE.UU) Argentina vs. Austria – Grupo J - Dallas Stadium
18:00 (Argentina) / 17:00 (Este EE.UU) Francia vs. Irak – Grupo I - Philadelphia Stadium
21:00 (Argentina) / 20:00 (Este EE.UU) Noruega vs. Senegal – Grupo I - Nueva York Nueva Jersey Stadium
00:00 (martes 23/6 de Argentina) / 23:00 (Este EE.UU) Jordania vs. Argelia – Grupo J - San Francisco Bay Area Stadium
Martes, 23 de junio 2026
14:00 (Argentina) / 13:00 (Este EE.UU) Portugal vs. Uzbekistán – Grupo K - Houston Stadium
17:00 (Argentina) / 16:00 (Este EE.UU) Inglaterra vs. Ghana – Grupo L - Boston Stadium
20:00 (Argentina) / 19:00 (Este EE.UU) Panamá vs. Croacia – Grupo L - Toronto Stadium
23:00 (Argentina) / 22.00 (Este EE.UU) Colombia vs. República Democrática del Congo – Grupo K - Estadio Guadalajara
Miércoles, 24 de junio 2026
16:00 (Argentina) / 15:00 (Este EE.UU) Suiza vs. Canadá – Grupo B - BC Place Vancouver
16:00 (Argentina) / 15:00 (Este EE.UU) Bosnia y Herzegovina vs. Qatar – Grupo B - Seattle Stadium
19:00 (Argentina) / 18:00 (Este EE.UU) Escocia vs. Brasil – Grupo C - Miami Stadium
19:00 (Argentina) / 18:00 (Este EE.UU) Marruecos vs. Haití – Grupo C - Atlanta Stadium
22:00 (Argentina) / 21:00 (Este EE.UU) República Checa vs. México – Grupo A - Estadio Ciudad de México
22:00 (Argentina) / 21:00 (Este EE.UU) Sudáfrica vs. Corea del Sur – Grupo A - Estadio Monterrey
Jueves, 25 de junio 2026
17:00 (Argentina) / 16:00 (Este EE.UU) Ecuador vs. Alemania – Grupo E - New York New Jersey Stadium
17:00 (Argentina) / 16:00 (Este EE.UU) Curazao vs. Costa de Marfil – Grupo E- Philadelphia Stadium
20:00 (Argentina) / 19:00 (Este EE.UU) Túnez vs. Países Bajos – Grupo F - Kansas City Stadium
20:00 (Argentina) / 19:00 (Este EE.UU) Japón vs. Suecia – Grupo F - Dallas Stadium
23:00 (Argentina) / 22.00 (Este EE.UU) Turquía vs. Estados Unidos – Grupo D - Los Angeles Stadium
23:00 (Argentina) / 22.00 (Este EE.UU) Paraguay vs. Australia – Grupo D - San Francisco Bay Area Stadium
Viernes, 26 de junio 2026
16:00 (Argentina) / 15:00 (Este EE.UU) Noruega vs. Francia – Grupo I - Boston Stadium
16:00 (Argentina) / 15:00 (Este EE.UU) Senegal vs. Irak – Grupo I - Toronto Stadium
21:00 (Argentina) / 20:00 (Este EE.UU) Uruguay vs. España – Grupo H - Estadio Guadalajara
21:00 (Argentina) / 20:00 (Este EE.UU) Cabo Verde vs. Arabia Saudita – Grupo H - Houston Stadium
00:00 (sábado 27/6 de Argentina) / 23:00 (Este EE.UU) Nueva Zelanda vs. Bélgica – Grupo G - BC Place Vancouver
00:00 (sábado 27/6 de Argentina) / 23:00 (Este EE.UU) Egipto vs. Irán – Grupo G - Seattle Stadium
Sábado, 27 de junio 2026
18:00 (Argentina) / 17:00 (Este EE.UU) Panamá vs. Inglaterra – Grupo L - New York New Jersey Stadium
18:00 (Argentina) / 17:00 (Este EE.UU) Croacia vs. Ghana – Grupo L - Philadelphia Stadium
20:30 (Argentina) / 19:30 (Este EE.UU) Colombia vs. Portugal – Grupo K - Miami Stadium
20:30 (Argentina) / 19:30 (Este EE.UU) República Democrática del Congo vs. Uzbekistán – Grupo K - Atlanta Stadium
23:00 (Argentina) / 22.00 (Este EE.UU) Jordania vs. Argentina – Grupo J - Dallas Stadium
23:00 (Argentina) / 22.00 (Este EE.UU) Argelia vs. Austria – Grupo J - Kansas Stadium
`;

const lines = input.split('\n').filter(l => l.trim().length > 0);
const matches = [];
let currentDate = '';
let matchId = 1;

const monthMap = {
  'junio': '06'
};

for (const line of lines) {
  if (line.match(/^[A-Z][a-z]+, \d+ de [a-z]+ 2026$/)) {
    const parts = line.split(' ');
    const day = parts[1].padStart(2, '0');
    const month = monthMap[parts[3]];
    currentDate = `2026-${month}-${day}`;
  } else {
    const timeMatch = line.match(/^(\d{2}:\d{2})/);
    if (!timeMatch) continue;
    
    const time = timeMatch[1];
    
    let actualDate = currentDate;
    const nextDayMatch = line.match(/\((\w+) (\d+)\/(\d+) de Argentina\)/);
    if (nextDayMatch) {
      const d = nextDayMatch[2].padStart(2, '0');
      const m = nextDayMatch[3].padStart(2, '0');
      actualDate = `2026-${m}-${d}`;
    } else if (line.match(/\(miércoles 17\/6 de Argentina\)/)) {
      actualDate = `2026-06-17`;
    } else if (line.match(/\(sábado 20\/6 de Argentina\)/)) {
      actualDate = `2026-06-20`;
    } else if (line.match(/\(domingo 21\/6 de Argentina\)/)) {
      actualDate = `2026-06-21`;
    } else if (line.match(/\(martes 23\/6 de Argentina\)/)) {
      actualDate = `2026-06-23`;
    } else if (line.match(/\(sábado 27\/6 de Argentina\)/)) {
      actualDate = `2026-06-27`;
    }

    const teamsPart = line.split(/– Grupo|- Grupo/)[0];
    const teamsStr = teamsPart.split(') ').pop().trim();
    
    let [teamA, teamB] = teamsStr.split(' vs. ');
    
    if (teamA === 'Bosnia') teamA = 'Bosnia y Herzegovina';
    if (teamB === 'Bosnia') teamB = 'Bosnia y Herzegovina';
    if (teamA === 'Rep. Dem. Congo') teamA = 'República Democrática del Congo';
    if (teamB === 'Rep. Dem. Congo') teamB = 'República Democrática del Congo';
    
    const dateObj = new Date(`${actualDate}T${time}:00.000-03:00`);
    
    matches.push({
      id: `match_${matchId++}`,
      teamA: teamA.trim(),
      teamB: teamB.trim(),
      date: dateObj.toISOString()
    });
  }
}

fs.writeFileSync('src/lib/matches.json', JSON.stringify(matches, null, 2));
console.log(`Generated ${matches.length} matches.`);
