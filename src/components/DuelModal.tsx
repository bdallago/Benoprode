import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { X } from 'lucide-react';
import { TeamFlag } from './Fixture';

interface DuelModalProps {
  challengedId: string;
  challengedName: string;
  matchId: string;
  matchData: any; // The match details (teams, date, etc.)
  challengedPrediction: any; // What the challenged user predicted
  onClose: () => void;
}

export function DuelModal({ challengedId, challengedName, matchId, matchData, challengedPrediction, onClose }: DuelModalProps) {
  const [teamA, setTeamA] = useState<number | ''>('');
  const [teamB, setTeamB] = useState<number | ''>('');
  const [outcome, setOutcome] = useState<'A' | 'B' | 'DRAW' | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!auth.currentUser || outcome === '') return;
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, 'duels'), {
        challengerId: auth.currentUser.uid,
        challengerName: auth.currentUser.displayName || 'Usuario',
        challengedId,
        challengedName,
        matchId,
        challengerPrediction: { teamA, teamB, outcome },
        challengedPrediction,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      onClose();
    } catch (error) {
      console.error('Error creating duel:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full shadow-xl overflow-hidden transition-colors duration-200">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Retar a {challengedName}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Predicción de {challengedName}:</p>
            <div className="font-bold text-lg text-blue-900 dark:text-blue-300">
              {challengedPrediction.outcome === 'A' && `Gana ${matchData.teamA}`}
              {challengedPrediction.outcome === 'B' && `Gana ${matchData.teamB}`}
              {challengedPrediction.outcome === 'DRAW' && `Empate`}
              {challengedPrediction.teamA !== '' && challengedPrediction.teamB !== '' && ` (${challengedPrediction.teamA} - ${challengedPrediction.teamB})`}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-4 text-center">¿Cuál es tu predicción?</h4>
            
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md border border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-3">
                  <TeamFlag teamName={matchData.teamA} />
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{matchData.teamA}</span>
                </div>
                <input 
                  type="number" min="0" max="20"
                  className="w-14 text-center p-1.5 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  value={teamA}
                  onChange={(e) => setTeamA(e.target.value === '' ? '' : parseInt(e.target.value))}
                />
              </div>
              
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md border border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-3">
                  <TeamFlag teamName={matchData.teamB} />
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{matchData.teamB}</span>
                </div>
                <input 
                  type="number" min="0" max="20"
                  className="w-14 text-center p-1.5 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  value={teamB}
                  onChange={(e) => setTeamB(e.target.value === '' ? '' : parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                variant={outcome === 'A' ? 'default' : 'outline'} 
                className="flex-1 text-xs"
                onClick={() => setOutcome('A')}
              >
                Gana Local
              </Button>
              <Button 
                variant={outcome === 'DRAW' ? 'default' : 'outline'} 
                className="flex-1 text-xs"
                onClick={() => setOutcome('DRAW')}
              >
                Empate
              </Button>
              <Button 
                variant={outcome === 'B' ? 'default' : 'outline'} 
                className="flex-1 text-xs"
                onClick={() => setOutcome('B')}
              >
                Gana Visita
              </Button>
            </div>
          </div>

          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={outcome === '' || isSubmitting}
            onClick={handleSubmit}
          >
            Enviar Reto ⚔️
          </Button>
        </div>
      </div>
    </div>
  );
}
