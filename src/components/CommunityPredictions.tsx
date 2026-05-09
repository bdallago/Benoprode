'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Users } from 'lucide-react';
import Link from 'next/link';
import matchesData from '../lib/matches.json';

interface MatchStat {
  A: number;
  B: number;
  DRAW: number;
  total: number;
}

function buildFact(match: typeof matchesData[0], stats: MatchStat | undefined): string {
  if (!stats || stats.total === 0) {
    return `La comunidad está súper dividida con ${match.teamA} vs ${match.teamB}. ¡Hacé tu predicción y marcá la diferencia!`;
  }
  const { total, A, DRAW, B } = stats;
  const pctA = Math.round((A / total) * 100);
  const pctDRAW = Math.round((DRAW / total) * 100);
  const pctB = Math.round((B / total) * 100);
  if (pctA >= 50) return `El ${pctA}% de la comunidad confía en que gana ${match.teamA} contra ${match.teamB}. ¿Vas a ir en contra?`;
  if (pctB >= 50) return `El ${pctB}% de la comunidad confía en la victoria de ${match.teamB} frente a ${match.teamA}. ¿Te sumás a la minoría?`;
  if (pctDRAW >= 50) return `Fuerte tendencia al empate: el ${pctDRAW}% votó que termina igualado entre ${match.teamA} y ${match.teamB}.`;
  return `Nadie está seguro: ${pctA}% ${match.teamA}, ${pctB}% ${match.teamB}. ¡Tu voto desempata!`;
}

export function CommunityPredictions() {
  const [matchStats, setMatchStats] = useState<Record<string, MatchStat>>({});
  const [currentFact, setCurrentFact] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'statistics', 'matches'), (snap) => {
      if (snap.exists()) setMatchStats(snap.data() as Record<string, MatchStat>);
    });
    return () => unsub();
  }, []);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return matchesData.filter(m => new Date(m.date).getTime() > now).slice(0, 4);
  }, []);

  const facts = useMemo(() => upcoming.map(m => buildFact(m, matchStats[m.id])), [upcoming, matchStats]);

  useEffect(() => { setCurrentFact(0); }, [facts.length]);

  useEffect(() => {
    if (!facts.length) return;
    const id = setInterval(() => setCurrentFact(prev => (prev + 1) % facts.length), 10000);
    return () => clearInterval(id);
  }, [facts.length]);

  if (upcoming.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-700">
        <Users className="w-4 h-4 text-purple-500 shrink-0" />
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">¿Qué dice la comunidad?</h3>
      </div>

      {/* Bar charts */}
      <div className="px-4 py-3 space-y-3.5">
        {upcoming.map(match => {
          const stats = matchStats[match.id];
          const total = stats?.total ?? 0;
          const aPct = total > 0 ? Math.round(((stats?.A ?? 0) / total) * 100) : 33;
          const drawPct = total > 0 ? Math.round(((stats?.DRAW ?? 0) / total) * 100) : 34;
          const bPct = total > 0 ? 100 - aPct - drawPct : 33;

          return (
            <div key={match.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs leading-tight">
                <span className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-[40%]">{match.teamA}</span>
                <span className="text-gray-400 dark:text-gray-500 text-[10px] shrink-0 px-1">
                  {total > 0 ? `${total} votos` : '—'}
                </span>
                <span className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-[40%] text-right">{match.teamB}</span>
              </div>
              <div className="flex h-5 rounded-full overflow-hidden text-[10px] font-bold text-white gap-px">
                <div
                  className="bg-blue-500 flex items-center justify-center transition-all duration-500 shrink-0"
                  style={{ width: `${aPct}%` }}
                >
                  {aPct > 14 && `${aPct}%`}
                </div>
                <div
                  className="bg-gray-400 dark:bg-gray-500 flex items-center justify-center transition-all duration-500 shrink-0"
                  style={{ width: `${drawPct}%` }}
                >
                  {drawPct > 14 && `${drawPct}%`}
                </div>
                <div
                  className="bg-red-400 flex items-center justify-center transition-all duration-500 shrink-0"
                  style={{ width: `${bPct}%` }}
                >
                  {bPct > 14 && `${bPct}%`}
                </div>
              </div>
              <div className="flex justify-between text-[9px] text-gray-400 dark:text-gray-500">
                <span>Local {aPct}%</span>
                <span>Empate {drawPct}%</span>
                <span>{bPct}% Visita</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rotating fact — grows to fill remaining height on desktop */}
      {facts.length > 0 && (
        <div className="border-t border-orange-100 dark:border-orange-900/40 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-b-xl px-4 py-3 flex-1 flex flex-col justify-center">
          <p
            key={currentFact}
            className="text-xs font-semibold text-orange-800 dark:text-orange-200 leading-snug mb-2"
            style={{ animation: 'fadeInUp 0.4s ease' }}
          >
            {facts[currentFact]}
          </p>
          <Link
            href="/predictions?tab=matches"
            className="inline-block text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 underline underline-offset-2"
          >
            Ir a predicciones →
          </Link>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
