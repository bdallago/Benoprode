import { useEffect, useState, useRef } from "react";
import { User } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, doc, getDoc, limit, getCountFromServer, where } from "firebase/firestore";
import { db } from "../firebase";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Trophy, Medal, User as UserIcon, Star, Shield, Info, CheckCircle2, BarChart2, X } from "lucide-react";
import { CountdownBanner } from "../components/CountdownBanner";
import { UserPredictionsModal } from "../components/UserPredictionsModal";
import { useTranslation } from 'react-i18next';
import { getUserLevel, getUserBadges, BADGES } from "../lib/gamification";
import { motion, AnimatePresence } from "framer-motion";
import { GlobalLeaderboard } from "../components/GlobalLeaderboard";

interface Player {
  uid: string;
  displayName: string;
  photoURL: string;
  totalPoints: number;
  role?: string;
  earnedBadges?: string[];
}

export default function Dashboard({ user }: { user: User }) {
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<{uid: string, name: string, points: number} | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  
  const [isAllBadgesModalOpen, setIsAllBadgesModalOpen] = useState(false);
  
  // Gamification states
  const [isLeagueCreatorOrMember, setIsLeagueCreatorOrMember] = useState(false);
  const [inBenoliga, setInBenoliga] = useState(false);
  const [hasPerfectGroup, setHasPerfectGroup] = useState(false);
  const [hasInvitedFriends, setHasInvitedFriends] = useState(false);

  const { t } = useTranslation();

  const [userStats, setUserStats] = useState<any>({});

  const [totalPlayers, setTotalPlayers] = useState(0);
  const [exactRank, setExactRank] = useState(0);

  useEffect(() => {
    // 2. FETCH EXACT RANK AND TOTAL USERS EFFICIENTLY
    const fetchExactRank = async () => {
      try {
        const myDoc = await getDoc(doc(db, "users", user.uid));
        const pts = myDoc.data()?.totalPoints || 0;
        
        // 2 parallel queries: Count total users, Count users with MORE points than me
        const [totalSnap, rankSnap] = await Promise.all([
          getCountFromServer(collection(db, "users")),
          getCountFromServer(query(collection(db, "users"), where("totalPoints", ">", pts)))
        ]);
        
        setTotalPlayers(totalSnap.data().count);
        setExactRank(rankSnap.data().count + 1); // If 5 people have more points, I am rank 6
      } catch (error) {
        console.error("Error calculating exact rank", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExactRank();

    // Fetch user document for referrals and stats
    const unsubscribeUser = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        setUserStats((prev: any) => ({ ...prev, ...data }));
        setHasInvitedFriends((data.referralsCount || 0) > 0);
        setIsLeagueCreatorOrMember(data.inPrivateLeague || false);
        setInBenoliga(data.inBenoliga || false);
      }
    });

    // Fetch user predictions and actual results to check for perfect group
    // This is a simplified check. A real implementation might require a cloud function to evaluate this efficiently.
    const checkPerfectGroup = async () => {
      try {
        const [predsSnap, resultsSnap] = await Promise.all([
          import("firebase/firestore").then(m => m.getDoc(m.doc(db, "predictions", user.uid))),
          import("firebase/firestore").then(m => m.getDoc(m.doc(db, "results", "actual")))
        ]);

        if (predsSnap.exists() && resultsSnap.exists()) {
          const preds = predsSnap.data().groups || {};
          const results = resultsSnap.data().groups || {};
          
          let perfect = false;
          for (const group in results) {
            if (results[group] && preds[group] && JSON.stringify(results[group]) === JSON.stringify(preds[group])) {
              perfect = true;
              break;
            }
          }
          setHasPerfectGroup(perfect);
        }
      } catch (error) {
        console.error("Error checking perfect group:", error);
      }
    };

    checkPerfectGroup();

    return () => {
      unsubscribeUser();
    };
  }, [user.uid]);

  const myData = userStats;
  const myPoints = myData?.totalPoints || 0;
  // If exactRank isn't loaded, fake it to 0 or 1
  const myRank = exactRank > 0 ? exactRank : 1;
  const userLevel = getUserLevel(myPoints);
  
  const userBadgeIds = myData?.earnedBadges || userStats?.earnedBadges || [];
  const userBadges = userBadgeIds.map((id: string) => BADGES.find((b: any) => b.id === id)).filter(Boolean);

  // Top 10% / Top 30% Logic
  const percentile = totalPlayers > 1 ? (myRank / totalPlayers) * 100 : 100;
  
  const rankBadges = [];
  if (percentile <= 10 && myPoints > 0) {
    rankBadges.push({ text: "Top 10% Mundial 🏆", className: "bg-amber-500/20 text-amber-200 border border-amber-500/50" });
  } else if (percentile <= 30 && myPoints > 0) {
    rankBadges.push({ text: "Top 30% Mundial 🥈", className: "bg-slate-300/20 text-slate-100 border border-slate-300/50" });
  }

  return (
    <div id="tutorial-ranking-board" className="max-w-6xl mx-auto space-y-6">
      <CountdownBanner />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white border-none h-full shadow-lg">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-200 font-medium mb-1 uppercase tracking-wider text-sm">{t('dashboard.points')}</p>
                  <h2 className="text-6xl font-black tracking-tighter">{myPoints}</h2>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                  <Trophy className="h-12 w-12 text-white" />
                </div>
              </div>
              <p className="text-sm text-blue-200 mt-6 opacity-80">Los puntos se calculan automáticamente según tus aciertos.</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-indigo-600 to-purple-800 text-white border-none h-full shadow-lg">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-200 font-medium mb-1 uppercase tracking-wider text-sm">{t('dashboard.globalRank')}</p>
                  <h2 className="text-6xl font-black tracking-tighter">#{myRank || "-"}</h2>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                  <BarChart2 className="h-12 w-12 text-indigo-200" />
                </div>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className={`px-4 py-1.5 rounded-full text-sm font-bold bg-white/20 text-white backdrop-blur-sm`}>
                  Nivel: {userLevel.name}
                </span>
                {rankBadges.map((badge, index) => (
                  <span key={index} className={`px-4 py-1.5 rounded-full text-sm font-bold backdrop-blur-sm shadow-sm ${badge.className}`}>
                    {badge.text}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader className="bg-blue-50 dark:bg-blue-900/20 border-b border-gray-100 dark:border-gray-700 pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-blue-900 dark:text-blue-400">
              <Medal className="w-5 h-5" /> Tus Medallas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-2 text-gray-600 dark:text-gray-200 font-medium">
                  <span>Progreso de medallas</span>
                  <span>{userBadges.length} de {BADGES.length} ({Math.round((userBadges.length / BADGES.length) * 100)}%)</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-6">
                  <div className="bg-blue-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${(userBadges.length / BADGES.length) * 100}%` }}></div>
                </div>
                
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4">Medallas Obtenidas</h3>
                <div className="flex flex-wrap gap-4">
                  {userBadges.length > 0 ? userBadges.map((badge: any) => badge && (
                    <div key={badge.id} className="relative group cursor-pointer" onClick={() => setActiveTooltip(activeTooltip === badge.id ? null : badge.id)}>
                      <div className="w-16 h-16 rounded-xl bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-800 flex items-center justify-center text-4xl shadow-sm hover:border-blue-400 dark:hover:border-blue-500 hover:scale-105 transition-all">
                        {badge.icon}
                      </div>
                      {/* Tooltip */}
                      {activeTooltip === badge.id && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl z-50 text-center">
                          <div className="font-bold text-blue-300 mb-1">{badge.name}</div>
                          <div className="text-gray-300 text-xs">{badge.description}</div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      )}
                    </div>
                  )) : (
                    <p className="text-gray-500 dark:text-gray-200 text-sm italic">Aún no has obtenido ninguna medalla. ¡Participá para ganar la primera!</p>
                  )}
                </div>
              </div>
              
              <div className="w-full md:w-80 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center items-start gap-2 mb-4">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Todas las Medallas</h3>
                  <button 
                    onClick={() => setIsAllBadgesModalOpen(true)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium text-left"
                  >
                    Ver todas las medallas
                  </button>
                </div>
                <div 
                  className="space-y-4 cursor-pointer"
                  onClick={() => setIsAllBadgesModalOpen(true)}
                >
                  {BADGES.filter(b => !userBadgeIds.includes(b.id)).slice(0, 4).map(badge => {
                    const isSecret = badge.isSecret;
                    return (
                      <div key={badge.id} className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 flex items-center justify-center text-2xl grayscale">
                          {isSecret ? <span className="text-gray-500 font-bold">?</span> : badge.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-700 dark:text-gray-300 truncate">{isSecret ? 'Medalla misteriosa' : badge.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-200 line-clamp-2">{isSecret ? 'Sabrás su contenido cuando la obtengas' : badge.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="space-y-4 leaderboard-container">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('dashboard.globalLeaderboard')}</h2>
        <p className="text-sm text-gray-500">Competí contra todos los usuarios registrados en el prode. Acá vas a ver la posición de cada jugador a nivel mundial.</p>
        <GlobalLeaderboard 
          currentUser={user} 
          onUserClick={setSelectedUser} 
        />
      </div>



      {selectedUser && (
        <UserPredictionsModal 
          userId={selectedUser.uid} 
          userName={selectedUser.name} 
          userPoints={selectedUser.points}
          onClose={() => setSelectedUser(null)} 
        />
      )}

      {isAllBadgesModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full shadow-xl max-h-[90vh] flex flex-col overflow-hidden transition-colors duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Medal className="w-6 h-6 text-blue-500" /> Todas las Medallas
              </h3>
              <button onClick={() => setIsAllBadgesModalOpen(false)} className="text-gray-500 dark:text-gray-200 hover:text-gray-700 dark:hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>
                 <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {BADGES.map(badge => {
                const isEarned = userBadgeIds.includes(badge.id);
                const isSecretAndNotEarned = badge.isSecret && !isEarned;
                
                const displayIcon = isSecretAndNotEarned ? (
                  <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 text-2xl font-bold shrink-0">?</div>
                ) : (
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-3xl shrink-0 ${isEarned ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-800' : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 grayscale'}`}>
                    {badge.icon}
                  </div>
                );
                
                const displayName = isSecretAndNotEarned ? "Medalla misteriosa" : badge.name;
                const displayDesc = isSecretAndNotEarned ? "Sabrás su contenido cuando la obtengas" : badge.description;

                return (
                  <div key={badge.id} className={`flex items-start gap-4 p-5 min-h-[140px] rounded-xl border ${isEarned ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-70'}`}>
                    {displayIcon}
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-bold text-base ${isEarned ? 'text-blue-900 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {displayName}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-200 mt-1 line-clamp-3">
                        {displayDesc}
                      </p>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
