import { useEffect, useState, useRef } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Lock, Save, CalendarDays, ChevronDown, ChevronUp, Minus, Plus, Trophy } from "lucide-react";
import { TeamFlag } from "../Fixture";
import matchesData from "../../lib/matches.json";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { MatchComments } from "./MatchComments";
import { onSnapshot, doc } from "firebase/firestore";
import { useTranslation } from "react-i18next";

interface MatchesStageProps {
  matchPredictions: Record<string, { teamA: number | '', teamB: number | '', outcome: 'A' | 'B' | 'DRAW' | '' }>;
  effectiveIsLocked: boolean;
  saving: boolean;
  handleMatchChange: (matchId: string, field: 'teamA' | 'teamB' | 'outcome', value: any) => void;
  savePredictions: (lock: boolean) => void;
}

export function MatchesStage({ matchPredictions, effectiveIsLocked, saving, handleMatchChange, savePredictions }: MatchesStageProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'es-AR';
  
  const [matchStats, setMatchStats] = useState<Record<string, { A: number, B: number, DRAW: number, total: number }>>({});
  const [commentActivity, setCommentActivity] = useState<Record<string, string>>({});
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>(() => {
    try {
      if (typeof window !== 'undefined') {
        const storedState = localStorage.getItem('prode-collapsed-days');
        if (storedState) {
          return JSON.parse(storedState);
        }
      }
    } catch (e) {
      console.error("Error reading collapsed days from local storage", e);
    }
    
    const pastDaysState: Record<string, boolean> = {};
    const today = new Date();
    Object.entries(matchesData.reduce((acc, match) => {
        const date = new Date(match.date);
        const dayString = date.toLocaleDateString(currentLang, { weekday: 'long', day: 'numeric', month: 'long' });
        const capitalizedDay = dayString.charAt(0).toUpperCase() + dayString.slice(1);
        if (!acc[capitalizedDay]) acc[capitalizedDay] = [];
        acc[capitalizedDay].push(match);
        return acc;
    }, {} as Record<string, typeof matchesData>)).forEach(([day, dayMatches]) => {
        const matchDate = new Date(dayMatches[0].date);
        const matchDateString = matchDate.toLocaleDateString(currentLang);
        const todayLocaleString = today.toLocaleDateString(currentLang);
        
        if (matchDateString === todayLocaleString) {
            pastDaysState[day] = false;
        } else {
            pastDaysState[day] = true;
        }
    });
    return pastDaysState;
  });
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const statsDoc = doc(db, "statistics", "matches");
    const unsubscribe = onSnapshot(statsDoc, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setMatchStats(data as any);
        setCommentActivity(data._comments || {});
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Determine today date string
  const today = new Date();
  const todayString = today.toLocaleDateString(currentLang, { weekday: 'long', day: 'numeric', month: 'long' });
  const todayCapitalized = todayString.charAt(0).toUpperCase() + todayString.slice(1);


  useEffect(() => {
    if (Object.keys(collapsedDays).length > 0) {
      localStorage.setItem('prode-collapsed-days', JSON.stringify(collapsedDays));
    }
  }, [collapsedDays]);

  useEffect(() => {
    // Attempt auto-scroll
    setTimeout(() => {
        if (dayRefs.current[todayCapitalized]) {
            dayRefs.current[todayCapitalized]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 500);
  }, [todayCapitalized]);

  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-center justify-between border-b dark:border-gray-700 pb-2">
        <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-400 transition-colors duration-200">{t('predictions.sign2Title', 'Partidos Individuales')}</h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
             if (dayRefs.current[todayCapitalized]) {
                dayRefs.current[todayCapitalized]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
             }
          }}
          className="text-xs flex items-center gap-2 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
          title={t('predictions.goToToday', 'Ir a Partidos de Hoy')}
        >
          <CalendarDays className="w-4 h-4" /> <span className="hidden sm:inline">{t('predictions.today', 'Hoy')}</span>
        </Button>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-200 mb-6 text-justify transition-colors duration-200">
        {t('predictions.matchesStageDesc')}
      </p>

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
               <span className="font-bold text-gray-800 dark:text-gray-200 block mb-0.5 flex items-center gap-1">{t('predictions.exactResultTitle')}</span>
               <p className="text-gray-600 dark:text-gray-400 text-xs leading-snug">{t('predictions.exactResultDesc')}</p>
             </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-8">
        {Object.entries(matchesData.reduce((acc, match) => {
          const date = new Date(match.date);
          const dayString = date.toLocaleDateString(currentLang, { weekday: 'long', day: 'numeric', month: 'long' });
          const capitalizedDay = dayString.charAt(0).toUpperCase() + dayString.slice(1);
          if (!acc[capitalizedDay]) acc[capitalizedDay] = [];
          acc[capitalizedDay].push(match);
          return acc;
        }, {} as Record<string, typeof matchesData>)).map(([day, dayMatches]) => (
          <div key={day} className="space-y-4" ref={(el) => { dayRefs.current[day] = el; }}>
            <div
              className={`sticky top-16 z-10 flex items-center justify-between cursor-pointer select-none group transition-colors duration-200 rounded-r-lg pl-4 pr-3 py-2.5 border-l-4 backdrop-blur-sm ${
                day === todayCapitalized
                  ? 'border-l-blue-500 bg-blue-50/95 dark:bg-gray-900/95'
                  : 'border-l-gray-300 dark:border-l-gray-600 bg-white/95 dark:bg-gray-900/95'
              }`}
              onClick={() => setCollapsedDays(prev => ({...prev, [day]: !prev[day]}))}
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
                <div className={`p-1 rounded-md transition-colors ${day === todayCapitalized ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'} group-hover:opacity-70`}>
                  {collapsedDays[day] ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
              </div>
            </div>
            {!collapsedDays[day] && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {dayMatches.map((match) => {
                const matchDate = new Date(match.date);
                const isMatchLocked = Date.now() >= matchDate.getTime() - 60 * 60 * 1000;
                // Partidos individuales se bloquean SOLO 1 hora antes de cada partido, ignorando el bloqueo global de fase de grupos
                const locked = isMatchLocked;
                const pred = matchPredictions[match.id] || { teamA: '', teamB: '', outcome: '' };

                return (
                  <Card key={match.id} className={`overflow-hidden ${isMatchLocked ? 'opacity-75 bg-gray-50 dark:bg-gray-800/50' : ''}`}>
                    <CardHeader className="bg-gray-50 dark:bg-gray-700/50 py-2 px-4 border-b dark:border-gray-700 flex flex-row justify-between items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-200 font-medium">
                        {matchDate.toLocaleString(currentLang, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMatchLocked && <Lock className="w-3 h-3 text-gray-400" />}
                    </CardHeader>
                    <CardContent className="p-4 flex flex-col gap-4">
                      <div className="flex flex-col gap-3">
                        {/* Team A */}
                        <div className="flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/30 p-2 rounded-md border border-gray-100 dark:border-gray-700/50">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <TeamFlag teamName={match.teamA} />
                            <span className="font-semibold text-sm sm:text-base truncate text-gray-900 dark:text-gray-100" title={match.teamA}>{match.teamA}</span>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2">
                            <button
                              type="button"
                              disabled={locked}
                              onClick={() => {
                                const current = typeof pred.teamA === 'number' ? pred.teamA : 0;
                                handleMatchChange(match.id, 'teamA', Math.max(0, current - 1));
                              }}
                              className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:translate-y-[2px]"
                            >
                              <Minus className="w-4 h-4 font-bold" />
                            </button>
                            <div className="w-8 sm:w-10 text-center font-bold text-lg text-gray-900 dark:text-gray-100 flex-shrink-0">
                              {typeof pred.teamA === 'number' ? pred.teamA : '-'}
                            </div>
                            <button
                              type="button"
                              disabled={locked}
                              onClick={() => {
                                const current = typeof pred.teamA === 'number' ? pred.teamA : 0;
                                handleMatchChange(match.id, 'teamA', Math.min(20, current + 1));
                              }}
                              className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:translate-y-[2px]"
                            >
                              <Plus className="w-4 h-4 font-bold" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Team B */}
                        <div className="flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/30 p-2 rounded-md border border-gray-100 dark:border-gray-700/50">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <TeamFlag teamName={match.teamB} />
                            <span className="font-semibold text-sm sm:text-base truncate text-gray-900 dark:text-gray-100" title={match.teamB}>{match.teamB}</span>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2">
                            <button
                              type="button"
                              disabled={locked}
                              onClick={() => {
                                const current = typeof pred.teamB === 'number' ? pred.teamB : 0;
                                handleMatchChange(match.id, 'teamB', Math.max(0, current - 1));
                              }}
                              className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:translate-y-[2px]"
                            >
                              <Minus className="w-4 h-4 font-bold" />
                            </button>
                            <div className="w-8 sm:w-10 text-center font-bold text-lg text-gray-900 dark:text-gray-100 flex-shrink-0">
                              {typeof pred.teamB === 'number' ? pred.teamB : '-'}
                            </div>
                            <button
                              type="button"
                              disabled={locked}
                              onClick={() => {
                                const current = typeof pred.teamB === 'number' ? pred.teamB : 0;
                                handleMatchChange(match.id, 'teamB', Math.min(20, current + 1));
                              }}
                              className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:translate-y-[2px]"
                            >
                              <Plus className="w-4 h-4 font-bold" />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-center gap-2 mt-1">
                        <div className="flex-1 flex flex-col items-center">
                          <Button 
                            size="sm" 
                            className={`w-full text-xs h-10 font-bold border-2 active:translate-y-[2px] transition-all shadow-sm ${pred.outcome === 'A' ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                            onClick={() => handleMatchChange(match.id, 'outcome', 'A')}
                            disabled={locked || (typeof pred.teamA === 'number' && typeof pred.teamB === 'number')}
                          >
                            {t('predictions.homeWin', 'Gana Local')}
                          </Button>
                          {matchStats[match.id] && matchStats[match.id].total > 0 && (
                            <span className="text-xs text-gray-500 mt-1 font-medium">
                              {Math.round((matchStats[match.id].A / matchStats[match.id].total) * 100)}%
                            </span>
                          )}
                        </div>
                        <div className="flex-1 flex flex-col items-center">
                          <Button 
                            size="sm" 
                            className={`w-full text-xs h-10 font-bold border-2 active:translate-y-[2px] transition-all shadow-sm ${pred.outcome === 'DRAW' ? 'bg-gray-700 hover:bg-gray-800 text-white border-gray-900 dark:border-gray-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                            onClick={() => handleMatchChange(match.id, 'outcome', 'DRAW')}
                            disabled={locked || (typeof pred.teamA === 'number' && typeof pred.teamB === 'number')}
                          >
                            {t('predictions.tie', 'Empate')}
                          </Button>
                          {matchStats[match.id] && matchStats[match.id].total > 0 && (
                            <span className="text-xs text-gray-500 mt-1 font-medium">
                              {Math.round((matchStats[match.id].DRAW / matchStats[match.id].total) * 100)}%
                            </span>
                          )}
                        </div>
                        <div className="flex-1 flex flex-col items-center">
                          <Button 
                            size="sm" 
                            className={`w-full text-xs h-10 font-bold border-2 active:translate-y-[2px] transition-all shadow-sm ${pred.outcome === 'B' ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                            onClick={() => handleMatchChange(match.id, 'outcome', 'B')}
                            disabled={locked || (typeof pred.teamA === 'number' && typeof pred.teamB === 'number')}
                          >
                            {t('predictions.awayWin', 'Gana Visita')}
                          </Button>
                          {matchStats[match.id] && matchStats[match.id].total > 0 && (
                            <span className="text-xs text-gray-500 mt-1 font-medium">
                              {Math.round((matchStats[match.id].B / matchStats[match.id].total) * 100)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <MatchComments matchId={match.id} lastCommentAt={commentActivity[match.id]} />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
