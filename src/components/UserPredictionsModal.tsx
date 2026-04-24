import { useState, useEffect } from "react";
import Link from "next/link";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase";
import { GROUPS, SPECIAL_QUESTIONS } from "../data";
import matchesData from "../lib/matches.json";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { X, Lock, Unlock, CheckCircle2, XCircle, Shield, Swords, AlertCircle, UserPlus, Check } from "lucide-react";
import { Button } from "./ui/button";
import { useTranslation } from 'react-i18next';
import { getUserBadges, BADGES } from "../lib/gamification";
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
  const [currentUserPredictions, setCurrentUserPredictions] = useState<any>(null);
  const [results, setResults] = useState<any>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [duelData, setDuelData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'groups' | 'matches' | 'knockout' | 'specials'>('groups');

  const [isFriend, setIsFriend] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [userStats, setUserStats] = useState<any>({});

  const handleAddFriend = async () => {
    if (!auth.currentUser || requestSent || isFriend || auth.currentUser.uid === userId) return;

    try {
      await addDoc(collection(db, "friendRequests"), {
        fromUserId: auth.currentUser.uid,
        toUserId: userId,
        status: "pending",
        createdAt: serverTimestamp()
      });
      
      await addDoc(collection(db, "notifications"), {
        userId: userId,
        type: "friend_request",
        title: "Nueva solicitud de amistad",
        message: `${auth.currentUser.displayName || "Un usuario"} quiere añadirte como amigo.`,
        read: false,
        createdAt: new Date().toISOString(),
        actionUrl: `/profile`
      });

      setRequestSent(true);
    } catch (err) {
      console.error("Error sending friend request", err);
      alert("Hubo un error al enviar la solicitud.");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const promises = [
          getDoc(doc(db, "predictions", userId)),
          getDoc(doc(db, "results", "actual")),
          import("firebase/firestore").then(m => m.getDocs(m.collection(db, "leagues"))),
          getDoc(doc(db, "users", userId))
        ];

        let isFriendsWithUser = false;
        let hasPendingRequest = false;
        if (auth.currentUser) {
           promises.push(getDoc(doc(db, "predictions", auth.currentUser.uid)));
           
           if (auth.currentUser.uid !== userId) {
               const firestoreHelpers = await import("firebase/firestore");
               const { query, collection, where, getDocs } = firestoreHelpers;
               
               const q3 = query(
                 collection(db, 'friendships'),
                 where('user1Id', 'in', [auth.currentUser.uid, userId])
               );
               const friendsSnap = await getDocs(q3);
               friendsSnap.docs.forEach(d => {
                  if ((d.data().user1Id === auth.currentUser!.uid && d.data().user2Id === userId) ||
                      (d.data().user1Id === userId && d.data().user2Id === auth.currentUser!.uid)) {
                      isFriendsWithUser = true;
                  }
               });
               setIsFriend(isFriendsWithUser);

               const qRequest = query(
                 collection(db, 'friendRequests'),
                 where('fromUserId', '==', auth.currentUser.uid),
                 where('toUserId', '==', userId),
                 where('status', '==', 'pending')
               );
               const requestSnap = await getDocs(qRequest);
               if (!requestSnap.empty) {
                 hasPendingRequest = true;
               }
               setRequestSent(hasPendingRequest);
           }
        }

        const resolved = await Promise.all(promises);
        const predSnap = resolved[0] as any;
        const resSnap = resolved[1] as any;
        const leaguesSnap = resolved[2] as any;
        const userSnap = resolved[3] as any;
        const currentUserPredSnap = resolved.length > 4 ? resolved[4] as any : null;

        if (predSnap.exists()) {
          setPredictions(predSnap.data());
        }
        if (currentUserPredSnap && currentUserPredSnap.exists()) {
          setCurrentUserPredictions(currentUserPredSnap.data());
        }
        if (resSnap.exists()) {
          setResults(resSnap.data());
        }
        if (userSnap.exists()) {
          setUserStats(userSnap.data());
        }

        const leagues = leaguesSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        const userLeagues = leagues.filter((l: any) => l.members?.includes(userId) || l.createdBy === userId);
        
        setUserStats((prev: any) => ({
          ...prev,
          inBenoliga: userLeagues.some((l: any) => l.name.toLowerCase().includes('beno') || l.id === 'benoliga'),
          inPrivateLeague: userLeagues.length > 0
        }));

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
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={onClose}>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full shadow-xl max-h-[90vh] overflow-y-auto transition-colors duration-200" onClick={(e) => e.stopPropagation()}>
          <div className="text-center py-10 text-gray-900 dark:text-gray-100">{t('userPredictions.loading', { userName })}</div>
        </div>
      </div>
    );
  }

  const userBadgeIds = userStats.earnedBadges || [];
  const userBadges = userBadgeIds.map((id: string) => BADGES.find((b: any) => b.id === id)).filter(Boolean);

  if (!predictions) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={onClose}>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl transition-colors duration-200" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1 flex flex-col items-center sm:items-start gap-2">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center sm:text-left">{t('userPredictions.title', { userName })}</h3>
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                <Link href={`/profile/${userId}`} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-full font-semibold hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors shrink-0">
                  Ver Perfil
                </Link>
                {auth.currentUser && auth.currentUser.uid !== userId && (
                  isFriend ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 shrink-0">
                      Amigos
                    </span>
                  ) : requestSent ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1.5 rounded border border-amber-200 dark:border-amber-800 shrink-0" title="Solicitud enviada">
                      Solicitud pendiente
                    </span>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 gap-2 shrink-0 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                      onClick={(e) => { e.preventDefault(); handleAddFriend(); }}
                    >
                      <UserPlus className="w-4 h-4" /> Añadir amigo
                    </Button>
                  )
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-gray-500 dark:text-gray-200 p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full shrink-0 transition-colors ml-4">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-600 dark:text-gray-300 py-4 text-center">{t('userPredictions.noPredictions')}</p>
          <div className="flex justify-end mt-4">
            <Button onClick={onClose}>{t('userPredictions.close')}</Button>
          </div>
        </div>
      </div>
    );
  }

  const isLocked = predictions.isLocked;
  // Use `isLocked` as the lock status of the viewed user
  // Can only challenge if BOTH users have locked their predictions and are friends
  const canChallenge = auth.currentUser && auth.currentUser.uid !== userId && isLocked && currentUserPredictions?.isLocked && isFriend;

  const groups = predictions.groups || GROUPS;
  const specials = predictions.specials || {};
  const matchPredictions = predictions.matches || {};
  const knockoutPredictions = predictions.knockouts || {};

  const getGroupStatus = (groupLetter: string, predictedTeams: string[]) => {
    if (!results || !results.groups || !results.groups[groupLetter]) return null;
    const actualTeams = results.groups[groupLetter];
    if (!actualTeams || actualTeams.length === 0 || actualTeams.every((t: string) => !t)) return null;
    
    let exactMatches = 0;
    for (let i = 0; i < 4; i++) {
      if (predictedTeams[i] === actualTeams[i]) {
        exactMatches++;
      }
    }

    const isPerfect = exactMatches === 4;
    return { isPerfect, exactMatches, totalPoints: exactMatches + (isPerfect ? 2 : 0), actualTeams };
  };

  const getSpecialStatus = (questionId: string, answer: string) => {
    if (!results || !results.specials || !results.specials[questionId]) return null;
    const actualAnswer = results.specials[questionId];
    if (!actualAnswer || !answer) return null;
    if (answer.trim().toLowerCase() === actualAnswer.trim().toLowerCase()) return { correct: true, points: 10 }; 
    return { correct: false, points: 0 };
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full shadow-xl max-h-[90vh] overflow-y-auto transition-colors duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="relative flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-t-lg transition-colors duration-200">
          <div className="flex flex-col items-center gap-3 w-full">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1 text-center">{t('userPredictions.title', { userName })}</h3>
            
            <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3">
              <Link href={`/profile/${userId}`} className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full font-bold hover:bg-blue-200 dark:hover:bg-blue-800/60 transition-colors shrink-0">
                Ver Perfil
              </Link>
              
              {auth.currentUser && auth.currentUser.uid !== userId && (
                isFriend ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 shrink-0">
                    Amigos
                  </span>
                ) : requestSent ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1.5 rounded border border-amber-200 dark:border-amber-800 shrink-0" title="Solicitud enviada">
                    Solicitud pendiente
                  </span>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 gap-2 shrink-0 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                    onClick={(e) => { e.preventDefault(); handleAddFriend(); }}
                  >
                    <UserPlus className="w-4 h-4" /> Añadir amigo
                  </Button>
                )
              )}

              {isLocked ? (
                <span className="flex items-center gap-1 text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-md border border-green-200 dark:border-green-800 shrink-0">
                  <Lock className="w-3 h-3" /> {t('userPredictions.locked')}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md border border-blue-200 dark:border-blue-800 shrink-0">
                  <Unlock className="w-3 h-3" /> {t('userPredictions.draft')}
                </span>
              )}
            </div>
            
            {userBadges.length > 0 && (
              <div className="flex flex-row flex-wrap items-center justify-center gap-2 mt-1 relative z-50">
                {userBadges.map((badge: any) => (
                  <div 
                    key={badge?.id} 
                    className="relative flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1.5 rounded-md text-sm border border-gray-200 dark:border-gray-600 cursor-pointer w-max"
                    onClick={() => setActiveTooltip(activeTooltip === badge?.id ? null : badge?.id)}
                  >
                    <span>{badge?.icon}</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">{badge?.name}</span>
                    {activeTooltip === badge?.id && (
                      <div className="absolute top-[120%] left-1/2 -translate-x-1/2 mt-2 w-[220px] max-w-[85vw] p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-[100] break-words whitespace-normal text-left">
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
                        <div className="font-bold mb-1">{badge?.name}</div>
                        <div>{badge?.description}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-200 p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full shrink-0 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-4 bg-white dark:bg-gray-800">
           <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-2 pb-0">
             <Button variant={activeTab === 'groups' ? 'default' : 'outline'} onClick={() => setActiveTab('groups')} className="flex-1 sm:flex-none text-xs sm:text-sm whitespace-normal sm:whitespace-nowrap h-auto py-2">Fase de Grupos</Button>
             <Button variant={activeTab === 'matches' ? 'default' : 'outline'} onClick={() => setActiveTab('matches')} className="flex-1 sm:flex-none text-xs sm:text-sm whitespace-normal sm:whitespace-nowrap h-auto py-2">Partidos Individuales</Button>
             <Button variant={activeTab === 'knockout' ? 'default' : 'outline'} onClick={() => setActiveTab('knockout')} className="flex-1 sm:flex-none text-xs sm:text-sm whitespace-normal sm:whitespace-nowrap h-auto py-2">Fase Eliminatoria</Button>
             <Button variant={activeTab === 'specials' ? 'default' : 'outline'} onClick={() => setActiveTab('specials')} className="flex-1 sm:flex-none text-xs sm:text-sm whitespace-normal sm:whitespace-nowrap h-auto py-2">Preguntas Especiales</Button>
           </div>
        </div>

        <div className="px-6 pb-6 pt-4 space-y-8 bg-white dark:bg-gray-800">
          {!canChallenge && auth.currentUser && auth.currentUser.uid !== userId && (
             <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-sm text-blue-800 dark:text-blue-300 flex items-center justify-center sm:justify-start gap-2 border-0">
                <AlertCircle className="w-4 h-4 shrink-0" /> 
                <span>Para poder retar a este jugador, ambos deben haber fijado sus predicciones y ser amigos.</span>
             </div>
          )}

          {activeTab === 'groups' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([groupLetter, teams]) => {
                  const groupStatus = getGroupStatus(groupLetter, teams as string[]);
                  return (
                    <Card key={groupLetter} className="overflow-hidden border-t-4 border-t-blue-600">
                      <CardHeader className="bg-gray-50 dark:bg-gray-700/50 py-2 px-4 border-b dark:border-gray-700 flex flex-row justify-between items-center transition-colors duration-200">
                        <CardTitle className="text-md flex items-center justify-between w-full">
                          <span>{t('userPredictions.group')} {groupLetter}</span>
                          {canChallenge && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-blue-600 border-blue-200"
                              title="Retar grupo completo"
                              onClick={() => setDuelData({ 
                                duelType: 'group_complete', 
                                matchId: `group_${groupLetter}_complete`, 
                                matchData: { groupLetter }, 
                                challengedPrediction: { teams },
                                myPrediction: { teams: currentUserPredictions?.groups?.[groupLetter] || [] }
                              })}
                            >
                              <Swords className="w-4 h-4 mr-1" /> Retar
                            </Button>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <ul className="divide-y dark:divide-gray-700">
                          {(teams as string[]).map((team, index) => {
                            return (
                              <li key={`${groupLetter}-${index}`} className="p-3 flex items-center justify-between transition-colors duration-200 bg-white dark:bg-gray-800">
                                <div className="flex items-center gap-3">
                                  <span className={`font-bold w-5 text-center ${index < 2 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-300'}`}>
                                    {index + 1}
                                  </span>
                                  <span className="font-medium text-gray-900 dark:text-gray-100">{t(`teams.${team}`)}</span>
                                </div>
                                {canChallenge && (
                                  <Button 
                                    variant="ghost" size="sm" className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800" title="Retar predicción"
                                    onClick={() => setDuelData({ 
                                      duelType: 'group_position', 
                                      matchId: `group_${groupLetter}_pos_${index + 1}`, 
                                      matchData: { groupLetter, position: index + 1 }, 
                                      challengedPrediction: { team },
                                      myPrediction: { team: currentUserPredictions?.groups?.[groupLetter]?.[index] || '' }
                                    })}
                                  >
                                    <Swords className="w-4 h-4" />
                                  </Button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'matches' && (
            <div className="space-y-6">
              {matchesData.map((match) => {
                const pred = matchPredictions[match.id];
                if (!pred) return null;
                
                return (
                  <Card key={match.id} className="overflow-hidden border">
                    <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2 flex-1 justify-end">
                           <span className="font-semibold text-gray-900 dark:text-gray-100">{match.teamA}</span>
                           <span className="text-xl font-bold px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">{pred.teamA !== '' ? pred.teamA : '-'}</span>
                        </div>
                        <span className="text-gray-500 font-bold">VS</span>
                        <div className="flex items-center gap-2 flex-1 justify-start">
                           <span className="text-xl font-bold px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">{pred.teamB !== '' ? pred.teamB : '-'}</span>
                           <span className="font-semibold text-gray-900 dark:text-gray-100">{match.teamB}</span>
                        </div>
                      </div>
                      
                      {canChallenge && (
                        <Button 
                          size="sm" title="Retar partido" className="bg-blue-100 text-blue-700 hover:bg-blue-200 w-full md:w-auto mt-2 md:mt-0"
                          onClick={() => setDuelData({ 
                            duelType: 'match', 
                            matchId: match.id, 
                            matchData: match, 
                            challengedPrediction: pred,
                            myPrediction: currentUserPredictions?.matches?.[match.id] || { teamA: '', teamB: '', outcome: '' }
                          })}
                        >
                          <Swords className="w-4 h-4 mr-2" /> Retar
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              {Object.keys(matchPredictions).length === 0 && (
                <div className="text-center text-gray-500 py-10">No hay predicciones de partidos individuales guardadas.</div>
              )}
            </div>
          )}

          {activeTab === 'specials' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SPECIAL_QUESTIONS.map((q) => {
                const answer = specials[q.id] || t('userPredictions.noAnswer');
                return (
                  <Card key={q.id} className="border transition-colors duration-200">
                    <CardContent className="p-4">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t(`specialQuestions.${q.id}`)}</p>
                      <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{answer}</span>
                        {canChallenge && specials[q.id] && (
                           <Button 
                             variant="ghost" size="sm" className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 shadow-sm" title="Retar predicción"
                             onClick={() => setDuelData({ 
                               duelType: 'special', 
                               matchId: q.id, 
                               matchData: { questionTitle: t(`specialQuestions.${q.id}`) }, 
                               challengedPrediction: { answer },
                               myPrediction: { answer: currentUserPredictions?.specials?.[q.id] || '' }
                             })}
                           >
                             <Swords className="w-4 h-4" />
                           </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          
          {activeTab === 'knockout' && (
            <div className="space-y-4">
              {['octavos', 'cuartos', 'semis', 'final'].map((phaseKey) => {
                 const phaseLabels: Record<string, string> = {
                   'octavos': 'Octavos de Final',
                   'cuartos': 'Cuartos de Final',
                   'semis': 'Semifinal',
                   'final': 'Final'
                 };
                 const matches = knockoutPredictions[phaseKey] || [];
                 if (matches.length === 0) return null;
                 
                 return (
                    <div key={phaseKey}>
                      <h4 className="font-bold text-lg text-blue-900 dark:text-blue-400 mb-2 mt-4 border-b pb-1 dark:border-gray-700">{phaseLabels[phaseKey]}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                         {matches.map((m: any, idx: number) => (
                           <div key={idx} className="flex flex-col bg-gray-50 dark:bg-gray-800 p-3 rounded-md border dark:border-gray-700 text-sm">
                             <div className="text-gray-500 dark:text-gray-200 text-xs mb-1">{m.label}</div>
                             <div className="flex items-center justify-between font-medium">
                               <span className="text-gray-900 dark:text-gray-100">{m.teamA} vs {m.teamB || 'TBD'}</span>
                               {canChallenge && m.winner && (
                                 <Button 
                                   variant="outline" size="sm" className="h-7 text-blue-600 border-blue-200" title="Retar ganador"
                                   onClick={() => setDuelData({ 
                                     duelType: 'knockout', 
                                     matchId: `knockout_${phaseKey}_${idx}`, 
                                     matchData: { phase: phaseKey }, 
                                     challengedPrediction: { team: m.winner },
                                     myPrediction: { team: currentUserPredictions?.knockouts?.[phaseKey]?.[idx]?.winner || '' }
                                   })}
                                 >
                                   <Swords className="w-4 h-4 mr-1" /> Retar 
                                 </Button>
                               )}
                             </div>
                             {m.winner && (
                               <div className="mt-2 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/10 px-2 py-1 rounded inline-block">
                                 Avanza: font-bold {m.winner}
                               </div>
                             )}
                           </div>
                         ))}
                      </div>
                    </div>
                 );
              })}
              {Object.keys(knockoutPredictions).length === 0 && (
                <div className="text-center text-gray-500 py-10">No hay predicciones de fase eliminatoria guardadas.</div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {duelData && (
        <DuelModal 
          challengedId={userId}
          challengedName={userName}
          matchId={duelData.matchId}
          matchData={duelData.matchData}
          duelType={duelData.duelType}
          challengedPrediction={duelData.challengedPrediction}
          myPrediction={duelData.myPrediction}
          onClose={() => setDuelData(null)}
        />
      )}
    </div>
  );
}
