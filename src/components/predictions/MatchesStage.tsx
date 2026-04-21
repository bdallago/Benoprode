import { useEffect, useState, useRef } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Lock, Save, CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import { TeamFlag } from "../Fixture";
import matchesData from "../../lib/matches.json";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { MatchComments } from "./MatchComments";
import { onSnapshot, doc } from "firebase/firestore";

interface MatchesStageProps {
  matchPredictions: Record<string, { teamA: number | '', teamB: number | '', outcome: 'A' | 'B' | 'DRAW' | '' }>;
  effectiveIsLocked: boolean;
  saving: boolean;
  handleMatchChange: (matchId: string, field: 'teamA' | 'teamB' | 'outcome', value: any) => void;
  savePredictions: (lock: boolean) => void;
}

export function MatchesStage({ matchPredictions, effectiveIsLocked, saving, handleMatchChange, savePredictions }: MatchesStageProps) {
  const [matchStats, setMatchStats] = useState<Record<string, { A: number, B: number, DRAW: number, total: number }>>({});
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const statsDoc = doc(db, "statistics", "matches");
    const unsubscribe = onSnapshot(statsDoc, (snapshot) => {
      if (snapshot.exists()) {
        setMatchStats(snapshot.data());
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Determine today date string
  const today = new Date();
  const todayString = today.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  const todayCapitalized = todayString.charAt(0).toUpperCase() + todayString.slice(1);

  useEffect(() => {
    // initialize collapsed states for ALL days
    try {
      const storedState = localStorage.getItem('prode-collapsed-days');
      if (storedState) {
        setCollapsedDays(JSON.parse(storedState));
        return;
      }
    } catch (e) {
      console.error("Error reading collapsed days from local storage", e);
    }

    const pastDaysState: Record<string, boolean> = {};
    Object.entries(matchesData.reduce((acc, match) => {
        const date = new Date(match.date);
        const dayString = date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
        const capitalizedDay = dayString.charAt(0).toUpperCase() + dayString.slice(1);
        if (!acc[capitalizedDay]) acc[capitalizedDay] = [];
        acc[capitalizedDay].push(match);
        return acc;
    }, {} as Record<string, typeof matchesData>)).forEach(([day, dayMatches]) => {
        const matchDate = new Date(dayMatches[0].date);
        // Collapse the day UNLESS it is exactly today
        const matchDateString = matchDate.toLocaleDateString('es-AR');
        const todayLocaleString = today.toLocaleDateString('es-AR');
        
        if (matchDateString === todayLocaleString) {
            pastDaysState[day] = false; // Open today
        } else {
            pastDaysState[day] = true; // Collapse everything else
        }
    });
    setCollapsedDays(pastDaysState);
  }, []); // Intentionally empty to avoid infinite re-renders from the non-memoized 'today' object

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
        <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-400 transition-colors duration-200">Partidos Individuales</h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
             if (dayRefs.current[todayCapitalized]) {
                dayRefs.current[todayCapitalized]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
             }
          }}
          className="text-xs flex items-center gap-2 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
          title="Ir a Partidos de Hoy"
        >
          <CalendarDays className="w-4 h-4" /> <span className="hidden sm:inline">Hoy</span>
        </Button>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-200 mb-4 text-justify transition-colors duration-200 whitespace-pre-line">
        ¿Le tuviste demasiada fe a un equipo en la previa? ¿Una lesión de última hora? ¡No pasa nada!

        Podés hacer tu predicción del resultado final hasta 1 hora antes de cada partido. Si acertás el resultado (quién gana o si empatan) te llevás 1 punto. Si además lo hacés con el resultado exacto, te llevás 1 punto extra (Total: 2 puntos).
      </p>
      
      <div className="space-y-8">
        {Object.entries(matchesData.reduce((acc, match) => {
          const date = new Date(match.date);
          const dayString = date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
          const capitalizedDay = dayString.charAt(0).toUpperCase() + dayString.slice(1);
          if (!acc[capitalizedDay]) acc[capitalizedDay] = [];
          acc[capitalizedDay].push(match);
          return acc;
        }, {} as Record<string, typeof matchesData>)).map(([day, dayMatches]) => (
          <div key={day} className="space-y-4" ref={(el) => { dayRefs.current[day] = el; }}>
            <div className={`flex items-center justify-between border-b dark:border-gray-700 pb-2 cursor-pointer select-none group ${day === todayCapitalized ? 'border-b-2 border-blue-500' : ''}`} onClick={() => setCollapsedDays(prev => ({...prev, [day]: !prev[day]}))}>
              <div className="flex items-center gap-2">
                 <div className="p-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
                   {collapsedDays[day] ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                 </div>
                 <h3 className={`text-xl font-bold ${day === todayCapitalized ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`}>
                    {day} {day === todayCapitalized && <span className="text-xs ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded-full">Hoy</span>}
                 </h3>
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
                        {matchDate.toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit' })}hs
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
                          <input 
                            type="number" 
                            min="0" 
                            max="20"
                            className="w-12 sm:w-14 text-center p-1.5 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold"
                            value={pred.teamA}
                            onChange={(e) => handleMatchChange(match.id, 'teamA', e.target.value === '' ? '' : parseInt(e.target.value))}
                            disabled={locked}
                          />
                        </div>
                        
                        {/* Team B */}
                        <div className="flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/30 p-2 rounded-md border border-gray-100 dark:border-gray-700/50">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <TeamFlag teamName={match.teamB} />
                            <span className="font-semibold text-sm sm:text-base truncate text-gray-900 dark:text-gray-100" title={match.teamB}>{match.teamB}</span>
                          </div>
                          <input 
                            type="number" 
                            min="0" 
                            max="20"
                            className="w-12 sm:w-14 text-center p-1.5 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold"
                            value={pred.teamB}
                            onChange={(e) => handleMatchChange(match.id, 'teamB', e.target.value === '' ? '' : parseInt(e.target.value))}
                            disabled={locked}
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-center gap-2 mt-1">
                        <div className="flex-1 flex flex-col items-center">
                          <Button 
                            size="sm" 
                            variant={pred.outcome === 'A' ? 'default' : 'outline'} 
                            className={`w-full text-xs h-9 font-semibold ${pred.outcome === 'A' ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            onClick={() => handleMatchChange(match.id, 'outcome', 'A')}
                            disabled={locked || (typeof pred.teamA === 'number' && typeof pred.teamB === 'number')}
                          >
                            Gana Local
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
                            variant={pred.outcome === 'DRAW' ? 'default' : 'outline'} 
                            className={`w-full text-xs h-9 font-semibold ${pred.outcome === 'DRAW' ? 'bg-gray-600 hover:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            onClick={() => handleMatchChange(match.id, 'outcome', 'DRAW')}
                            disabled={locked || (typeof pred.teamA === 'number' && typeof pred.teamB === 'number')}
                          >
                            Empate
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
                            variant={pred.outcome === 'B' ? 'default' : 'outline'} 
                            className={`w-full text-xs h-9 font-semibold ${pred.outcome === 'B' ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            onClick={() => handleMatchChange(match.id, 'outcome', 'B')}
                            disabled={locked || (typeof pred.teamA === 'number' && typeof pred.teamB === 'number')}
                          >
                            Gana Visita
                          </Button>
                          {matchStats[match.id] && matchStats[match.id].total > 0 && (
                            <span className="text-xs text-gray-500 mt-1 font-medium">
                              {Math.round((matchStats[match.id].B / matchStats[match.id].total) * 100)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <MatchComments matchId={match.id} />
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
