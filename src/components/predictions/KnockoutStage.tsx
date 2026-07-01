"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { db } from "../../firebase";
import { GROUPS } from "../../data";
import { getTeamFlagUrl } from "../../lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { BRACKET_TREE } from "../../lib/bracket/tree";
import { buildDisplayBracket, SlotView } from "../../lib/bracket/displayBracket";
import { isSlotLocked } from "../../lib/bracket/lock";
import type { Round } from "../../lib/bracket/types";
import { KnockoutMatchCard } from "../knockout/KnockoutMatchCard";

const ROUND_ORDER: Round[] = ["R32", "R16", "QF", "SF", "F"];
const ROUND_LABEL_KEY: Record<Round, string> = {
  R32: "predictions.stageRoundOf32",
  R16: "predictions.stageRoundOf16",
  QF: "predictions.stageQuarterFinals",
  SF: "predictions.stageSemiFinals",
  F: "predictions.stageFinal",
};

const DAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// Formatea el kickoff (ms UTC) a hora de Argentina (UTC-3).
function formatKickoff(ms: number): string {
  const art = new Date(ms - 3 * 60 * 60 * 1000);
  const day = DAYS_ES[art.getUTCDay()];
  const date = `${art.getUTCDate()}/${art.getUTCMonth() + 1}`;
  const hh = String(art.getUTCHours()).padStart(2, "0");
  const mm = String(art.getUTCMinutes()).padStart(2, "0");
  return `${day} ${date} · ${hh}:${mm}`;
}

// Calendario completo R32 del Mundial 2026 (fechas en UTC, equipos conocidos al 26/6,
// copiados del cuadro de Google). Cuando los grupos cierren y la API publique los
// fixtures reales, seedR32/kickoffs (de results/actual.bracketMatchups) los pisan.
const R32_SCHEDULE: { kickoffMs: number; teamA: string | null; teamB: string | null }[] = [
  { kickoffMs: Date.UTC(2026, 5, 28, 19,  0), teamA: "Sudáfrica",       teamB: "Canadá"               },
  { kickoffMs: Date.UTC(2026, 5, 29, 17,  0), teamA: "Brasil",          teamB: "Japón"                },
  { kickoffMs: Date.UTC(2026, 5, 29, 20, 30), teamA: "Alemania",        teamB: null                   },
  { kickoffMs: Date.UTC(2026, 5, 30,  1,  0), teamA: "Países Bajos",    teamB: "Marruecos"            },
  { kickoffMs: Date.UTC(2026, 5, 30, 17,  0), teamA: "Costa de Marfil", teamB: null                   },
  { kickoffMs: Date.UTC(2026, 5, 30, 21,  0), teamA: null,              teamB: null                   },
  { kickoffMs: Date.UTC(2026, 6,  1,  1,  0), teamA: "México",          teamB: null                   },
  { kickoffMs: Date.UTC(2026, 6,  1, 16,  0), teamA: null,              teamB: null                   },
  { kickoffMs: Date.UTC(2026, 6,  1, 20,  0), teamA: null,              teamB: null                   },
  { kickoffMs: Date.UTC(2026, 6,  2,  0,  0), teamA: "Estados Unidos",  teamB: "Bosnia y Herzegovina" },
  { kickoffMs: Date.UTC(2026, 6,  2, 19,  0), teamA: null,              teamB: null                   },
  { kickoffMs: Date.UTC(2026, 6,  2, 23,  0), teamA: null,              teamB: null                   },
  { kickoffMs: Date.UTC(2026, 6,  3,  3,  0), teamA: "Suiza",           teamB: null                   },
  { kickoffMs: Date.UTC(2026, 6,  3, 18,  0), teamA: "Australia",       teamB: null                   },
  { kickoffMs: Date.UTC(2026, 6,  3, 22,  0), teamA: "Argentina",       teamB: null                   },
  { kickoffMs: Date.UTC(2026, 6,  4,  1, 30), teamA: null,              teamB: null                   },
];

