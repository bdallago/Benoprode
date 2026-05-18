import { useEffect, useState, useRef, useMemo } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Lock, CalendarDays, ChevronDown, ChevronUp, Minus, Plus, Trophy, Search, CheckCircle2, X } from "lucide-react";
import { TeamFlag } from "../Fixture";
import matchesData from "../../lib/matches.json";
import { db } from "../../firebase";
import { MatchComments } from "./MatchComments";
import { onSnapshot, doc, DocumentReference, DocumentSnapshot } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { MATCH_LOCK_BUFFER_MS } from "../../lib/config";

function subscribeWithRetry(
  ref: DocumentReference,
  onData: (snap: DocumentSnapshot) => void,
  onFallback?: () => void,
  maxRetries = 5,
): () => void {
  let unsub = () => {};
  let retries = 0;
  let cancelled = false;

  const attach = () => {
    unsub = onSnapshot(ref, (snap) => { retries = 0; onData(snap); }, (err) => {
      if (cancelled) return;
      console.warn('[snapshot] error, retry', retries + 1, err?.message);
      onFallback?.();
      if (retries < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retries), 30000);
        retries++;
        setTimeout(attach, delay);
      }
    });
  };

  attach();
  return () => { cancelled = true; unsub(); };
}

interface MatchesStageProps {
  matchPredictions: Record<string, { teamA: number | '', teamB: number | '', outcome: 'A' | 'B' | 'DRAW' | '' }>;
  effectiveIsLocked: boolean;
  saving: boolean;
  handleMatchChange: (matchId: string, field: 'teamA' | 'teamB' | 'outcome', value: any) => void;
  savePredictions: (lock: boolean) => void;
}

// Feature 3: Skeleton bar shown while community stats load
function SkeletonBar() {
  return <div className="h-2 w-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse mx-auto mt-1.5" />;
}

