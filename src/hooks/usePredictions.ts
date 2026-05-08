import { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "../firebase";
import { GROUPS } from "../data";
import { useTranslation } from 'react-i18next';

// Fase de grupos se bloquea el 11 de Junio a las 00:00hs (-03:00 para alinear con Bs As)
const GROUP_STAGE_DEADLINE = new Date('2026-06-11T00:00:00-03:00').getTime();
// Lock anticipado: quien guarda antes del 1 de Junio gana la medalla lockedEarly
const EARLY_LOCK_DEADLINE = new Date('2026-06-01T00:00:00-03:00').getTime();

type MatchOutcome = 'A' | 'B' | 'DRAW' | '';
type MatchPred = { teamA: number | '', teamB: number | '', outcome: MatchOutcome };

export function usePredictions(userId: string) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [timeLeft, setTimeLeft] = useState(GROUP_STAGE_DEADLINE - Date.now());

  const [groupPredictions, setGroupPredictions] = useState<Record<string, string[]>>(GROUPS);
  const [specialPredictions, setSpecialPredictions] = useState<Record<string, string>>({});
  const [knockoutPredictions, setKnockoutPredictions] = useState<Record<string, string[]>>({});
  const [matchPredictions, setMatchPredictions] = useState<Record<string, MatchPred>>({});

  // previousMatchOutcomes tracks what's persisted in Firestore so we can diff on outcome change
  const previousMatchOutcomes = useRef<Record<string, MatchOutcome>>({});

  useEffect(() => {
    const fetchPredictions = async () => {
      if (!userId) return;
      try {
        const docRef = doc(db, "predictions", userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

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

          // Initialise the ref with what Firestore has (truth baseline)
          if (data.matches) {
            const prevOutcomes: Record<string, MatchOutcome> = {};
            Object.entries(data.matches).forEach(([matchId, pred]: [string, any]) => {
              if (pred?.outcome) prevOutcomes[matchId] = pred.outcome;
            });
            previousMatchOutcomes.current = prevOutcomes;
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
  }, [userId]);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = GROUP_STAGE_DEADLINE - Date.now();
      setTimeLeft(remaining);
      if (remaining <= 0 && !isLocked && !loading) {
        setIsLocked(true);
        savePredictions(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isLocked, loading]);

  const isGroupStageLocked = Date.now() >= GROUP_STAGE_DEADLINE || isLocked;
  const effectiveIsLocked = isLocked || isGroupStageLocked;

  // Push an atomic stats update to statistics/matches immediately (fire-and-forget)
  const pushStatsUpdate = (matchId: string, oldOutcome: MatchOutcome, newOutcome: MatchOutcome) => {
    if (oldOutcome === newOutcome) return;

    const flat: Record<string, ReturnType<typeof increment>> = {};

    if (newOutcome) {
      flat[`${matchId}.${newOutcome}`] = increment(1);
      if (oldOutcome) {
        flat[`${matchId}.${oldOutcome}`] = increment(-1);
        // total unchanged — same user, different vote
      } else {
        flat[`${matchId}.total`] = increment(1);
      }
    } else if (oldOutcome) {
      // User cleared their outcome
      flat[`${matchId}.${oldOutcome}`] = increment(-1);
      flat[`${matchId}.total`] = increment(-1);
    }

    if (Object.keys(flat).length === 0) return;

    updateDoc(doc(db, "statistics", "matches"), flat)
      .catch(e => console.warn("Stats update skipped (doc may not exist yet):", e));
  };

  // handleMatchChange lives in the hook so it can update stats immediately on outcome change
  const handleMatchChange = (matchId: string, field: 'teamA' | 'teamB' | 'outcome', value: any) => {
    setMatchPredictions(prev => {
      const current: MatchPred = prev[matchId] || { teamA: '', teamB: '', outcome: '' };
      const updated: MatchPred = { ...current, [field]: value };

      // Auto-derive outcome from score
      if (field === 'teamA' || field === 'teamB') {
        if (typeof updated.teamA === 'number' && typeof updated.teamB === 'number') {
          if (updated.teamA > updated.teamB) updated.outcome = 'A';
          else if (updated.teamA < updated.teamB) updated.outcome = 'B';
          else updated.outcome = 'DRAW';
        }
      }

      // Fire stats update if outcome changed, using the ref as baseline
      const oldOutcome = previousMatchOutcomes.current[matchId] ?? '';
      if (updated.outcome !== oldOutcome) {
        pushStatsUpdate(matchId, oldOutcome, updated.outcome);
        // Advance the baseline immediately so rapid changes don't double-count
        previousMatchOutcomes.current = {
          ...previousMatchOutcomes.current,
          [matchId]: updated.outcome,
        };
      }

      return { ...prev, [matchId]: updated };
    });
  };

  const savePredictions = async (lock: boolean = false, silent: boolean = false) => {
    if (!silent) setSaving(true);
    if (!silent) setMessage(null);

    try {
      const now = Date.now();
      const tenMins = 10 * 60 * 1000;
      const lockedLastMinute = now >= GROUP_STAGE_DEADLINE - tenMins && now < GROUP_STAGE_DEADLINE;
      const lockedEarly = lock && now < EARLY_LOCK_DEADLINE;

      await setDoc(doc(db, "predictions", userId), {
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

      if (lock || effectiveIsLocked) setIsLocked(true);

      if (!silent) {
        setMessage({ type: 'success', text: lock ? t('predictions.lockSuccess') : t('predictions.saveSuccess') });
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
        if (error.code === 'permission-denied' || error.message?.includes('permission')) {
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
    handleMatchChange,
    savePredictions,
    setMessage
  };
}
