const fs = require('fs');

const es = JSON.parse(fs.readFileSync('src/locales/es/translation.json', 'utf8'));
const en = JSON.parse(fs.readFileSync('src/locales/en/translation.json', 'utf8'));
const pt = JSON.parse(fs.readFileSync('src/locales/pt/translation.json', 'utf8'));

if(!es.gamification) es.gamification = { levels: {}, badges: {} };
if(!en.gamification) en.gamification = { levels: {}, badges: {} };
if(!pt.gamification) pt.gamification = { levels: {}, badges: {} };

const lvls_es = {
  "casual": "Hincha Casual",
  "supporter": "Simpatizante",
  "member": "Socio",
  "scout": "Ojeador",
  "tactical": "Analista Táctico",
  "manager": "Director Técnico",
  "legend": "Leyenda Mundial"
};

const lvls_en = {
  "casual": "Casual Fan",
  "supporter": "Supporter",
  "member": "Member",
  "scout": "Scout",
  "tactical": "Tactical Analyst",
  "manager": "Manager",
  "legend": "World Legend"
};

const lvls_pt = {
  "casual": "Torcedor Casual",
  "supporter": "Simpatizante",
  "member": "Sócio",
  "scout": "Olheiro",
  "tactical": "Analista Tático",
  "manager": "Técnico",
  "legend": "Lenda Mundial"
};

Object.assign(es.gamification.levels, lvls_es);
Object.assign(en.gamification.levels, lvls_en);
Object.assign(pt.gamification.levels, lvls_pt);

// Copy BADGES text mostly
const badges_es = {
  "visionario": { "name": "Visionario", "description": "Acertaste las posiciones finales exactas de 1 grupo" },
  "oraculo": { "name": "Oráculo", "description": "Acertaste las posiciones finales exactas de 3 grupos" },
  "viajero_tiempo": { "name": "Viajero del Tiempo", "description": "Acertaste las posiciones finales exactas de 6 grupos" },
  "ojo_halcon": { "name": "Ojo de Halcón", "description": "Acertaste el resultado exacto de 1 partido" },
  "francotirador": { "name": "Francotirador", "description": "Acertaste el resultado exacto de 5 partidos" },
  "cirujano": { "name": "Cirujano", "description": "Acertaste el resultado exacto de 10 partidos" },
  "nostradamus": { "name": "Nostradamus", "description": "Acertaste el resultado exacto de 20 partidos" },
  "primer_paso": { "name": "Primer Paso", "description": "Guardaste o fijaste tus predicciones por primera vez" },
  "dia_perfecto": { "name": "Día Perfecto", "description": "Acertaste todos los resultados de un día entero" },
  "dueno_fecha": { "name": "Dueño de la Fecha", "description": "Acertaste todos los resultados de una fecha entera" },
  "en_racha": { "name": "En Racha", "description": "Acertaste el resultado en 3 partidos consecutivos" },
  "on_fire": { "name": "On Fire", "description": "Acertaste el resultado en 5 partidos consecutivos" },
  "imparable": { "name": "Imparable", "description": "Acertaste el resultado en 10 partidos consecutivos" },
  "sociable": { "name": "Sociable", "description": "Invitaste a 1 amigo a jugar" },
  "influencer": { "name": "Influencer", "description": "Invitaste a 5 amigos a jugar" },
  "embajador": { "name": "Embajador", "description": "Invitaste a 10 amigos a jugar" },
  "constante": { "name": "Constante", "description": "Sumaste puntos en 3 días distintos" },
  "fiel": { "name": "Fiel", "description": "Sumaste puntos en 5 días distintos" },
  "incondicional": { "name": "Incondicional", "description": "Sumaste puntos en 10 días distintos" },
  "palo_afuera": { "name": "Palo y afuera", "description": "Acertaste todos los resultados del día excepto uno" },
  "suma_sigue": { "name": "Suma y Sigue", "description": "Acertaste el resultado en 10 partidos" },
  "hormiga": { "name": "Hormiga Trabajadora", "description": "Acertaste el resultado en 20 partidos" },
  "calculadora": { "name": "Calculadora", "description": "Acertaste el resultado en 30 partidos" },
  "primera_sangre": { "name": "Primera Sangre", "description": "Ganaste tu primer duelo contra otro jugador" },
  "duelista": { "name": "Duelista", "description": "Ganaste 3 duelos" },
  "gladiador": { "name": "Gladiador", "description": "Ganaste 5 duelos" },
  "invencible": { "name": "Invencible", "description": "Ganaste 10 duelos" },
  "sobre_hora": { "name": "Sobre la Hora", "description": "Fijaste tu predicción 10 minutos antes del cierre" },
  "piedra": { "name": "Piedra", "description": "Erraste un resultado donde el ganador era claro (>70%)" },
  "campeon_barrio": { "name": "Campeón de Barrio", "description": "Alcanzaste el primer puesto de un torneo con 4+ jugadores" },
  "zona_copas": { "name": "Zona de copas", "description": "Te ubicaste en el mejor 30% de los jugadores" },
  "en_cima": { "name": "En la Cima", "description": "Te ubicaste en el mejor 10% de los jugadores" },
  "siempre_arriba": { "name": "Siempre Arriba", "description": "Top 30% al finalizar las 3 fechas" },
  "creme_creme": { "name": "Creme de la Creme", "description": "Top 10% al finalizar las 3 fechas" },
  "ojo_clinico": { "name": "Ojo Clínico", "description": "Acertaste un resultado poco claro (40-60%)" },
  "esta_locura": { "name": "Esta Locura", "description": "Acertaste los 3 resultados de Argentina en el Grupo J" },
  "confiado": { "name": "Confiado", "description": "Fijaste tus predicciones antes del 1° de Junio" },
  "mufa": { "name": "Mufa", "description": "Erraste todos los resultados de un grupo entero" },
  "rival_beno": { "name": "Rival de Beno", "description": "Te uniste a la Benoliga" },
  "competitivo": { "name": "Mi segundo nombre es competitivo", "description": "Te uniste a un Torneo o Liga" },
  "estrategia": { "name": "Jugar mal fue parte de la estrategia", "description": "Sumaste más puntos en la fecha 3 que en la 1 o 2" },
  "cazador_utopias": { "name": "Cazador de Utopías imposibles", "description": "Acertaste un ganador poco favorito (<30%)" },
  "hora_juez": { "name": "La hora juez!", "description": "Sumaste puntos por un gol después del minuto 80" },
  "muchachos": { "name": "Muchaaachos", "description": "Tu torneo privado llegó a 10 integrantes" },
  "zzz": { "name": "Zzz", "description": "Acertaste un resultado 0-0" },
  "hare_10_veces": { "name": "Haré 10 veces más si es necesario. Ellos no están preparados", "description": "Finalizaste en segundo puesto luego de la fase de grupos" }
};

