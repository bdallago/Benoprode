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
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Offset adjusted so it becomes sticky after scrolling past the padding
      setIsSticky(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

      <div className={`sticky top-[64px] md:top-0 z-40 flex flex-col md:flex-row items-center justify-between bg-white/95 backdrop-blur-md dark:bg-gray-800/95 border border-gray-100 dark:border-gray-700 shadow-md transition-all duration-300 ${isSticky ? 'p-2 md:p-4 gap-2 md:gap-4 -mx-4 sm:mx-0 rounded-none sm:rounded-b-lg' : 'p-4 sm:p-6 gap-4 sm:gap-6 rounded-lg'}`}>
        <h1 className={`text-xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 text-center md:text-left transition-all duration-300 ${isSticky ? 'hidden md:block' : 'block'}`}>{t('predictions.title')}</h1>
        
        <div className={`flex justify-center md:justify-end w-full md:w-auto transition-all ${isSticky ? 'gap-1 sm:gap-2 flex-row' : 'flex-col sm:flex-row gap-2 sm:gap-3'}`}>
          <Button 
            onClick={() => setIsShareModalOpen(true)}
            variant="outline"
            className={`flex items-center justify-center gap-1 sm:gap-2 transition-all ${isSticky ? 'flex-1 md:flex-none text-xs px-2 h-9' : 'w-full sm:w-auto'}`}
          >
            <Share2 className={`${isSticky ? 'w-3 h-3 md:w-4 md:h-4' : 'w-4 h-4'}`} /> 
            <span className={isSticky ? "hidden md:inline" : ""}>Compartir</span>
          </Button>
          {!effectiveIsLocked && (
            <>
              {isAutoSaving && (
                <div className={`flex items-center gap-2 text-xs text-blue-500 font-medium px-2 animate-pulse ${isSticky ? 'hidden md:flex' : 'hidden sm:flex'}`}>
                  <Loader2 className="w-3 h-3 animate-spin" /> Guardando...
                </div>
              )}
              <Button 
                variant="outline" 
                onClick={() => savePredictions(false)}
                disabled={saving || loading}
                className={`flex items-center justify-center gap-1 sm:gap-2 transition-all ${isSticky ? 'flex-1 md:flex-none text-[11px] sm:text-xs px-2 h-9' : 'w-full sm:w-auto'}`}
              >
                <Save className={`${isSticky ? 'w-3 h-3 md:w-4 md:h-4' : 'w-4 h-4'}`} /> 
                <span className={isSticky ? "hidden sm:inline" : ""}>{saving ? t('predictions.saving') : t('predictions.saveDraft')}</span>
                <span className={isSticky ? "sm:hidden" : "hidden"}>{saving ? '...' : 'Borrador'}</span>
              </Button>
              <Button 
                variant="success"
                onClick={() => setConfirmLock(true)}
                disabled={saving || loading}
                className={`flex items-center justify-center gap-1 sm:gap-2 transition-all ${isSticky ? 'flex-1 md:flex-none text-[11px] sm:text-xs px-2 h-9' : 'w-full sm:w-auto'}`}
              >
                <Lock className={`${isSticky ? 'w-3 h-3 md:w-4 md:h-4' : 'w-4 h-4'}`} /> 
                <span className={isSticky ? "hidden sm:inline" : ""}>{t('predictions.lockPredictions')}</span>
                <span className={isSticky ? "sm:hidden" : "hidden"}>Fijar</span>
              </Button>
            </>
          )}
          {effectiveIsLocked && (
            <div className={`flex items-center gap-2 text-green-700 bg-green-50 rounded-md border border-green-200 justify-center transition-all ${isSticky ? 'py-1 px-2 text-xs flex-1 md:flex-none h-9' : 'px-4 py-2 w-full sm:w-auto'}`}>
              <Lock className={`${isSticky ? 'w-3 h-3' : 'w-4 h-4'}`} /> <span className={isSticky ? "hidden sm:inline" : ""}>{t('predictions.predictionsLocked')}</span><span className={isSticky ? "sm:hidden" : "hidden"}>Fijadas</span>
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
      {confirmLock && (() => {
        const answeredMatchesCount = Object.values(matchPredictions || {}).filter(p => typeof p.teamA === 'number' && typeof p.teamB === 'number').length;
        const answeredSpecialsCount = Object.keys(specialPredictions || {}).filter(k => typeof specialPredictions[k] === 'string' && specialPredictions[k].trim() !== '').length;
        
        const totalMatches = 72;
        const totalSpecials = 10;
        
        const missingMatches = totalMatches - answeredMatchesCount;
        const missingSpecials = totalSpecials - answeredSpecialsCount;
        const hasMissing = missingMatches > 0 || missingSpecials > 0;

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border ${hasMissing ? 'border-orange-500' : 'border-gray-200 dark:border-gray-700'}`}>
              <div className="flex items-center gap-3 mb-4">
                {hasMissing ? (
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-6 h-6 text-orange-600" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5 text-blue-600" />
                  </div>
                )}
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {hasMissing ? '¡Atención! Predicciones incompletas' : t('predictions.confirmLockTitle')}
                </h3>
              </div>

              {hasMissing ? (
                <div className="mb-6 space-y-3 text-sm text-gray-700 dark:text-gray-300 bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800/30">
                  <p className="font-semibold text-orange-800 dark:text-orange-300">
                    Estás a punto de fijar tu prode, pero dejaste algunas secciones sin responder:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-orange-700 dark:text-orange-400">
                    {missingMatches > 0 && <li>Te faltan {missingMatches} partidos individuales.</li>}
                    {missingSpecials > 0 && <li>Te faltan {missingSpecials} preguntas especiales.</li>}
                  </ul>
                  <p className="pt-2">Si fijás ahora, perderás la oportunidad de sumar esos puntos. ¿Estás seguro/a?</p>
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-300 mb-6 text-base">
                  {t('predictions.confirmLockDesc')}
                </p>
              )}

              <div className="flex gap-3 justify-end mt-2">
                <Button variant="outline" onClick={() => setConfirmLock(false)} className="font-semibold px-5">
                  Revisar de nuevo
                </Button>
                <Button 
                  onClick={() => {
                    setConfirmLock(false);
                    savePredictions(true);
                  }}
                  variant={hasMissing ? "destructive" : "success"}
                  className="font-semibold px-5 flex items-center gap-2 shadow-sm"
                >
                  <Lock className="w-4 h-4" /> {hasMissing ? 'Fijar con espacios vacíos' : t('predictions.confirmLock')}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

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
