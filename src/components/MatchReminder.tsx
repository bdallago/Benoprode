'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Clock, X } from 'lucide-react';
import matchesData from '../lib/matches.json';

export function MatchReminder() {
  const [dismissed, setDismissed] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const dismissKey = `match-reminder-dismissed-${today}`;

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(dismissKey)) {
      setDismissed(true);
    }
  }, [dismissKey]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    const in24h = now + 24 * 60 * 60 * 1000;
    return matchesData.filter(m => {
      const t = new Date(m.date).getTime();
      return t > now && t <= in24h;
    });
  }, []);

  const dismiss = () => {
    localStorage.setItem(dismissKey, '1');
    setDismissed(true);
  };

  if (dismissed || upcoming.length === 0) return null;

  const label = upcoming.length === 1
    ? `${upcoming[0].teamA} vs ${upcoming[0].teamB} cierra en menos de 24h`
    : `${upcoming.length} partidos cierran en menos de 24h`;

  return (
    <div className="bg-orange-50 border border-orange-200 dark:bg-orange-900/20 dark:border-orange-800 rounded-xl p-3 sm:p-4 flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-3 min-w-0">
        <Clock className="w-5 h-5 text-orange-500 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-orange-800 dark:text-orange-300 truncate">{label}</p>
          <p className="text-xs text-orange-600 dark:text-orange-400">Revisá tus pronósticos antes de que se bloqueen</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/predictions?tab=matches"
          className="text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
        >
          Ver partidos
        </Link>
        <button onClick={dismiss} className="text-orange-400 hover:text-orange-600 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
