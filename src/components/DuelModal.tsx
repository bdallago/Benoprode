import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Button } from './ui/button';
import { X, Swords } from 'lucide-react';

interface DuelModalProps {
  challengedId: string;
  challengedName: string;
  matchId: string;
  matchData: any; 
  challengedPrediction: any;
  myPrediction: any; 
  duelType: 'match_winner' | 'match_exact' | 'group_position' | 'group_complete' | 'special' | 'knockout' | 'match';
  onClose: () => void;
}

export function DuelModal({ challengedId, challengedName, matchId, matchData, challengedPrediction, myPrediction, duelType, onClose }: DuelModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [internalDuelType, setInternalDuelType] = useState(duelType === 'match_winner' || duelType === 'match_exact' || duelType === 'match' ? 'match_exact' : duelType);

  const handleSubmit = async () => {
    if (!auth.currentUser) return;
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, 'duels_v2'), {
        challengerId: auth.currentUser.uid,
        challengerName: auth.currentUser.displayName || 'Usuario',
        challengedId,
        challengedName,
        matchId,
        duelType: internalDuelType, // Make sure we save the selected match type
        challengerPrediction: myPrediction,
        challengedPrediction,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setSuccess(true);
      setTimeout(onClose, 2000);
    } catch (error) {
      console.error('Error creating duel:', error);
      alert('Ocurrió un error al crear el duelo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPredictionValue = (pred: any, type: string) => {
    if (type === 'match_winner' || type === 'match_exact') {
      if (type === 'match_exact') return `${pred.teamA} - ${pred.teamB}`;
      if (pred.outcome === 'A') return `Gana ${matchData.teamA}`;
      if (pred.outcome === 'B') return `Gana ${matchData.teamB}`;
      if (pred.outcome === 'DRAW') return 'Empate';
      return 'Sin definir';
    }
    if (type === 'group_position') return pred.team || 'Sin definir';
    if (type === 'group_complete') return pred.teams ? pred.teams.join(', ') : 'Sin definir';
    if (type === 'special') return pred.answer || 'Sin definir';
    if (type === 'knockout') return pred.team || 'Sin definir';
    return '-';
  };

  let myValue = renderPredictionValue(myPrediction, internalDuelType);
  let hisValue = renderPredictionValue(challengedPrediction, internalDuelType);

  let arePredictionsIdentical = myValue === hisValue;
  
  const isMatch = duelType === 'match_winner' || duelType === 'match_exact' || duelType === 'match' as any;
  const winnerIsIdentical = isMatch && (renderPredictionValue(myPrediction, 'match_winner') === renderPredictionValue(challengedPrediction, 'match_winner'));
  const exactIsIdentical = isMatch && (renderPredictionValue(myPrediction, 'match_exact') === renderPredictionValue(challengedPrediction, 'match_exact'));

  React.useEffect(() => {
    if (isMatch && internalDuelType !== 'match_winner' && internalDuelType !== 'match_exact') {
      if (!exactIsIdentical) setInternalDuelType('match_exact');
      else if (!winnerIsIdentical) setInternalDuelType('match_winner');
    }
  }, [isMatch, internalDuelType, exactIsIdentical, winnerIsIdentical]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full shadow-xl overflow-hidden transition-colors duration-200">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Swords className="w-5 h-5 text-blue-600" />
            Retar a {challengedName}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {success ? (
            <div className="text-center p-6 text-green-600 dark:text-green-400 font-bold text-lg">
              ¡Duelo registrado correctamente!
            </div>
          ) : (
            <>
              {isMatch && !winnerIsIdentical && !exactIsIdentical && (
                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                  <button 
                    className={`flex-1 text-sm py-2 px-3 rounded-md transition-colors ${internalDuelType === 'match_exact' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white font-bold' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    onClick={() => setInternalDuelType('match_exact')}
                  >
                    Resultado Exacto
                  </button>
                  <button 
                    className={`flex-1 text-sm py-2 px-3 rounded-md transition-colors ${internalDuelType === 'match_winner' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white font-bold' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    onClick={() => setInternalDuelType('match_winner')}
                  >
                    Ganador/Empate
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tu predicción</p>
                  <p className="font-bold text-blue-700 dark:text-blue-400 text-lg">{myValue}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Elige {challengedName}</p>
                  <p className="font-bold text-gray-900 dark:text-gray-100 text-lg">{hisValue}</p>
                </div>
              </div>

              {arePredictionsIdentical ? (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-3 flex rounded-md text-sm text-center">
                  No puedes retar esta predicción porque ambos eligieron exactamente lo mismo. Elige una predicción donde no coincidan.
                </div>
              ) : (
                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded-md text-sm text-center">
                  Al confirmar, el sistema registrará este duelo. Cuando suceda el evento, el ganador se llevará 1 victoria en el historial de duelos. ¡3 victorias te dan 1 punto!
                </div>
              )}

              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isSubmitting || arePredictionsIdentical}
                onClick={handleSubmit}
              >
                {isSubmitting ? "Enviando..." : "Confirmar Duelo ⚔️"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