export function MatchesStage({ matchPredictions, effectiveIsLocked, saving, handleMatchChange, savePredictions }: MatchesStageProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'es-AR';

  const [matchStats, setMatchStats] = useState<Record<string, { A: number, B: number, DRAW: number, total: number }>>({});
  const [commentActivity, setCommentActivity] = useState<Record<string, string>>({});
  const [statsLoaded, setStatsLoaded] = useState(false); // Feature 3
  const [matchResults, setMatchResults] = useState<Record<string, { teamA: number, teamB: number, outcome: string }>>({});  // Feature 5
  const [searchQuery, setSearchQuery] = useState(''); // Feature 4

  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('prode-collapsed-days');
        if (stored) return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Error reading collapsed days from local storage", e);
    }
    const state: Record<string, boolean> = {};
    const today = new Date();
    matchesData.forEach(match => {
      const date = new Date(match.date);
      const dayString = date.toLocaleDateString(currentLang, { weekday: 'long', day: 'numeric', month: 'long' });
      const key = dayString.charAt(0).toUpperCase() + dayString.slice(1);
      if (!(key in state)) {
        state[key] = date.toLocaleDateString(currentLang) !== today.toLocaleDateString(currentLang);
      }
    });
    return state;
  });

  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Stats + skeleton loading — retries on error with exponential backoff
  useEffect(() => {
    return subscribeWithRetry(
      doc(db, "statistics", "matches"),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setMatchStats(data as any);
          setCommentActivity(data._comments || {});
        }
        setStatsLoaded(true);
      },
      () => setStatsLoaded(true),
    );
  }, []);

  // Real match results listener — retries on error
  useEffect(() => {
    return subscribeWithRetry(
      doc(db, "results", "actual"),
      (snapshot) => {
        if (snapshot.exists()) {
          setMatchResults(snapshot.data().matches || {});
        }
      },
    );
  }, []);

  const today = new Date();
  const todayCapitalized = (() => {
    const s = today.toLocaleDateString(currentLang, { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();

  useEffect(() => {
    if (Object.keys(collapsedDays).length > 0) {
      localStorage.setItem('prode-collapsed-days', JSON.stringify(collapsedDays));
    }
  }, [collapsedDays]);

  useEffect(() => {
    setTimeout(() => {
      dayRefs.current[todayCapitalized]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 500);
  }, [todayCapitalized]);

  // Feature 4 + 7: Filtered & memoized day groups
  const groupedDays = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = q
      ? matchesData.filter(m =>
          m.teamA.toLowerCase().includes(q) || m.teamB.toLowerCase().includes(q))
      : matchesData;

    return Object.entries(
      filtered.reduce((acc, match) => {
        const date = new Date(match.date);
        const s = date.toLocaleDateString(currentLang, { weekday: 'long', day: 'numeric', month: 'long' });
        const key = s.charAt(0).toUpperCase() + s.slice(1);
        if (!acc[key]) acc[key] = [];
        acc[key].push(match);
        return acc;
      }, {} as Record<string, typeof matchesData>)
    );
  }, [searchQuery, currentLang]);

  return (
    <div className="space-y-6 pt-2">
      {/* Header row */}
      <div className="flex items-center justify-between border-b dark:border-gray-700 pb-2">
        <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-400 transition-colors duration-200">
          {t('predictions.sign2Title', 'Partidos Individuales')}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => dayRefs.current[todayCapitalized]?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
          className="text-xs flex items-center gap-2 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
          title={t('predictions.goToToday', 'Ir a Partidos de Hoy')}
        >
          <CalendarDays className="w-4 h-4" />
          <span className="hidden sm:inline">{t('predictions.today', 'Hoy')}</span>
        </Button>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-200 mb-6 text-justify transition-colors duration-200">
        {t('predictions.matchesStageDesc')}
      </p>

      {/* Points system card */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-100 dark:border-green-900/40 p-4 rounded-xl mb-6 shadow-sm">
        <h4 className="font-bold text-sm text-green-800 dark:text-green-400 mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4" /> {t('predictions.pointsSystem')}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white/80 dark:bg-gray-900/80 border border-green-100 dark:border-green-900/40 p-3 rounded-lg flex items-start gap-3 shadow-sm transition-colors hover:bg-white dark:hover:bg-gray-900">
            <div className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 font-black px-2.5 py-1 rounded-md text-xs mt-0.5 whitespace-nowrap shadow-sm">+1 {t('predictions.point')}</div>
            <div className="text-sm">
              <span className="font-bold text-gray-800 dark:text-gray-200 block mb-0.5">{t('predictions.result')}</span>
              <p className="text-gray-600 dark:text-gray-400 text-xs leading-snug">{t('predictions.resultDesc')}</p>
            </div>
          </div>
          <div className="bg-white/80 dark:bg-gray-900/80 border border-green-100 dark:border-green-900/40 p-3 rounded-lg flex items-start gap-3 shadow-sm transition-colors hover:bg-white dark:hover:bg-gray-900 relative overflow-hidden">
            <div className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 font-black px-2.5 py-1 rounded-md text-xs mt-0.5 whitespace-nowrap shadow-sm">+1 {t('predictions.point')}</div>
            <div className="text-sm relative z-10">
              <span className="font-bold text-gray-800 dark:text-gray-200 block mb-0.5">{t('predictions.exactResultTitle')}</span>
              <p className="text-gray-600 dark:text-gray-400 text-xs leading-snug">{t('predictions.exactResultDesc')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Feature 4: Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar equipo..."
          className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {searchQuery && groupedDays.length === 0 && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
          No se encontraron partidos con &ldquo;{searchQuery}&rdquo;
        </p>
      )}

      {/* Days list */}
      <div className="space-y-8">
        {groupedDays.map(([day, dayMatches]) => {
          // While searching, show all matching days expanded
          const isCollapsed = searchQuery ? false : (collapsedDays[day] ?? true);

          return (
            <div key={day} className="space-y-3" ref={el => { dayRefs.current[day] = el; }}>

              {/* Sticky day header */}
              <div
                className={`sticky top-16 z-10 flex items-center justify-between cursor-pointer select-none group transition-colors duration-200 rounded-r-lg pl-4 pr-3 py-2.5 border-l-4 backdrop-blur-sm ${
                  day === todayCapitalized
                    ? 'border-l-blue-500 bg-blue-50/95 dark:bg-gray-900/95'
                    : 'border-l-gray-300 dark:border-l-gray-600 bg-white/95 dark:bg-gray-900/95'
                }`}
                onClick={() => !searchQuery && setCollapsedDays(prev => ({ ...prev, [day]: !prev[day] }))}
              >
                <div className="flex items-center gap-2.5">
                  <h3 className={`text-lg font-bold leading-none ${day === todayCapitalized ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`}>
                    {day}
                  </h3>
                  {day === todayCapitalized && (
                    <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full font-semibold leading-none">
                      {t('predictions.today', 'Hoy')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium">
                    {dayMatches.length} {dayMatches.length === 1 ? 'partido' : 'partidos'}
                  </span>
                  {!searchQuery && (
                    <div className={`p-1 rounded-md transition-colors ${day === todayCapitalized ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'} group-hover:opacity-70`}>
                      {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </div>
                  )}
                </div>
              </div>

              {/* Feature 1: Animated collapse via CSS grid-rows */}
              <div className={`grid transition-all duration-300 ease-in-out ${isCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
                <div className="overflow-hidden min-h-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                    {dayMatches.map((match) => {
                      const matchDate = new Date(match.date);
                      const isMatchLocked = Date.now() >= matchDate.getTime() - MATCH_LOCK_BUFFER_MS;
                      const locked = isMatchLocked;
                      const pred = matchPredictions[match.id] || { teamA: '', teamB: '', outcome: '' };
                      const hasPrediction = typeof pred.teamA === 'number' && typeof pred.teamB === 'number';
                      const stats = matchStats[match.id];

                      // Feature 5: Real result
                      const result = matchResults[match.id];
                      const gotExact = result != null && hasPrediction &&
                        result.teamA === pred.teamA && result.teamB === pred.teamB;
                      const gotOutcome = result != null && pred.outcome !== '' &&
                        result.outcome === pred.outcome;

                      // Feature 2: Card accent color logic
                      const ringClass = hasPrediction
                        ? 'ring-green-300 dark:ring-green-800/60'
                        : locked
                        ? 'ring-gray-200 dark:ring-gray-700'
                        : 'ring-blue-200 dark:ring-blue-900/50';

                      const stripeClass = gotExact
                        ? 'bg-gradient-to-r from-yellow-400 to-amber-400'
                        : hasPrediction
                        ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                        : locked
                        ? 'bg-gray-200 dark:bg-gray-700'
                        : 'bg-gradient-to-r from-blue-400 to-blue-500';

                      return (
                        // Feature 2: Redesigned card
                        <Card key={match.id} className={`overflow-hidden border-0 shadow-sm ring-1 transition-all ${ringClass} ${locked ? 'opacity-90' : ''}`}>
                          {/* Top color stripe */}
                          <div className={`h-1 w-full ${stripeClass}`} />

                          <CardHeader className="py-2.5 px-4 border-b dark:border-gray-700 flex flex-row justify-between items-center gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 shrink-0">
                                {matchDate.toLocaleString(currentLang, { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {/* Feature 5: Real result badge */}
                              {result && (
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-md shrink-0 ${
                                  gotExact
                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                                }`}>
                                  Real: {result.teamA}-{result.teamB}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Feature 8: Optimistic prediction indicator */}
                              {hasPrediction && (
                                <span className={`text-xs font-bold flex items-center gap-0.5 ${
                                  gotExact ? 'text-yellow-600 dark:text-yellow-400' :
                                  gotOutcome ? 'text-green-600 dark:text-green-400' :
                                  result ? 'text-red-500 dark:text-red-400' :
                                  'text-green-600 dark:text-green-400'
                                }`}>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  {pred.teamA}-{pred.teamB}
                                </span>
                              )}
                              {locked && <Lock className="w-3 h-3 text-gray-400" />}
                            </div>
                          </CardHeader>

                          <CardContent className="p-4 flex flex-col gap-4">
                            {/* Teams with score inputs */}
                            <div className="flex flex-col gap-2.5">
                              {([['teamA', match.teamA], ['teamB', match.teamB]] as const).map(([field, teamName]) => (
                                <div key={field} className="flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/30 px-3 py-2.5 rounded-lg border border-gray-100 dark:border-gray-700/50">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <TeamFlag teamName={teamName} />
                                    <span className="font-semibold text-sm sm:text-base truncate text-gray-900 dark:text-gray-100" title={teamName}>{teamName}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      disabled={locked}
                                      onClick={() => handleMatchChange(match.id, field, Math.max(0, (typeof pred[field] === 'number' ? pred[field] as number : 0) - 1))}
                                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="w-9 text-center font-bold text-xl text-gray-900 dark:text-white tabular-nums">
                                      {typeof pred[field] === 'number' ? pred[field] : '—'}
                                    </div>
                                    <button
                                      type="button"
                                      disabled={locked}
                                      onClick={() => handleMatchChange(match.id, field, Math.min(20, (typeof pred[field] === 'number' ? pred[field] as number : 0) + 1))}
                                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Outcome buttons with community stats */}
                            <div className="flex gap-2">
                              {(['A', 'DRAW', 'B'] as const).map((outcome) => {
                                const label = outcome === 'A'
                                  ? t('predictions.homeWin', 'Local')
                                  : outcome === 'DRAW'
                                  ? t('predictions.tie', 'Empate')
                                  : t('predictions.awayWin', 'Visita');
                                const isSelected = pred.outcome === outcome;
                                const pct = stats && stats.total > 0
                                  ? Math.round((stats[outcome] / stats.total) * 100)
                                  : null;
                                const isResultOutcome = result?.outcome === outcome;

                                return (
                                  <div key={outcome} className="flex-1 flex flex-col items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={locked || (typeof pred.teamA === 'number' && typeof pred.teamB === 'number')}
                                      onClick={() => handleMatchChange(match.id, 'outcome', outcome)}
                                      className={`w-full py-2.5 rounded-xl text-xs font-bold border-2 transition-all active:scale-95 ${
                                        isSelected
                                          ? outcome === 'DRAW'
                                            ? 'bg-gray-700 dark:bg-gray-600 text-white border-gray-800 dark:border-gray-500'
                                            : 'bg-blue-600 text-white border-blue-700'
                                          : isResultOutcome && result
                                          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700'
                                          : 'bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
                                      }`}
                                    >
                                      {label}
                                    </button>
                                    {/* Feature 3: Skeleton while stats load, then progress bar */}
                                    {!statsLoaded ? (
                                      <SkeletonBar />
                                    ) : pct !== null ? (
                                      <div className="w-full flex flex-col items-center gap-0.5">
                                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1">
                                          <div
                                            className={`h-1 rounded-full transition-all duration-500 ${isSelected ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                            style={{ width: `${pct}%` }}
                                          />
                                        </div>
                                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">{pct}%</span>
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>

                            <MatchComments matchId={match.id} lastCommentAt={commentActivity[match.id]} />
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
