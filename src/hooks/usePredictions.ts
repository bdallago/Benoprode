import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { GROUPS } from "../data";
import { useTranslation } from 'react-i18next';

const DEADLINE = new Date('2026-06-08T00:00:00').getTime();

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

  useEffect(() => {
    const fetchPredictions = async () => {
      if (!userId) return;
      try {
        const docRef = doc(db, "predictions", userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Sanitize groups to ensure they match current GROUPS
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
          setIsLocked(data.isLocked || false);
        } else {
          // Initialize with default order if no prediction exists
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

  const isTimeUp = timeLeft <= 0;
  const effectiveIsLocked = isLocked || isTimeUp;

  const savePredictions = async (lock: boolean = false) => {
    setSaving(true);
    setMessage(null);
    
    try {
      const docRef = doc(db, "predictions", userId);
      await setDoc(docRef, {
        uid: userId,
        groups: groupPredictions,
        specials: specialPredictions,
        knockouts: knockoutPredictions,
        matches: matchPredictions,
        isLocked: lock || effectiveIsLocked,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      if (lock || effectiveIsLocked) {
        setIsLocked(true);
      }
      
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
    } catch (error) {
      console.error("Error saving predictions:", error);
      setMessage({ type: 'error', text: t('predictions.saveError') });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 5000);
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
