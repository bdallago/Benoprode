export const BAD_WORDS = [
  // LATAM
  "boludo", "pelotudo", "puto", "mierda", "concha", "choto", "verga", "pija", "culiado", "forro", 
  "mogolico", "gil", "conchudo", "pendejo", "cabron", "pinche", "guey", "marico", "mamahuevo", 
  "wea", "aweonao", "ctm", "hdp", "hijueputa", "gonorrea", "malparido", "puta",
  
  // Spain
  "gilipollas", "joder", "hostia", "maricon", "sudaca", "coño", "cabrón", "putón", "zorra",
  
  // US / English
  "fuck", "shit", "bitch", "asshole", "nigger", "nigga", "cunt", "faggot", "motherfucker", 
  "dick", "slut", "whore",
  
  // Portguese / Brazil
  "porra", "caralho", "fdp", "buceta", "viado", "merda", "cu"
];

// Precompiled at module load — avoids creating N RegExp objects per check call
const _checkRegex  = new RegExp(BAD_WORDS.map(w => `\\b${w}\\b`).join('|'), 'i');
const _filterRegex = new RegExp(BAD_WORDS.map(w => `\\b${w}\\b`).join('|'), 'ig');

export const checkBadWords = (text: string): boolean => _checkRegex.test(text);

export const filterBadWords = (text: string): string => text.replace(_filterRegex, '***');
