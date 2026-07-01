// Una predicción de pregunta especial acierta si coincide (trim + minúsculas) con
// alguna de las respuestas correctas. La respuesta oficial puede tener varias
// separadas por coma (ej. "Messi, Mbappé") para preguntas con más de una respuesta.
export function isSpecialCorrect(predicted: unknown, actual: unknown): boolean {
  if (typeof predicted !== "string" || typeof actual !== "string") return false;
  const pred = predicted.trim().toLowerCase();
  if (!pred) return false;
  const answers = actual
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter((a) => a.length > 0);
  return answers.includes(pred);
}
