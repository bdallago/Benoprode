import { useState } from "react";
import { User } from "firebase/auth";
import { Button } from "../components/ui/button";
import { Save, Lock, AlertCircle, CheckCircle2, Share2 } from "lucide-react";
import { CountdownBanner } from "../components/CountdownBanner";
import dynamic from "next/dynamic";
import { useTranslation } from 'react-i18next';
import { usePredictions } from "../hooks/usePredictions";
import { GroupStage } from "../components/predictions/GroupStage";
import { SpecialPredictions } from "../components/predictions/SpecialPredictions";
import { KnockoutStage } from "../components/predictions/KnockoutStage";
import { MatchesStage } from "../components/predictions/MatchesStage";

// Lazy load heavy components
const SharePredictionsModal = dynamic(() => import("../components/SharePredictionsModal").then(mod => mod.SharePredictionsModal), {
  ssr: false
});

export default function Predictions({ user }: { user: User }) {
  const { t } = useTranslation();
  const [confirmLock, setConfirmLock] = useState(false);
  const [activeTab, setActiveTab] = useState<'groups' | 'matches' | 'knockout' | 'specials'>('groups');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const {
    loading,
    saving,
    effectiveIsLocked,
    message,
    groupPredictions,
    setGroupPredictions,
    specialPredictions,
    setSpecialPredictions,
    matchPredictions,
    setMatchPredictions,
    savePredictions
  } = usePredictions(user.uid);

  const handleDragEnd = (event: any, groupLetter: string) => {
    if (effectiveIsLocked) return;
    
    const { active, over } = event;

    if (active.id !== over.id) {
      setGroupPredictions((prev) => {
        const items = prev[groupLetter];
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        
        // create a new array and move the item
        const newItems = [...items];
        newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, active.id);
        
        return {
          ...prev,
          [groupLetter]: newItems,
        };
      });
    }
  };

  const handleSpecialChange = (id: string, value: string) => {
    if (effectiveIsLocked) return;
    setSpecialPredictions(prev => ({ ...prev, [id]: value }));
  };

  const handleMatchChange = (matchId: string, field: 'teamA' | 'teamB' | 'outcome', value: any) => {
    setMatchPredictions(prev => {
      const current = prev[matchId] || { teamA: '', teamB: '', outcome: '' };
      return {
        ...prev,
        [matchId]: { ...current, [field]: value }
      };
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
        <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-lg w-full"></div>
        <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-lg w-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-64 bg-gray-200 dark:bg-gray-800 rounded-lg w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <CountdownBanner />

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 text-center md:text-left">{t('predictions.title')}</h1>
        
        <div className="flex flex-col sm:flex-row justify-center md:justify-end gap-3 w-full md:w-auto">
          <Button 
            onClick={() => setIsShareModalOpen(true)}
            variant="outline"
            className="w-full sm:w-auto flex items-center justify-center gap-2 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
          >
            <Share2 className="w-4 h-4" /> Compartir
          </Button>
          {!effectiveIsLocked && (
            <>
              <Button 
                variant="outline" 
                onClick={() => savePredictions(false)}
                disabled={saving || loading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 save-draft-btn"
              >
                <Save className="w-4 h-4" /> {saving ? t('predictions.saving') : t('predictions.saveDraft')}
              </Button>
              <Button 
                onClick={() => setConfirmLock(true)}
                disabled={saving || loading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Lock className="w-4 h-4" /> {t('predictions.lockPredictions')}
              </Button>
            </>
          )}
          {effectiveIsLocked && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-md border border-green-200 w-full sm:w-auto justify-center">
              <Lock className="w-4 h-4" /> {t('predictions.predictionsLocked')}
            </div>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-md flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <>
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          <Button id="tab-groups" variant={activeTab === 'groups' ? 'default' : 'outline'} onClick={() => setActiveTab('groups')}>Fase de Grupos</Button>
          <Button id="tab-specials" className="tab-specials" variant={activeTab === 'specials' ? 'default' : 'outline'} onClick={() => setActiveTab('specials')}>Preguntas Especiales</Button>
          <Button id="tab-matches" variant={activeTab === 'matches' ? 'default' : 'outline'} onClick={() => setActiveTab('matches')}>Partidos Individuales</Button>
          <Button id="tab-knockout" variant={activeTab === 'knockout' ? 'default' : 'outline'} onClick={() => setActiveTab('knockout')}>Fase Eliminatoria</Button>
        </div>

        {activeTab === 'groups' && (
          <GroupStage 
            groupPredictions={groupPredictions} 
            effectiveIsLocked={effectiveIsLocked} 
            handleDragEnd={handleDragEnd} 
          />
        )}

        {activeTab === 'specials' && (
          <SpecialPredictions 
            specialPredictions={specialPredictions} 
            effectiveIsLocked={effectiveIsLocked} 
            handleSpecialChange={handleSpecialChange} 
          />
        )}

        {activeTab === 'knockout' && (
          <KnockoutStage />
        )}

        {activeTab === 'matches' && (
          <MatchesStage 
            matchPredictions={matchPredictions} 
            effectiveIsLocked={effectiveIsLocked} 
            saving={saving} 
            handleMatchChange={handleMatchChange} 
            savePredictions={savePredictions} 
          />
        )}
      </>

      {/* Confirmation Modal */}
      {confirmLock && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('predictions.confirmLockTitle')}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('predictions.confirmLockDesc')}
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setConfirmLock(false)}>
                {t('predictions.cancel')}
              </Button>
              <Button 
                onClick={() => {
                  setConfirmLock(false);
                  savePredictions(true);
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <Lock className="w-4 h-4 mr-2" /> {t('predictions.confirmLock')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {isShareModalOpen && (
        <SharePredictionsModal 
          isOpen={isShareModalOpen} 
          onClose={() => setIsShareModalOpen(false)} 
          champion={specialPredictions['champion'] || ''}
          topScorer={specialPredictions['topScorer'] || ''}
          revelation={specialPredictions['revelation'] || ''}
          userName={user.displayName || 'Usuario'}
        />
      )}
    </div>
  );
}
