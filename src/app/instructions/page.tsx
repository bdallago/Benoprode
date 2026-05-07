import { Metadata } from "next";
import Instructions from "../../views/Instructions";

export const metadata: Metadata = {
  title: "Reglas, Puntos y Cómo Jugar | El Prode de Beno",
  description: "Descubrí cómo funciona el sistema de puntos: 3 puntos por resultado exacto, 1 punto por acertar ganador. Reglas oficiales del Prode Beno para el Mundial 2026.",
  keywords: ["reglas prode", "puntos mundial", "como jugar prode", "sistema de puntos futbol", "beno prode"],
};

export default function InstructionsPage() {
  return <Instructions />;
}
