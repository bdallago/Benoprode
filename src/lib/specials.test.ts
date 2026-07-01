import { describe, it, expect } from "vitest";
import { isSpecialCorrect } from "./specials";

describe("isSpecialCorrect", () => {
  it("acierta con respuesta única (retrocompatible)", () => {
    expect(isSpecialCorrect("Messi", "Messi")).toBe(true);
    expect(isSpecialCorrect("messi", "  Messi ")).toBe(true);
    expect(isSpecialCorrect("Mbappé", "Messi")).toBe(false);
  });

  it("acierta si coincide con CUALQUIERA de varias respuestas separadas por coma", () => {
    expect(isSpecialCorrect("Mbappé", "Messi, Mbappé")).toBe(true);
    expect(isSpecialCorrect("messi", "Messi, Mbappé")).toBe(true);
    expect(isSpecialCorrect("Haaland", "Messi, Mbappé")).toBe(false);
  });

  it("es falso si la predicción o la respuesta correcta están vacías", () => {
    expect(isSpecialCorrect("", "Messi")).toBe(false);
    expect(isSpecialCorrect("Messi", "")).toBe(false);
    expect(isSpecialCorrect("Messi", " , ")).toBe(false);
  });
});