const badges_en = {
  "visionario": { "name": "Visionary", "description": "Guessed exact final positions of 1 group" },
  "oraculo": { "name": "Oracle", "description": "Guessed exact final positions of 3 groups" },
  "viajero_tiempo": { "name": "Time Traveler", "description": "Guessed exact final positions of 6 groups" },
  "ojo_halcon": { "name": "Hawk Eye", "description": "Guessed exact result of 1 match" },
  "francotirador": { "name": "Sniper", "description": "Guessed exact result of 5 matches" },
  "cirujano": { "name": "Surgeon", "description": "Guessed exact result of 10 matches" },
  "nostradamus": { "name": "Nostradamus", "description": "Guessed exact result of 20 matches" },
  "primer_paso": { "name": "First Step", "description": "Saved or locked your predictions for the first time" },
  "dia_perfecto": { "name": "Perfect Day", "description": "Guessed all results of an entire day" },
  "dueno_fecha": { "name": "Owner of the Matchday", "description": "Guessed all results of an entire matchday" },
  "en_racha": { "name": "On a Roll", "description": "Guessed the result in 3 consecutive matches" },
  "on_fire": { "name": "On Fire", "description": "Guessed the result in 5 consecutive matches" },
  "imparable": { "name": "Unstoppable", "description": "Guessed the result in 10 consecutive matches" },
  "sociable": { "name": "Sociable", "description": "Invited 1 friend to play" },
  "influencer": { "name": "Influencer", "description": "Invited 5 friends to play" },
  "embajador": { "name": "Ambassador", "description": "Invited 10 friends to play" },
  "constante": { "name": "Constant", "description": "Scored points on 3 different days" },
  "fiel": { "name": "Faithful", "description": "Scored points on 5 different days" },
  "incondicional": { "name": "Unconditional", "description": "Scored points on 10 different days" },
  "palo_afuera": { "name": "Off the Post", "description": "Guessed all results of the day except one" },
  "suma_sigue": { "name": "Add and Continue", "description": "Guessed the result in 10 matches" },
  "hormiga": { "name": "Working Ant", "description": "Guessed the result in 20 matches" },
  "calculadora": { "name": "Calculator", "description": "Guessed the result in 30 matches" },
  "primera_sangre": { "name": "First Blood", "description": "Won your first duel against another player" },
  "duelista": { "name": "Duelist", "description": "Won 3 duels" },
  "gladiador": { "name": "Gladiator", "description": "Won 5 duels" },
  "invencible": { "name": "Invincible", "description": "Won 10 duels" },
  "sobre_hora": { "name": "At the Last Minute", "description": "Locked your prediction 10 minutes before closing" },
  "piedra": { "name": "Bad Luck", "description": "Missed a result where the winner was clear (>70%)" },
  "campeon_barrio": { "name": "Neighborhood Champion", "description": "Reached first place in a tournament with 4+ players" },
  "zona_copas": { "name": "Cup Zone", "description": "Placed in the top 30% of players" },
  "en_cima": { "name": "At the Top", "description": "Placed in the top 10% of players" },
  "siempre_arriba": { "name": "Always Up", "description": "Top 30% at the end of the 3 matchdays" },
  "creme_creme": { "name": "Creme de la Creme", "description": "Top 10% at the end of the 3 matchdays" },
  "ojo_clinico": { "name": "Clinical Eye", "description": "Guessed an unclear result (40-60%)" },
  "esta_locura": { "name": "This Madness", "description": "Guessed Argentina's 3 results in Group J" },
  "confiado": { "name": "Confident", "description": "Locked your predictions before June 1st" },
  "mufa": { "name": "Jinx", "description": "Missed all results of an entire group" },
  "rival_beno": { "name": "Beno's Rival", "description": "Joined the Benoliga" },
  "competitivo": { "name": "Competitive is my middle name", "description": "Joined a Tournament or League" },
  "estrategia": { "name": "Playing bad was part of the strategy", "description": "Scored more points in matchday 3 than 1 or 2" },
  "cazador_utopias": { "name": "Hunter of Impossible Utopias", "description": "Guessed an unlikely winner (<30%)" },
  "hora_juez": { "name": "Time's up ref!", "description": "Scored points for a goal after minute 80" },
  "muchachos": { "name": "Muchaaachos", "description": "Your private tournament reached 10 members" },
  "zzz": { "name": "Zzz", "description": "Guessed a 0-0 result" },
  "hare_10_veces": { "name": "I will do it 10x if necessary", "description": "Finished in second place after the group stage" }
};

