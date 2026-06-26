"use client";

import { useTranslation } from "react-i18next";
import { getTeamFlagUrl } from "../../lib/utils";
import type { SlotView } from "../../lib/bracket/displayBracket";

function Flag({ team }: { team: string | null }) {
  return (
    <div className="shrink-0 w-7 h-5 rounded overflow-hidden flex items-center justify-center border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
      {team ? (
        <img src={getTeamFlagUrl(team)} alt={team} className="w-full h-full object-cover" />
      ) : (
        <span className="text-xs">🏳️</span>
      )}
    </div>
  );
}

export function KnockoutMatchCard({
  slot,
  locked,
  onPick,
}: {
  slot: SlotView;
  locked: boolean;
  onPick: (slotId: string, team: string) => void;
}) {
  const { t } = useTranslation();
  const teamsKnown = !!slot.teamA && !!slot.teamB;

  const rowClass = (team: string | null) => {
    const base =
      "flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-b-0 font-semibold text-sm transition-colors";
    const isPick = team && slot.pick === team;
    if (slot.resolved && isPick) {
      return `${base} m-1 rounded-md border-2 ${slot.status === "correct" ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-red-500 bg-red-50 dark:bg-red-900/20"}`;
    }
    if (isPick) return `${base} bg-blue-50 dark:bg-blue-900/30`;
    return base;
  };

  const Row = ({ team }: { team: string | null }) => (
    <button
      type="button"
      disabled={!teamsKnown || locked || !team}
      onClick={() => team && onPick(slot.id, team)}
      className={`${rowClass(team)} w-full text-left disabled:cursor-default ${!locked && teamsKnown ? "hover:bg-gray-50 dark:hover:bg-gray-700/50" : ""}`}
    >
      <Flag team={team} />
      <span translate="no" className="truncate text-gray-900 dark:text-gray-100">
        {team ?? t("predictions.tbdTeam")}
      </span>
      {team && slot.pick === team && !slot.resolved && (
        <span className="ml-auto text-[10px] font-bold text-blue-600 dark:text-blue-400">✓</span>
      )}
      {team && slot.resolved && slot.pick === team && (
        <span className={`ml-auto text-[10px] font-bold ${slot.status === "correct" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
          {slot.status === "correct" ? t("predictions.koCorrect") : t("predictions.koWrong")}
        </span>
      )}
    </button>
  );

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
      <Row team={slot.teamA} />
      <Row team={slot.teamB} />
      {locked && (
        <div className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 px-3 py-1 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700">
          {t("predictions.koLockedSlot")}
        </div>
      )}
    </div>
  );
}
