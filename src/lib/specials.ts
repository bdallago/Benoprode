// Matching de respuestas de preguntas especiales, tolerante a diferencias de forma.
// Normaliza mayusculas/minusculas, tildes/diacriticos, puntuacion y espacios; y ademas
// tolera errores tipograficos leves por distancia de edicion (Levenshtein), proporcional
// al largo (~1 error cada 5 caracteres). Ej: "leonel mesi" acierta "Lionel Messi".
// La respuesta oficial puede traer varias opciones separadas por coma.

const DIACRITICS = /[̀-ͯ]/g;

export function normalizeAnswer(s: string): string {
  return s
    .normalize("NFD")
    .replace(DIACRITICS, "") // saca tildes/dieresis
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // puntuacion -> espacio
    .replace(/\s+/g, " ")
    .trim();
}

// Distancia de edicion (Levenshtein) entre dos strings.
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

export function isSpecialCorrect(predicted: unknown, actual: unknown): boolean {
  if (typeof predicted !== "string" || typeof actual !== "string") return false;
  const pred = normalizeAnswer(predicted);
  if (!pred) return false;
  const answers = actual.split(",").map(normalizeAnswer).filter((a) => a.length > 0);
  return answers.some((ans) => {
    if (ans === pred) return true;
    // Tolerancia proporcional al largo: ~1 error cada 5 caracteres. Palabras cortas
    // (< 5 chars) exigen coincidencia exacta para evitar falsos positivos.
    const tolerance = Math.floor(Math.max(ans.length, pred.length) / 5);
    if (tolerance === 0) return false;
    return editDistance(pred, ans) <= tolerance;
  });
}
