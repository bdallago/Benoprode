import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, increment } from "firebase/firestore";
import { db } from "../firebase";
import { GROUPS } from "../data";
import { useTranslation } from 'react-i18next';

// Fase de grupos se bloquea el 8 de Junio a las 00:00hs (-03:00 para alinear con Bs As)
const DEADLINE = new Date('2026-06-08T00:00:00-03:00').getTime();

export function usePredictions(userId: string) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [timeLeft, setTimeLeft] = useState(DEADLINE - Date.now());

  // State for predictions
  const [groupPredictions, setGroupPredictions] = useState<Record<string, string[]>>(GROUPS);
  const [specialPredictions, setSpecialPredictions] = useState<Record<string, string>>({});
  const [knockoutPredictions, setKnockoutPredictions] = useState<Record<string, string[]>>({});
  const [matchPredictions, setMatchPredictions] = useState<Record<string, { teamA: number | '', teamB: number | '', outcome: 'A' | 'B' | 'DRAW' | '' }>>({});
  
  // Track previous state to handle statistic increments properly
  const [previousMatchOutcomes, setPreviousMatchOutcomes] = useState<Record<string, 'A' | 'B' | 'DRAW' | ''>>({});

  useEffect(() => {
    const fetchPredictions = async () => {
      if (!userId) return;
      try {
        const docRef = doc(db, "predictions", userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Sanitize groups
          const sanitizedGroups: Record<string, string[]> = {};
          const savedGroups = data.groups || {};
          for (const [groupLetter, currentTeams] of Object.entries(GROUPS)) {
            const savedTeams = savedGroups[groupLetter] || [];
            const validSavedTeams = (savedTeams as string[]).filter(t => currentTeams.includes(t));
            const missingTeams = currentTeams.filter(t => !validSavedTeams.includes(t));
            sanitizedGroups[groupLetter] = [...validSavedTeams, ...missingTeams];
          }
          
          setGroupPredictions(sanitizedGroups);
          setSpecialPredictions(data.specials || {});
          setKnockoutPredictions(data.knockouts || {});
          setMatchPredictions(data.matches || {});
          
          // Store previous outcomes for differential stats
          if (data.matches) {
             const prevOutcomes: Record<string, 'A' | 'B' | 'DRAW' | ''> = {};
             Object.entries(data.matches).forEach(([matchId, pred]: [string, any]) => {
                if (pred && pred.outcome) {
                  prevOutcomes[matchId] = pred.outcome;
                }
             });
             setPreviousMatchOutcomes(prevOutcomes);
          }
          
          setIsLocked(data.isLocked || false);
        } else {
          setGroupPredictions(GROUPS);
        }
      } catch (error) {
        console.error("Error fetching predictions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, [userId, db]);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = DEADLINE - Date.now();
      setTimeLeft(remaining);
      
      // Auto-lock if time is up and it wasn't locked before
      if (remaining <= 0 && !isLocked && !loading) {
        setIsLocked(true);
        savePredictions(true); // Auto-save as locked
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isLocked, loading]);

  const isGroupStageLocked = Date.now() >= DEADLINE || isLocked;
  // We keep effectiveIsLocked as the global overall lock (which mostly applies to Groups / Knockout overall manual locking)
  // but we will expose isGroupStageLocked natively.
  const effectiveIsLocked = isLocked || isGroupStageLocked;

  const savePredictions = async (lock: boolean = false, silent: boolean = false) => {
    if (!silent) setSaving(true);
    if (!silent) setMessage(null);
    
    try {
      const now = Date.now();
      const tenMins = 10 * 60 * 1000;
      const lockedLastMinute = now >= DEADLINE - tenMins && now < DEADLINE;
      const DEADLINE_EARLY = new Date('2026-06-01T00:00:00-03:00').getTime();
      const lockedEarly = lock && now < DEADLINE_EARLY;

      const docRef = doc(db, "predictions", userId);
      
      // Calculate what to increment and decrement for statistics
      const statsIncrements: Record<string, any> = {};
      const newOutcomes: Record<string, 'A' | 'B' | 'DRAW' | ''> = {};
      
      Object.entries(matchPredictions).forEach(([matchId, pred]) => {
         if (pred.outcome) {
           newOutcomes[matchId] = pred.outcome;
           const previousObj = previousMatchOutcomes[matchId];
           
           if (previousObj !== pred.outcome) {
             // We need to increment the new vote
             if (!statsIncrements[matchId]) statsIncrements[matchId] = {};
             statsIncrements[matchId][pred.outcome] = increment(1);
             
             // If we voted something else before, decrement the old one
             if (previousObj) {
               statsIncrements[matchId][previousObj] = increment(-1);
             } else {
               // If there was no previous vote, we just add to total as well
               statsIncrements[matchId].total = increment(1);
             }
           }
         } else if (previousMatchOutcomes[matchId]) {
             // They removed their vote completely
             if (!statsIncrements[matchId]) statsIncrements[matchId] = {};
             statsIncrements[matchId][previousMatchOutcomes[matchId] as string] = increment(-1);
             statsIncrements[matchId].total = increment(-1);
         }
      });

      // Write to predictions
      await setDoc(docRef, {
        uid: userId,
        groups: groupPredictions,
        specials: specialPredictions,
        knockouts: knockoutPredictions,
        matches: matchPredictions,
        isLocked: lock || effectiveIsLocked,
        hasSavedPredictions: true,
        ...(lockedLastMinute ? { lockedLastMinute: true } : {}),
        ...(lockedEarly ? { lockedEarly: true } : {}),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      // Update global match stats asynchronously so we don't block
      if (Object.keys(statsIncrements).length > 0) {
         setDoc(doc(db, "statistics", "matches"), statsIncrements, { merge: true })
           .catch(e => console.error("Could not update global stats", e));
      }
      
      // Store current as previous to avoid double counting on rapid saves
      setPreviousMatchOutcomes(newOutcomes);
      
      if (lock || effectiveIsLocked) {
        setIsLocked(true);
      }
      
      if (!silent) {
        setMessage({ type: 'success', text: lock ? t('predictions.lockSuccess') : t('predictions.saveSuccess') });
        
        // Trigger confetti on successful save
        import('canvas-confetti').then((confetti) => {
          confetti.default({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#3b82f6', '#1d4ed8', '#60a5fa', '#ffffff']
          });
        });
      }
    } catch (error: any) {
      console.error("Error saving predictions:", error);
      if (!silent) {
        if (error.code === 'permission-denied' || (error.message && error.message.includes('permission'))) {
          setMessage({ type: 'error', text: 'El tiempo para enviar predicciones ha terminado' });
        } else {
          setMessage({ type: 'error', text: t('predictions.saveError') });
        }
      }
    } finally {
      if (!silent) setSaving(false);
      if (!silent) setTimeout(() => setMessage(null), 5000);
    }
  };

  return {
    loading,
    saving,
    isLocked,
    effectiveIsLocked,
    message,
    timeLeft,
    groupPredictions,
    setGroupPredictions,
    specialPredictions,
    setSpecialPredictions,
    knockoutPredictions,
    setKnockoutPredictions,
    matchPredictions,
    setMatchPredictions,
    savePredictions,
    setMessage
  };
}
