import { useState, useEffect, useRef } from "react";
import { User } from "firebase/auth";
import { Button } from "../components/ui/button";
import { Save, Lock, Unlock, AlertCircle, CheckCircle2, Share2, Loader2 } from "lucide-react";
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
  const isFirstRender = useRef(true);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

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

  // Auto-save logic for matches
  useEffect(() => {
    if (loading || effectiveIsLocked) return;
    
    // Skip first render to avoid saving immediately on load
    if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
    }

    if (activeTab !== 'matches') return;

    const timeout = setTimeout(async () => {
        setIsAutoSaving(true);
        await savePredictions(false, true); // save silently
        setIsAutoSaving(false);
    }, 1500); // 1.5s debounce
    
    return () => clearTimeout(timeout);
  }, [matchPredictions, activeTab]);

  const handleDragEnd = (event: any, groupLetter: string) => {
    if (effectiveIsLocked) return;
    
    const { active, over } = event;

    if (active.id !== over.id) {
      setGroupPredictions((prev: any) => {
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
    setSpecialPredictions((prev: any) => ({ ...prev, [id]: value }));
  };

  const handleMatchChange = (matchId: string, field: 'teamA' | 'teamB' | 'outcome', value: any) => {
    setMatchPredictions((prev: any) => {
      const current = prev[matchId] || { teamA: '', teamB: '', outcome: '' };
      
      const updated = { ...current, [field]: value };
      
      // Auto-calculate outcome based on goals ONLY if both are numbers
      if (field === 'teamA' || field === 'teamB') {
        if (typeof updated.teamA === 'number' && typeof updated.teamB === 'number') {
          if (updated.teamA > updated.teamB) {
            updated.outcome = 'A';
          } else if (updated.teamA < updated.teamB) {
            updated.outcome = 'B';
          } else {
            updated.outcome = 'DRAW';
          }
        }
      }
      
      return {
        ...prev,
        [matchId]: updated
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
            className="w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" /> Compartir
          </Button>
          {!effectiveIsLocked && (
            <>
              {isAutoSaving && (
                <div className="flex items-center gap-2 text-xs text-blue-500 font-medium px-2 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" /> Guardando...
                </div>
              )}
              <Button 
                variant="outline" 
                onClick={() => savePredictions(false)}
                disabled={saving || loading}
                className="w-full sm:w-auto flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" /> {saving ? t('predictions.saving') : t('predictions.saveDraft')}
              </Button>
              <Button 
                variant="success"
                onClick={() => setConfirmLock(true)}
                disabled={saving || loading}
                className="w-full sm:w-auto flex items-center justify-center gap-2"
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
      
      <div className="mb-8 bg-transparent p-1 sm:p-2 text-center flex justify-center w-full">
        <div className="flex flex-col sm:flex-row items-stretch justify-center gap-4 sm:gap-6 w-full max-w-3xl px-4">
          
          {/* Sign 1: Phase 1 & Specials */}
          <div className="flex-1 bg-white dark:bg-gray-800 border-t border-x border-gray-100 dark:border-gray-700 border-b-4 border-gray-200 dark:border-gray-950 rounded-xl p-6 flex flex-col items-center justify-center shadow-sm relative transition-all">
            <span className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-300 font-black mb-3 text-center">Fase de Grupos / Preguntas Especiales</span>
            <div className={`font-black uppercase tracking-widest text-sm sm:text-base ${new Date() > new Date('2026-06-08T00:00:00') || effectiveIsLocked ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {new Date() > new Date('2026-06-08T00:00:00') || effectiveIsLocked ? 'Cerradas - Fijadas' : 'Abiertas - Sin fijar'}
            </div>
          </div>

          {/* Sign 2: Individual Matches */}
          <div className="flex-1 bg-white dark:bg-gray-800 border-t border-x border-gray-100 dark:border-gray-700 border-b-4 border-gray-200 dark:border-gray-950 rounded-xl p-6 flex flex-col items-center justify-center shadow-sm relative transition-all">
            <span className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-300 font-black mb-3 text-center">Partidos Individuales</span>
            <div className="text-green-600 dark:text-green-400 font-black uppercase tracking-widest text-sm sm:text-base text-center leading-tight">
              Abierto hasta 1 hora antes
            </div>
          </div>

        </div>
      </div>

      <>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-2 mb-6">
          <Button id="tab-groups" variant={activeTab === 'groups' ? 'default' : 'outline'} onClick={() => setActiveTab('groups')} className="w-full sm:w-auto text-xs sm:text-sm px-2">Fase de Grupos</Button>
          <Button id="tab-matches" variant={activeTab === 'matches' ? 'default' : 'outline'} onClick={() => setActiveTab('matches')} className="w-full sm:w-auto text-xs sm:text-sm px-2">Partidos Individuales</Button>
          <Button id="tab-knockout" variant={activeTab === 'knockout' ? 'default' : 'outline'} onClick={() => setActiveTab('knockout')} className="w-full sm:w-auto text-xs sm:text-sm px-2">Fase Eliminatoria</Button>
          <Button id="tab-specials" className="tab-specials w-full sm:w-auto text-xs sm:text-sm px-2" variant={activeTab === 'specials' ? 'default' : 'outline'} onClick={() => setActiveTab('specials')}>Preguntas Especiales</Button>
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
            <p className="text-gray-600 dark:text-gray-200 mb-6">
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
                variant="success"
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
