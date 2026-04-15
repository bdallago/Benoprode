import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { GROUPS, SPECIAL_QUESTIONS } from "../data";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { X, Lock, Unlock, CheckCircle2, XCircle, Shield, Swords } from "lucide-react";
import { Button } from "./ui/button";
import { useTranslation } from 'react-i18next';
import { getUserBadges } from "../lib/gamification";
import { DuelModal } from "./DuelModal";

interface UserPredictionsModalProps {
  userId: string;
  userName: string;
  userPoints?: number;
  onClose: () => void;
}

export function UserPredictionsModal({ userId, userName, userPoints = 0, onClose }: UserPredictionsModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<any>(null);
  const [results, setResults] = useState<any>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [duelData, setDuelData] = useState<any>(null);

  // Gamification states for the viewed user
  const [isLeagueCreatorOrMember, setIsLeagueCreatorOrMember] = useState(false);
  const [inBenoliga, setInBenoliga] = useState(false);
  const [hasPerfectGroup, setHasPerfectGroup] = useState(false);
  const [hasInvitedFriends, setHasInvitedFriends] = useState(false);

  const [userStats, setUserStats] = useState<any>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [predSnap, resSnap, leaguesSnap, userSnap] = await Promise.all([
          getDoc(doc(db, "predictions", userId)),
          getDoc(doc(db, "results", "actual")),
          import("firebase/firestore").then(m => m.getDocs(m.collection(db, "leagues"))),
          getDoc(doc(db, "users", userId))
        ]);

        if (predSnap.exists()) {
          setPredictions(predSnap.data());
        }
        if (resSnap.exists()) {
          setResults(resSnap.data());
        }
        if (userSnap.exists()) {
          setUserStats(userSnap.data());
        }

        // Calculate gamification states
        const leagues = leaguesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const userLeagues = leagues.filter((l: any) => l.members?.includes(userId) || l.createdBy === userId);
        
        setIsLeagueCreatorOrMember(userLeagues.length > 0);
        setInBenoliga(userLeagues.some((l: any) => l.name.toLowerCase().includes('benoliga') || l.id === 'benoliga'));

        if (predSnap.exists() && resSnap.exists()) {
          const preds = predSnap.data().groups || {};
          const res = resSnap.data().groups || {};
          
          let perfect = false;
          for (const group in res) {
            if (res[group] && preds[group] && JSON.stringify(res[group]) === JSON.stringify(preds[group])) {
              perfect = true;
              break;
            }
          }
          setHasPerfectGroup(perfect);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full shadow-xl max-h-[90vh] overflow-y-auto transition-colors duration-200">
          <div className="text-center py-10 text-gray-900 dark:text-gray-100">{t('userPredictions.loading', { userName })}</div>
        </div>
      </div>
    );
  }

  // Calculate badges for the selected user
  const userBadges = getUserBadges(userPoints, userStats);

  if (!predictions) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl transition-colors duration-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('userPredictions.title', { userName })}</h3>
            <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
          </div>
          
          {userBadges.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Medallas Obtenidas
              </h4>
              <div className="flex flex-wrap gap-2">
                {userBadges.map(badge => (
                  <div 
                    key={badge?.id} 
                    className="relative flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1.5 rounded-md text-sm border border-gray-200 dark:border-gray-600 cursor-pointer"
                    onClick={() => setActiveTooltip(activeTooltip === badge?.id ? null : badge?.id)}
                  >
                    <span>{badge?.icon}</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">{badge?.name}</span>
                    {activeTooltip === badge?.id && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                        <div className="font-bold mb-1">{badge?.name}</div>
                        <div>{badge?.description}</div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-gray-600 dark:text-gray-300 py-4 text-center">{t('userPredictions.noPredictions')}</p>
          <div className="flex justify-end mt-4">
            <Button onClick={onClose}>{t('userPredictions.close')}</Button>
          </div>
        </div>
      </div>
    );
  }

  const isLocked = predictions.isLocked;
  const groups = predictions.groups || GROUPS;
  const specials = predictions.specials || {};

  const getGroupStatus = (groupLetter: string, predictedTeams: string[]) => {
    if (!results || !results.groups || !results.groups[groupLetter]) return null;
    const actualTeams = results.groups[groupLetter];
    
    // Check if actual results are actually filled
    if (!actualTeams || actualTeams.length === 0 || actualTeams.every((t: string) => !t)) return null;
    
    let exactMatches = 0;
    for (let i = 0; i < 4; i++) {
      if (predictedTeams[i] === actualTeams[i]) {
        exactMatches++;
      }
    }

    const isPerfect = exactMatches === 4;
    const totalPoints = exactMatches + (isPerfect ? 2 : 0);
    
    return {
      isPerfect,
      exactMatches,
      totalPoints,
      actualTeams
    };
  };

  const getSpecialStatus = (questionId: string, answer: string) => {
    if (!results || !results.specials || !results.specials[questionId]) return null;
    const actualAnswer = results.specials[questionId];
    if (!actualAnswer || !answer) return null;
    
    // Simple string matching (case insensitive)
    if (answer.trim().toLowerCase() === actualAnswer.trim().toLowerCase()) {
      return { correct: true, points: 10 }; 
    }
    return { correct: false, points: 0 };
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full shadow-xl max-h-[90vh] flex flex-col overflow-hidden transition-colors duration-200">
        <div className="flex justify-between items-start p-6 border-b dark:border-gray-700 shrink-0 bg-white dark:bg-gray-800 z-10 sticky top-0 transition-colors duration-200">
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('userPredictions.title', { userName })}</h3>
            <div className="flex items-center gap-2 mt-2">
              {isLocked ? (
                <span className="flex items-center gap-1 text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-md border border-green-200 dark:border-green-800">
                  <Lock className="w-3 h-3" /> {t('userPredictions.locked')}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md border border-blue-200 dark:border-blue-800">
                  <Unlock className="w-3 h-3" /> {t('userPredictions.draft')}
                </span>
              )}
            </div>
            
            {userBadges.length > 0 && (
              <div className="mt-4">
                <div className="flex flex-wrap gap-2">
                  {userBadges.map(badge => (
                    <div 
                      key={badge?.id} 
                      className="relative flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1.5 rounded-md text-sm border border-gray-200 dark:border-gray-600 cursor-pointer"
                      onClick={() => setActiveTooltip(activeTooltip === badge?.id ? null : badge?.id)}
                    >
                      <span>{badge?.icon}</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">{badge?.name}</span>
                      {activeTooltip === badge?.id && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
                          <div className="font-bold mb-1">{badge?.name}</div>
                          <div>{badge?.description}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 bg-gray-100 dark:bg-gray-700 rounded-full ml-4"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8">
          <div>
            <h4 className="text-xl font-bold text-blue-900 dark:text-blue-400 mb-4">{t('userPredictions.groupStage')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(groups)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([groupLetter, teams]) => {
                const groupStatus = getGroupStatus(groupLetter, teams as string[]);
                
                return (
                  <Card key={groupLetter} className="overflow-hidden border-t-4 border-t-blue-600">
                    <CardHeader className="bg-gray-50 dark:bg-gray-700/50 py-2 px-4 border-b dark:border-gray-700 flex flex-row justify-between items-center transition-colors duration-200">
                      <CardTitle className="text-md">{t('userPredictions.group')} {groupLetter}</CardTitle>
                      {groupStatus && (
                        <span className={`text-sm font-bold ${groupStatus.totalPoints > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          +{groupStatus.totalPoints} pts
                        </span>
                      )}
                    </CardHeader>
                    <CardContent className="p-0">
                      <ul className="divide-y dark:divide-gray-700">
                        {(teams as string[]).map((team, index) => {
                          let bgColor = "bg-white dark:bg-gray-800";
                          let textColor = "text-gray-900 dark:text-gray-100";
                          let icon: React.ReactNode = null;

                          if (groupStatus) {
                            const exactPosition = groupStatus.actualTeams[index] === team;

                            if (exactPosition) {
                              bgColor = "bg-green-50 dark:bg-green-900/20";
                              textColor = "text-green-900 dark:text-green-300";
                              icon = (
                                <>
                                  <span className="text-sm font-bold text-green-600 dark:text-green-400">+1 pt</span>
                                  <span title={t('userPredictions.exactPosition')}>
                                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  </span>
                                </>
                              );
                            } else {
                              bgColor = "bg-red-50 dark:bg-red-900/20";
                              textColor = "text-red-900 dark:text-red-300";
                              icon = (
                                <>
                                  <span className="text-sm font-bold text-red-500 dark:text-red-400">+0 pts</span>
                                  <span title={t('userPredictions.incorrectPosition')}>
                                    <XCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
                                  </span>
                                </>
                              );
                            }
                          }

                          return (
                            <li key={`${groupLetter}-${index}`} className={`p-3 flex items-center justify-between transition-colors duration-200 ${bgColor}`}>
                              <div className="flex items-center gap-3">
                                <span className={`font-bold w-5 text-center ${index < 2 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                  {index + 1}
                                </span>
                                <span className={`font-medium ${textColor}`}>{t(`teams.${team}`)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {icon}
                                {auth.currentUser && auth.currentUser.uid !== userId && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                                    title="Retar predicción"
                                    onClick={() => setDuelData({
                                      matchId: `group_${groupLetter}_pos_${index}`,
                                      matchData: { teamA: team, teamB: 'Otro' }, // Mock for now, ideally we challenge specific matches
                                      challengedPrediction: { outcome: 'A', teamA: 1, teamB: 0 } // Mock
                                    })}
                                  >
                                    <Swords className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                      {groupStatus && groupStatus.isPerfect && (
                         <div className="bg-green-100 dark:bg-green-900/40 p-2 text-center text-sm font-bold text-green-800 dark:text-green-300 border-t border-green-200 dark:border-green-800 transition-colors duration-200">
                           {t('userPredictions.perfectGroup')}
                         </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="text-xl font-bold text-blue-900 dark:text-blue-400 mb-4">{t('userPredictions.specialQuestions')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SPECIAL_QUESTIONS.map((q) => {
                const answer = specials[q.id] || t('userPredictions.noAnswer');
                const status = getSpecialStatus(q.id, answer);
                let bgColor = "bg-gray-50 dark:bg-gray-700/50";
                let borderColor = "border-gray-200 dark:border-gray-700";
                
                if (status) {
                  bgColor = status.correct ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20";
                  borderColor = status.correct ? "border-green-200 dark:border-green-800" : "border-red-200 dark:border-red-800";
                }

                return (
                  <Card key={q.id} className={`border transition-colors duration-200 ${borderColor} ${bgColor}`}>
                    <CardContent className="p-4">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t(`specialQuestions.${q.id}`)}</p>
                      <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded border dark:border-gray-700 transition-colors duration-200">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{answer}</span>
                        {status && (
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${status.correct ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                              +{status.points} pts
                            </span>
                            {status.correct ? <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" /> : <XCircle className="w-4 h-4 text-red-500 dark:text-red-400" />}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      {duelData && (
        <DuelModal 
          challengedId={userId}
          challengedName={userName}
          matchId={duelData.matchId}
          matchData={duelData.matchData}
          challengedPrediction={duelData.challengedPrediction}
          onClose={() => setDuelData(null)}
        />
      )}
    </div>
  );
}