const badges_pt = {
  "visionario": { "name": "Visionário", "description": "Acertou as posições finais exatas de 1 grupo" },
  "oraculo": { "name": "Oráculo", "description": "Acertou as posições finais exatas de 3 grupos" },
  "viajero_tiempo": { "name": "Viajante do Tempo", "description": "Acertou as posições finais exatas de 6 grupos" },
  "ojo_halcon": { "name": "Olho de Falcão", "description": "Acertou o resultado exato de 1 partida" },
  "francotirador": { "name": "Atirador de Elite", "description": "Acertou o resultado exato de 5 partidas" },
  "cirujano": { "name": "Cirurgião", "description": "Acertou o resultado exato de 10 partidas" },
  "nostradamus": { "name": "Nostradamus", "description": "Acertou o resultado exato de 20 partidas" },
  "primer_paso": { "name": "Primeiro Passo", "description": "Salvou ou fixou seus palpites pela primeira vez" },
  "dia_perfecto": { "name": "Dia Perfeito", "description": "Acertou todos os resultados de um dia inteiro" },
  "dueno_fecha": { "name": "Dono da Rodada", "description": "Acertou todos os resultados de uma rodada inteira" },
  "en_racha": { "name": "Boa Fase", "description": "Acertou o resultado em 3 partidas consecutivas" },
  "on_fire": { "name": "Pegando Fogo", "description": "Acertou o resultado em 5 partidas consecutivas" },
  "imparable": { "name": "Imparável", "description": "Acertou o resultado em 10 partidas consecutivas" },
  "sociable": { "name": "Sociável", "description": "Convidou 1 amigo para jogar" },
  "influencer": { "name": "Influenciador", "description": "Convidou 5 amigos para jogar" },
  "embajador": { "name": "Embaixador", "description": "Convidou 10 amigos para jogar" },
  "constante": { "name": "Constante", "description": "Somou pontos em 3 dias diferentes" },
  "fiel": { "name": "Fiel", "description": "Somou pontos em 5 dias diferentes" },
  "incondicional": { "name": "Incondicional", "description": "Somou pontos em 10 dias diferentes" },
  "palo_afuera": { "name": "Na Trave", "description": "Acertou todos os resultados do dia, exceto um" },
  "suma_sigue": { "name": "Soma e Segue", "description": "Acertou o resultado em 10 partidas" },
  "hormiga": { "name": "Formiga Trabalhadora", "description": "Acertou o resultado em 20 partidas" },
  "calculadora": { "name": "Calculadora", "description": "Acertou o resultado em 30 partidas" },
  "primera_sangre": { "name": "Primeiro Sangue", "description": "Venceu seu primeiro duelo contra outro jogador" },
  "duelista": { "name": "Duelista", "description": "Venceu 3 duelos" },
  "gladiador": { "name": "Gladiador", "description": "Venceu 5 duelos" },
  "invencible": { "name": "Invencível", "description": "Venceu 10 duelos" },
  "sobre_hora": { "name": "Em Cima da Hora", "description": "Fixou seu palpite 10 minutos antes do encerramento" },
  "piedra": { "name": "Má Sorte", "description": "Errou um resultado onde o vencedor era claro (>70%)" },
  "campeon_barrio": { "name": "Campeão do Bairro", "description": "Alcançou o primeiro lugar de um torneio com 4+ jogadores" },
  "zona_copas": { "name": "Zona de Copas", "description": "Ficou entre os 30% melhores jogadores" },
  "en_cima": { "name": "No Topo", "description": "Ficou entre os 10% melhores jogadores" },
  "siempre_arriba": { "name": "Sempre no Topo", "description": "Top 30% ao final das 3 rodadas" },
  "creme_creme": { "name": "Creme de la Creme", "description": "Top 10% ao final das 3 rodadas" },
  "ojo_clinico": { "name": "Olho Clínico", "description": "Acertou um resultado incerto (40-60%)" },
  "esta_locura": { "name": "Que Loucura", "description": "Acertou os 3 resultados da Argentina no Grupo J" },
  "confiado": { "name": "Confiante", "description": "Fixou seus palpites antes de 1° de Junho" },
  "mufa": { "name": "Zica", "description": "Errou todos os resultados de um grupo inteiro" },
  "rival_beno": { "name": "Rival do Beno", "description": "Entrou na Benoliga" },
  "competitivo": { "name": "Competitivo é meu nome do meio", "description": "Participou de um Torneio ou Liga" },
  "estrategia": { "name": "Jogar mal era parte do plano", "description": "Somou mais pontos na rodada 3 do que na 1 ou 2" },
  "cazador_utopias": { "name": "Caçador de Utopias", "description": "Acertou um vencedor pouco provável (<30%)" },
  "hora_juez": { "name": "Termina juiz!", "description": "Somou pontos com gol após os 80 minutos" },
  "muchachos": { "name": "Muchaachos", "description": "Seu torneio privado chegou a 10 integrantes" },
  "zzz": { "name": "Zzz", "description": "Acertou um resultado 0-0" },
  "hare_10_veces": { "name": "Farei 10x se for preciso", "description": "Terminou em segundo lugar após a fase de grupos" }
};

Object.assign(es.gamification.badges, badges_es);
Object.assign(en.gamification.badges, badges_en);
Object.assign(pt.gamification.badges, badges_pt);

fs.writeFileSync('src/locales/es/translation.json', JSON.stringify(es, null, 2));
fs.writeFileSync('src/locales/en/translation.json', JSON.stringify(en, null, 2));
fs.writeFileSync('src/locales/pt/translation.json', JSON.stringify(pt, null, 2));

console.log("Gamification locales updated.");
