import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { db } from "../../firebase";
import { GROUPS } from "../../data";
import { getTeamFlagUrl } from "../../lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

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

export function KnockoutStage() {
  const { t } = useTranslation();
  const [seedR32, setSeedR32] = useState<Record<string, [string, string]>>({});
  const [kickoffs, setKickoffs] = useState<Record<string, number>>({});
  const [finishedGroups, setFinishedGroups] = useState<string[]>([]);

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
        setKickoffs(r.bracketKickoffs || {});
        setFinishedGroups(r.finishedGroups || []);
      })
      .catch(() => { /* read-only: si falla, se muestra el calendario hardcodeado */ });
  }, []);

  const tbdLabel = t("predictions.tbdTeam");
  const groupStageFinished = finishedGroups.length === Object.keys(GROUPS).length;

  // Merge real API data (seedR32 + kickoffs) sobre el calendario hardcodeado.
  // Match por kickoff primero, luego por nombre de equipo conocido.
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

      {groupStageFinished && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center pt-2">
          {t("predictions.knockoutDesc")}
        </p>
      )}
    </div>
  );
}
