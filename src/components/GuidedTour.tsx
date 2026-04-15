"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { STATUS, Step } from "react-joyride";
import { useTheme } from "./ThemeProvider";

const Joyride = dynamic<any>(
  () => import("react-joyride").then((mod: any) => mod.default || mod.Joyride || mod),
  { ssr: false }
);

export function GuidedTour() {
  const [run, setRun] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    // Check if the user has already seen the tour
    const hasSeenTour = localStorage.getItem("hasSeenTour");
    if (!hasSeenTour) {
      // Set it immediately so it doesn't run again on reload
      localStorage.setItem("hasSeenTour", "true");
      // Small delay to ensure elements are rendered
      setTimeout(() => {
        setRun(true);
      }, 1000);
    }
  }, []);

  const handleJoyrideCallback = (data: any) => {
    const { status, action } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status) || action === 'close') {
      setRun(false);
    }
  };

  const steps: Step[] = [
    {
      target: "#tutorial-welcome",
      content: "¡Bienvenido a El Prode de Beno! Acá vas a poder demostrar cuánto sabés de fútbol.",
      placement: "center",
    },
    {
      target: "#tutorial-instructions",
      content: "Acá podés leer las reglas del juego y cómo funciona el sistema de puntos. ¡Es importante que las leas!",
      placement: "bottom",
    },
    {
      target: "#tutorial-predictions",
      content: "¡El corazón del juego! Acá vas a hacer tus predicciones de grupos, partidos y preguntas especiales.",
      placement: "bottom",
    },
    {
      target: "#tutorial-leagues",
      content: "Creá o unite a ligas privadas para competir directamente con tus amigos.",
      placement: "bottom",
    },
    {
      target: "#tutorial-ranking",
      content: "Mirá tu posición en el ranking general y compará tus puntos con todos los jugadores.",
      placement: "bottom",
    },
    {
      target: "#tutorial-report",
      content: "¿Encontraste un error o tenés una sugerencia? Usá este botón para avisarnos.",
      placement: "top",
    }
  ];

  const isDark = theme === "dark";

  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton
      run={run}
      scrollToFirstStep
      showProgress
      showSkipButton
      steps={steps}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: "#2563eb",
          backgroundColor: isDark ? "#1f2937" : "#ffffff",
          textColor: isDark ? "#f3f4f6" : "#111827",
          arrowColor: isDark ? "#1f2937" : "#ffffff",
        },
        tooltipContainer: {
          textAlign: "left",
        },
        buttonNext: {
          backgroundColor: "#2563eb",
        },
        buttonBack: {
          color: isDark ? "#9ca3af" : "#6b7280",
        },
        buttonSkip: {
          color: isDark ? "#9ca3af" : "#6b7280",
        }
      }}
      locale={{
        back: "Atrás",
        close: "Cerrar",
        last: "Finalizar",
        next: "Siguiente",
        skip: "Omitir",
      }}
    />
  );
}
