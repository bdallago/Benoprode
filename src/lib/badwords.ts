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

export const checkBadWords = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return BAD_WORDS.some(word => {
    // Check if the word is present as a standalone word (to avoid false positives like "put" in "computer" - though "puta" in "computadora" could trigger if we just use includes, so we use word boundaries)
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(lowerText);
  });
}

export const filterBadWords = (text: string): string => {
  let filteredText = text;
  BAD_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'ig');
    filteredText = filteredText.replace(regex, '***');
  });
  return filteredText;
}
