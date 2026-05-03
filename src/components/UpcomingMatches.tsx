import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import matchesData from '../lib/matches.json';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import Link from 'next/link';
import { ChevronRight, Clock, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { User } from 'firebase/auth';
import { normalizeTeamName, getTeamFlagUrl } from '../lib/utils';

export function UpcomingMatches({ user }: { user: User }) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'es-AR';
  
  const [predictions, setPredictions] = useState<Record<string, { teamA: number | null, teamB: number | null, outcome?: string | null }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "predictions", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPredictions(data.matches || {});
      }
    });
    return () => unsub();
  }, [user.uid]);

  // Find next 3 matches
  const now = new Date();
  const upcoming = matchesData
    .filter(m => new Date(m.date) > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  const handleScoreChange = async (matchId: string, team: 'teamA' | 'teamB', value: string) => {
    let numValue: number | null = value === "" ? null : parseInt(value, 10);
    if (numValue !== null && (isNaN(numValue) || numValue < 0)) numValue = 0;
    if (numValue !== null && numValue > 20) numValue = 20;

    const currentMatches = { ...predictions };
    if (!currentMatches[matchId]) currentMatches[matchId] = { teamA: null, teamB: null, outcome: null };
    currentMatches[matchId][team] = numValue;
    
    // Auto calculate outcome if both are set
    const predA = currentMatches[matchId].teamA;
    const predB = currentMatches[matchId].teamB;
    if (predA !== null && predB !== null) {
      if (predA > predB) currentMatches[matchId].outcome = 'A';
      else if (predB > predA) currentMatches[matchId].outcome = 'B';
      else currentMatches[matchId].outcome = 'DRAW';
    }

    setPredictions(currentMatches);

    setSaving(matchId);
    try {
      await setDoc(doc(db, "predictions", user.uid), {
        matches: currentMatches,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      
      // Simular onWrite Cloud Function asincrónica para actualizar las estadísticas base
      // del % de elegibilidad global a mostrar en vivo en el panel sin recargar
      fetch('/api/sync/match-stats', { method: 'POST' }).catch(console.error);

    } catch (error) {
      console.error("Error saving match prediction:", error);
    }
    setTimeout(() => setSaving(null), 1000);
  };

  if (upcoming.length === 0) return null;

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm flex-1">
      <CardHeader className="bg-gradient-to-r gap-2 flex-row items-center flex-wrap justify-between from-blue-50 to-transparent dark:from-blue-900/20 dark:to-transparent border-b border-gray-100 dark:border-gray-700 pb-4">
        <CardTitle className="text-lg font-bold flex items-center gap-2 text-blue-900 dark:text-blue-400">
           <Clock className="w-5 h-5" /> Próximos Partidos
        </CardTitle>
        <Link href="/predictions?tab=matches">
          <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 shadow-sm">
            Ir a Predicciones individuales <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-4">
        {upcoming.map((match) => {
          const matchDate = new Date(match.date);
          const isSaving = saving === match.id;
          const predA = predictions[match.id]?.teamA ?? "";
          const predB = predictions[match.id]?.teamB ?? "";

          return (
            <div key={match.id} className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium">
                 <div>
                    {matchDate.toLocaleDateString(currentLang, { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()} • {matchDate.toLocaleTimeString(currentLang, { hour: '2-digit', minute: '2-digit' })}
                 </div>
                 {isSaving && <span className="text-green-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Guardado</span>}
              </div>
              
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                <div className="flex flex-col items-center flex-1">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden mb-1 sm:mb-2 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <img src={getTeamFlagUrl(match.teamA)} alt={match.teamA} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-center text-gray-800 dark:text-gray-200">{match.teamA}</span>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3 px-1 sm:px-2 bg-white dark:bg-gray-800 p-2 sm:p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-inner">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={predA}
                    onChange={(e) => handleScoreChange(match.id, 'teamA', e.target.value)}
                    className="w-10 h-10 sm:w-12 sm:h-12 text-center text-lg sm:text-2xl font-black bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:text-white transition-all transition-colors"
                  />
                  <span className="text-gray-400 font-bold">-</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={predB}
                    onChange={(e) => handleScoreChange(match.id, 'teamB', e.target.value)}
                    className="w-10 h-10 sm:w-12 sm:h-12 text-center text-lg sm:text-2xl font-black bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:text-white transition-all transition-colors"
                  />
                </div>
                
                <div className="flex flex-col items-center flex-1">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden mb-1 sm:mb-2 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <img src={getTeamFlagUrl(match.teamB)} alt={match.teamB} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-center text-gray-800 dark:text-gray-200">{match.teamB}</span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