function TeamRow({ name, tbdLabel }: { name: string | null; tbdLabel: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 ${name ? "font-medium text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-500 italic"}`}>
      {name ? (
        <>
          <img src={getTeamFlagUrl(name)} alt={name} className="w-6 h-4 object-cover rounded-sm flex-shrink-0" />
          <span>{name}</span>
        </>
      ) : (
        <>
          <span className="w-6 h-4 flex-shrink-0" />
          <span>{tbdLabel}</span>
        </>
      )}
    </div>
  );
}

export function KnockoutStage({
  userPicks = {},
  onPick,
}: {
  userPicks?: Record<string, string>;
  onPick?: (slotId: string, team: string) => void;
}) {
  const { t } = useTranslation();
  const [seedR32, setSeedR32] = useState<Record<string, [string, string]>>({});
  const [winners, setWinners] = useState<Record<string, string>>({});
  const [kickoffs, setKickoffs] = useState<Record<string, number>>({});
  const [finishedGroups, setFinishedGroups] = useState<string[]>([]);
  const [round, setRound] = useState<Round>("R32");
  const [showTree, setShowTree] = useState(false);
  const now = Date.now();

  useEffect(() => {
    getDoc(doc(db, "results", "actual"))
      .then((snap) => {
        if (!snap.exists()) return;
        const r = snap.data() as any;
        const allMatchups: Record<string, [string, string]> = r.bracketMatchups || {};
        const r32: Record<string, [string, string]> = {};
        for (const [slotId, pair] of Object.entries(allMatchups)) {
          if (slotId.startsWith("R32-")) r32[slotId] = pair as [string, string];
        }
        setSeedR32(r32);
        setWinners(r.knockouts || {});
        setKickoffs(r.bracketKickoffs || {});
        setFinishedGroups(r.finishedGroups || []);
      })
      .catch(() => { /* read-only: si falla, se muestra el calendario hardcodeado */ });
  }, []);

  const tbdLabel = t("predictions.tbdTeam");
  const groupStageFinished = finishedGroups.length === Object.keys(GROUPS).length;

  const view = useMemo(
    () => buildDisplayBracket(seedR32, userPicks, winners),
    [seedR32, userPicks, winners]
  );
  const slotsOfRound = (r: Round): SlotView[] =>
    BRACKET_TREE.filter((s) => s.round === r).map((s) => view[s.id]);

  // Cards de una ronda ordenadas cronológicamente por kickoff (los sin horario van al
  // final). El cuadro completo (árbol) mantiene el orden posicional.
  const slotsByKickoff = (r: Round): SlotView[] =>
    slotsOfRound(r).slice().sort(
      (a, b) => (kickoffs[a.id] ?? Infinity) - (kickoffs[b.id] ?? Infinity));

  const header = (
    <div className="flex items-center gap-2 border-b dark:border-gray-700 pb-2">
      <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-400">
        {t("predictions.knockoutStage")}
      </h2>
      <Tooltip>
        <TooltipTrigger>
          <Info className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors" />
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{t("predictions.knockoutTooltip")}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );

  // ── Fase de grupos NO terminada: vista provisional read-only ──
  if (!groupStageFinished) {
    const apiFixtures = Object.entries(seedR32).map(([slotId, [a, b]]) => ({
      teamA: a, teamB: b, kickoffMs: kickoffs[slotId] ?? null,
    }));
    const merged = R32_SCHEDULE.map((slot) => {
      const byKickoff = apiFixtures.find((f) => f.kickoffMs === slot.kickoffMs);
      if (byKickoff) return { ...slot, teamA: byKickoff.teamA, teamB: byKickoff.teamB };
      const knownTeam = slot.teamA ?? slot.teamB;
      if (knownTeam) {
        const byTeam = apiFixtures.find((f) => f.teamA === knownTeam || f.teamB === knownTeam);
        if (byTeam) return { ...slot, teamA: byTeam.teamA, teamB: byTeam.teamB };
      }
      return slot;
    });

    return (
      <div className="space-y-4 pt-2 pb-12">
        {header}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 rounded-xl p-4 text-sm font-medium">
          {t("predictions.knockoutProvisionalBanner")}
        </div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {t("predictions.provisionalR32Title")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {merged.map(({ kickoffMs, teamA, teamB }, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden text-sm shadow-sm">
              <div className="px-3 pt-2 pb-1 text-[11px] text-gray-400 dark:text-gray-500 font-medium border-b border-gray-50 dark:border-gray-700/50">
                {formatKickoff(kickoffMs)}
              </div>
              <div className="border-b border-gray-100 dark:border-gray-700"><TeamRow name={teamA} tbdLabel={tbdLabel} /></div>
              <TeamRow name={teamB} tbdLabel={tbdLabel} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Fase de grupos terminada: árbol completo (read-only) ──
  if (showTree) {
    return (
      <div className="space-y-3 pt-2 pb-12">
        {header}
        <button onClick={() => setShowTree(false)} className="text-sm font-semibold text-blue-900 dark:text-blue-400">
          ← {t("predictions.koBackToRounds")}
        </button>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-[760px]">
            {ROUND_ORDER.map((r) => (
              <div key={r} className="flex flex-col justify-around gap-2 flex-1">
                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 text-center">{t(ROUND_LABEL_KEY[r])}</h4>
                {slotsOfRound(r).map((s) => (
                  <div key={s.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-[11px]">
                    {[s.teamA, s.teamB].map((tm, i) => (
                      <div
                        key={i}
                        className={`px-2 py-1 ${i === 0 ? "border-b border-gray-100 dark:border-gray-700" : ""} ${
                          s.resolved && s.pick === tm
                            ? s.status === "correct"
                              ? "text-green-700 dark:text-green-400 font-bold"
                              : "text-red-600 dark:text-red-400 line-through"
                            : "text-gray-900 dark:text-gray-100"
                        }`}
                      >
                        {tm ?? tbdLabel}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Fase de grupos terminada: bracket interactivo por ronda ──
  return (
    <div className="space-y-4 pt-2 pb-12">
      {header}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 overflow-x-auto">
          {ROUND_ORDER.map((r) => (
            <button
              key={r}
              onClick={() => setRound(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${round === r ? "bg-blue-900 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"}`}
            >
              {t(ROUND_LABEL_KEY[r])}
            </button>
          ))}
        </div>
        <button onClick={() => setShowTree(true)} className="text-xs font-semibold whitespace-nowrap text-blue-900 dark:text-blue-400">
          {t("predictions.koFullBracket")}
        </button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{t("predictions.koTapToPick")}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {slotsByKickoff(round).map((s) => (
          <KnockoutMatchCard
            key={s.id}
            slot={s}
            // TEMPORAL: octavos+ bloqueados hasta corregir el orden del cuadro KO.
            locked={s.round !== "R32" || isSlotLocked(kickoffs[s.id], now)}
            kickoffLabel={kickoffs[s.id] ? formatKickoff(kickoffs[s.id]) : undefined}
            onPick={onPick ?? (() => {})}
          />
        ))}
      </div>
    </div>
  );
}
