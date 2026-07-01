import { describe, it, expect } from "vitest";
import { isSpecialCorrect, normalizeAnswer, editDistance } from "./specials";

describe("normalizeAnswer", () => {
  it("saca tildes, mayúsculas y puntuación", () => {
    expect(normalizeAnswer("Lionel Messi")).toBe("lionel messi");
    expect(normalizeAnswer("PERÚ")).toBe("peru");
    expect(normalizeAnswer("  Áustria, ")).toBe("austria");
    expect(normalizeAnswer("N'Golo  Kanté")).toBe("n golo kante");
  });
});

describe("editDistance", () => {
  it("cuenta inserciones/borrados/sustituciones", () => {
    expect(editDistance("messi", "messi")).toBe(0);
    expect(editDistance("mesi", "messi")).toBe(1);
    expect(editDistance("brasil", "brazil")).toBe(1);
  });
});

describe("isSpecialCorrect", () => {
  it("acierta con respuesta única (retrocompatible)", () => {
    expect(isSpecialCorrect("Messi", "Messi")).toBe(true);
    expect(isSpecialCorrect("messi", "  Messi ")).toBe(true);
    expect(isSpecialCorrect("Mbappé", "Messi")).toBe(false);
  });

  it("ignora mayúsculas y tildes", () => {
    expect(isSpecialCorrect("peru", "Perú")).toBe(true);
    expect(isSpecialCorrect("BRASIL", "brasil")).toBe(true);
    expect(isSpecialCorrect("Kanté", "Kante")).toBe(true);
  });

  it("tolera errores tipográficos leves", () => {
    expect(isSpecialCorrect("Leonel Mesi", "Lionel Messi")).toBe(true);
    expect(isSpecialCorrect("brazil", "Brasil")).toBe(true);
    expect(isSpecialCorrect("Cristiano Ronaldo", "Cristiano Ronaldó")).toBe(true);
  });

  it("no matchea nombres cortos distintos (sin falsos positivos)", () => {
    expect(isSpecialCorrect("Cuba", "Perú")).toBe(false);
    expect(isSpecialCorrect("Haaland", "Messi, Mbappé")).toBe(false);
  });

  it("acierta si coincide con CUALQUIERA de varias respuestas separadas por coma", () => {
    expect(isSpecialCorrect("Mbappe", "Messi, Mbappé")).toBe(true);
    expect(isSpecialCorrect("messi", "Messi, Mbappé")).toBe(true);
  });

  it("es falso si la predicción o la respuesta correcta están vacías", () => {
    expect(isSpecialCorrect("", "Messi")).toBe(false);
    expect(isSpecialCorrect("Messi", "")).toBe(false);
    expect(isSpecialCorrect("Messi", " , ")).toBe(false);
  });
});
