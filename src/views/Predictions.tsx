import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { GROUPS, SPECIAL_QUESTIONS, KNOCKOUT_STAGES, ALL_TEAMS } from "../data";
import { TeamFlag } from "../components/Fixture";
import matchesData from "../lib/matches.json";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { SortableItem } from "../components/SortableItem";
import { DndContext, closestCenter, KeyboardSensor, TouchSensor, MouseSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Save, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { CountdownBanner } from "../components/CountdownBanner";
import confetti from 'canvas-confetti';
import { useAuth } from "../components/Providers";

import { useTranslation } from 'react-i18next';

const DEADLINE = new Date('2026-06-08T00:00:00').getTime();

export default function Predictions({ user }: { user: User }) {
  const { advanceTour, tourStepIndex } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [confirmLock, setConfirmLock] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [timeLeft, setTimeLeft] = useState(DEADLINE - Date.now());

  // State for predictions
  const [groupPredictions, setGroupPredictions] = useState<Record<string, string[]>>(GROUPS);
  const [specialPredictions, setSpecialPredictions] = useState<Record<string, string>>({});
  const [knockoutPredictions, setKnockoutPredictions] = useState<Record<string, string[]>>({});
  const [matchPredictions, setMatchPredictions] = useState<Record<string, { teamA: number | '', teamB: number | '', outcome: 'A' | 'B' | 'DRAW' | '' }>>({});
  
  const [activeTab, setActiveTab] = useState<'groups' | 'matches' | 'knockout' | 'specials'>('groups');
  
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const docRef = doc(db, "predictions", user.uid);
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
  }, [user.uid]);

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

  const handleDragEnd = (event: any, groupLetter: string) => {
    if (effectiveIsLocked) return;
    
    const { active, over } = event;

    if (active.id !== over.id) {
      setGroupPredictions((prev) => {
        const items = prev[groupLetter];
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        
        return {
          ...prev,
          [groupLetter]: arrayMove(items, oldIndex, newIndex),
        };
      });
    }
    
    if (tourStepIndex === 2) {
      advanceTour();
    }
  };

  const handleSpecialChange = (id: string, value: string) => {
    if (effectiveIsLocked) return;
    setSpecialPredictions(prev => ({ ...prev, [id]: value }));
  };

  const handleMatchChange = (matchId: string, field: 'teamA' | 'teamB' | 'outcome', value: any) => {
    // Check if match is locked (1 hour before)
    // We will do this check in the UI, but also good to have it here if needed.
    setMatchPredictions(prev => {
      const current = prev[matchId] || { teamA: '', teamB: '', outcome: '' };
      return {
        ...prev,
        [matchId]: { ...current, [field]: value }
      };
    });
  };

  const savePredictions = async (lock: boolean = false) => {
    setSaving(true);
    setMessage(null);
    
    if (tourStepIndex === 3) {
      advanceTour();
    }
    
    try {
      const docRef = doc(db, "predictions", user.uid);
      await setDoc(docRef, {
        uid: user.uid,
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
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#1d4ed8', '#60a5fa', '#ffffff']
      });
    } catch (error) {
      console.error("Error saving predictions:", error);
      setMessage({ type: 'error', text: t('predictions.saveError') });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <CountdownBanner />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
        <div className="w-full md:w-auto flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 text-center md:text-left">{t('predictions.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-justify md:text-left">
            {effectiveIsLocked 
              ? t('predictions.lockedDesc') 
              : t('predictions.unlockedDesc')}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto mt-4 md:mt-0 shrink-0">
          {!effectiveIsLocked && !loading && (
            <>
              <Button 
                variant="outline" 
                onClick={() => savePredictions(false)}
                disabled={saving}
                className="w-full sm:w-auto flex items-center justify-center gap-2 save-draft-btn"
              >
                <Save className="w-4 h-4" /> {saving ? t('predictions.saving') : t('predictions.saveDraft')}
              </Button>
              <Button 
                onClick={() => setConfirmLock(true)}
                disabled={saving}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Lock className="w-4 h-4" /> {t('predictions.lockPredictions')}
              </Button>
            </>
          )}
          {effectiveIsLocked && !loading && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-md border border-green-200 w-full justify-center">
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

      {loading ? (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">{t('predictions.loading')}</div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-6">
            <Button variant={activeTab === 'groups' ? 'default' : 'outline'} onClick={() => setActiveTab('groups')}>Fase de Grupos</Button>
            <Button className="tab-specials" variant={activeTab === 'specials' ? 'default' : 'outline'} onClick={() => {
              setActiveTab('specials');
              if (tourStepIndex === 5) advanceTour();
            }}>Preguntas Especiales</Button>
            <Button variant={activeTab === 'matches' ? 'default' : 'outline'} onClick={() => setActiveTab('matches')}>Partidos Individuales</Button>
            <Button variant={activeTab === 'knockout' ? 'default' : 'outline'} onClick={() => setActiveTab('knockout')}>Fase Eliminatoria</Button>
          </div>

          {activeTab === 'groups' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-400 border-b dark:border-gray-700 pb-2 transition-colors duration-200">{t('predictions.groupStage')}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-justify transition-colors duration-200">{t('predictions.groupStageDesc')}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(groupPredictions)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([groupLetter, teams]) => (
            <Card key={groupLetter} className={`overflow-hidden border-t-4 border-t-blue-600 ${groupLetter === 'A' ? 'group-card-A' : ''}`}>
              <CardHeader className="bg-gray-50 dark:bg-gray-700/50 py-3 px-4 border-b dark:border-gray-700 transition-colors duration-200">
                <CardTitle className="text-lg text-gray-900 dark:text-gray-100">{t('predictions.group')} {groupLetter}</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => handleDragEnd(e, groupLetter)}
                  autoScroll={false}
                >
                  <SortableContext 
                    items={(teams as string[]) as any}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex flex-col gap-2">
                      {(teams as string[]).map((team, index) => (
                        <SortableItem key={team} id={team} team={team} index={index} disabled={effectiveIsLocked} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      )}

      {activeTab === 'specials' && (
      <div className="space-y-6 pt-2 special-questions-container">
        <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-400 border-b dark:border-gray-700 pb-2 transition-colors duration-200">{t('predictions.specialQuestions')}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-justify transition-colors duration-200">{t('predictions.specialQuestionsDesc')}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SPECIAL_QUESTIONS.map((q) => (
            <Card key={q.id} className="h-full flex flex-col">
              <CardContent className="p-5 flex flex-col h-full justify-between gap-4">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors duration-200">
                  {t(`specialQuestions.${q.id}`)}
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors duration-200 mt-auto"
                  placeholder={t('predictions.typeAnswer')}
                  value={specialPredictions[q.id] || ""}
                  onChange={(e) => handleSpecialChange(q.id, e.target.value)}
                  disabled={effectiveIsLocked}
                />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg text-center mt-6 shadow-sm transition-colors duration-200">
          <p className="text-blue-800 dark:text-blue-300 font-bold">{t('predictions.suggestions')}</p>
        </div>
      </div>
      )}

      {activeTab === 'knockout' && (
      <div className="space-y-6 pt-2 pb-12">
        <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-400 border-b dark:border-gray-700 pb-2">{t('predictions.knockoutStage')}</h2>
        
        {/* Bracket UI placeholder */}
        <div 
          className="flex gap-8 overflow-x-auto pb-8 pt-10 px-4 min-h-[800px] relative items-stretch cursor-grab active:cursor-grabbing select-none"
          onMouseDown={(e) => {
            const ele = e.currentTarget;
            ele.dataset.isDown = 'true';
            ele.dataset.startX = e.pageX.toString();
            ele.dataset.scrollLeft = ele.scrollLeft.toString();
          }}
          onMouseLeave={(e) => {
            e.currentTarget.dataset.isDown = 'false';
          }}
          onMouseUp={(e) => {
            e.currentTarget.dataset.isDown = 'false';
          }}
          onMouseMove={(e) => {
            const ele = e.currentTarget;
            if (ele.dataset.isDown !== 'true') return;
            e.preventDefault();
            const startX = parseFloat(ele.dataset.startX || '0');
            const scrollLeft = parseFloat(ele.dataset.scrollLeft || '0');
            const x = e.pageX;
            const walk = (x - startX) * 2; // Scroll-fast
            ele.scrollLeft = scrollLeft - walk;
          }}
          onTouchStart={(e) => {
            const ele = e.currentTarget;
            ele.dataset.isDown = 'true';
            ele.dataset.startX = e.touches[0].pageX.toString();
            ele.dataset.scrollLeft = ele.scrollLeft.toString();
          }}
          onTouchEnd={(e) => {
            e.currentTarget.dataset.isDown = 'false';
          }}
          onTouchMove={(e) => {
            const ele = e.currentTarget;
            if (ele.dataset.isDown !== 'true') return;
            const startX = parseFloat(ele.dataset.startX || '0');
            const scrollLeft = parseFloat(ele.dataset.scrollLeft || '0');
            const x = e.touches[0].pageX;
            const walk = (x - startX) * 2;
            ele.scrollLeft = scrollLeft - walk;
          }}
        >
          {['16avos', 'Octavos', 'Cuartos', 'Semifinal', 'Final'].map((stage, idx) => {
            const numMatches = Math.pow(2, 4 - idx);
            return (
              <div key={stage} className="flex flex-col justify-around min-w-[200px] relative">
                <h3 className="text-center font-bold text-gray-700 dark:text-gray-300 mb-4 absolute -top-10 w-full">{stage}</h3>
                {Array.from({ length: numMatches }).map((_, i) => (
                  <div key={i} className="relative py-2 flex flex-col justify-center flex-1">
                    <Card className={`bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm relative z-10 ${idx === 4 ? 'border-purple-500 border-2 shadow-purple-200 dark:shadow-purple-900/20' : ''}`}>
                      <CardHeader className={`p-2 pb-1 border-b dark:border-gray-700 ${idx === 4 ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                        <span className={`text-xs font-bold ${idx === 4 ? 'text-purple-700 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {idx === 4 ? 'FINAL' : `Partido ${Math.pow(2, 5) - Math.pow(2, 5 - idx) + i + 1}`}
                        </span>
                      </CardHeader>
                      <CardContent className="p-2 flex flex-col gap-1">
                        <div className="flex justify-between items-center border-b dark:border-gray-700 pb-1">
                          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Por definir</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Por definir</span>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Connectors */}
                    {idx < 4 && (
                      <>
                        <div className="absolute top-1/2 -right-4 w-4 border-t-2 border-gray-300 dark:border-gray-600"></div>
                        {i % 2 === 0 && (
                          <div className="absolute top-1/2 -right-4 w-0 border-r-2 border-gray-300 dark:border-gray-600 h-[50%]"></div>
                        )}
                        {i % 2 === 1 && (
                          <div className="absolute top-0 -right-4 w-0 border-r-2 border-gray-300 dark:border-gray-600 h-[50%]"></div>
                        )}
                      </>
                    )}
                    {idx > 0 && (
                      <div className="absolute top-1/2 -left-4 w-4 border-t-2 border-gray-300 dark:border-gray-600"></div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-lg text-center border-2 border-dashed border-gray-300 dark:border-gray-600 transition-colors duration-200 opacity-50">
          <p className="text-gray-600 dark:text-gray-300 font-medium">{t('predictions.tbd')}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('predictions.knockoutDesc')}</p>
        </div>
      </div>
      )}

      {activeTab === 'matches' && (
        <div className="space-y-6 pt-2">
          <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-400 border-b dark:border-gray-700 pb-2 transition-colors duration-200">Partidos Individuales</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-justify transition-colors duration-200 whitespace-pre-line">
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
              <div key={day} className="space-y-4">
                <div className="flex items-center justify-between border-b dark:border-gray-700 pb-2">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">{day}</h3>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => savePredictions(false)}
                    disabled={saving || effectiveIsLocked}
                    className="flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Guardar Día
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dayMatches.map((match) => {
                    const matchDate = new Date(match.date);
                    const isMatchLocked = Date.now() >= matchDate.getTime() - 60 * 60 * 1000;
                    const locked = isMatchLocked || effectiveIsLocked;
                    const pred = matchPredictions[match.id] || { teamA: '', teamB: '', outcome: '' };

                    return (
                      <Card key={match.id} className={`overflow-hidden ${isMatchLocked ? 'opacity-75 bg-gray-50 dark:bg-gray-800/50' : ''}`}>
                        <CardHeader className="bg-gray-50 dark:bg-gray-700/50 py-2 px-4 border-b dark:border-gray-700 flex flex-row justify-between items-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
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
                            <Button 
                              size="sm" 
                              variant={pred.outcome === 'A' ? 'default' : 'outline'} 
                              className={`flex-1 text-xs h-9 font-semibold ${pred.outcome === 'A' ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                              onClick={() => handleMatchChange(match.id, 'outcome', 'A')}
                              disabled={locked}
                            >
                              Gana Local
                            </Button>
                            <Button 
                              size="sm" 
                              variant={pred.outcome === 'DRAW' ? 'default' : 'outline'} 
                              className={`flex-1 text-xs h-9 font-semibold ${pred.outcome === 'DRAW' ? 'bg-gray-600 hover:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                              onClick={() => handleMatchChange(match.id, 'outcome', 'DRAW')}
                              disabled={locked}
                            >
                              Empate
                            </Button>
                            <Button 
                              size="sm" 
                              variant={pred.outcome === 'B' ? 'default' : 'outline'} 
                              className={`flex-1 text-xs h-9 font-semibold ${pred.outcome === 'B' ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                              onClick={() => handleMatchChange(match.id, 'outcome', 'B')}
                              disabled={locked}
                            >
                              Gana Visita
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </>
      )}

      {confirmLock && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl transition-colors duration-200">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('predictions.confirmLockTitle')}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{t('predictions.confirmLockDesc')}</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmLock(false)}>{t('predictions.cancel')}</Button>
              <Button 
                className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white" 
                onClick={() => { 
                  setConfirmLock(false); 
                  savePredictions(true); 
                }}
                disabled={saving}
              >
                {saving ? t('predictions.locking') : t('predictions.yesLock')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
