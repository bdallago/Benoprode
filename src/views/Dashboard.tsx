import { useEffect, useState, useRef } from "react";
import { User } from "firebase/auth";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Trophy, Medal, User as UserIcon, Star, Shield, Info, CheckCircle2, BarChart2, X } from "lucide-react";
import { CountdownBanner } from "../components/CountdownBanner";
import { UserPredictionsModal } from "../components/UserPredictionsModal";
import { useTranslation } from 'react-i18next';
import { getUserLevel, getUserBadges, BADGES } from "../lib/gamification";
import { motion, AnimatePresence } from "framer-motion";
import { Leaderboard } from "../components/Leaderboard";

interface Player {
  uid: string;
  displayName: string;
  photoURL: string;
  totalPoints: number;
  role?: string;
}

export default function Dashboard({ user }: { user: User }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<{uid: string, name: string, points: number} | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  
  // Gamification states
  const [isLeagueCreatorOrMember, setIsLeagueCreatorOrMember] = useState(false);
  const [inBenoliga, setInBenoliga] = useState(false);
  const [hasPerfectGroup, setHasPerfectGroup] = useState(false);
  const [hasInvitedFriends, setHasInvitedFriends] = useState(false);

  const { t } = useTranslation();

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("totalPoints", "desc"));
    const unsubscribeUsers = onSnapshot(q, (snapshot) => {
      const playersData = snapshot.docs.map((doc) => ({ ...doc.data(), uid: doc.id } as Player));
      setPlayers(playersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching leaderboard", error);
      setLoading(false);
    });

    // Fetch user leagues
    const unsubscribeLeagues = onSnapshot(collection(db, "leagues"), (snapshot) => {
      const leagues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const userLeagues = leagues.filter((l: any) => l.members?.includes(user.uid) || l.createdBy === user.uid);
      
      setIsLeagueCreatorOrMember(userLeagues.length > 0);
      setInBenoliga(userLeagues.some((l: any) => l.name.toLowerCase().includes('benoliga') || l.id === 'benoliga'));
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
      unsubscribeUsers();
      unsubscribeLeagues();
    };
  }, [user.uid]);

  const myPoints = players.find((p) => p.uid === user.uid)?.totalPoints || 0;
  const myRank = players.findIndex((p) => p.totalPoints === myPoints) + 1;
  
  const userLevel = getUserLevel(myPoints);
  
  const userBadges = getUserBadges(myPoints, isLeagueCreatorOrMember, inBenoliga, hasPerfectGroup, hasInvitedFriends); 
  const userBadgeIds = userBadges.map(b => b?.id);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <CountdownBanner />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white border-none h-full">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-200 font-medium mb-1">{t('dashboard.points')}</p>
                  <h2 className="text-5xl font-bold">{myPoints}</h2>
                </div>
                <div className="bg-white/20 p-4 rounded-full">
                  <Trophy className="h-10 w-10 text-white" />
                </div>
              </div>
              <p className="text-xs text-blue-200 mt-4 opacity-80">Los puntos se calculan automáticamente según tus aciertos.</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-indigo-600 to-purple-800 text-white border-none h-full">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-200 font-medium mb-1">{t('dashboard.globalRank')}</p>
                  <h2 className="text-5xl font-bold">#{myRank || "-"}</h2>
                </div>
                <div className="bg-white/20 p-4 rounded-full">
                  <BarChart2 className="h-10 w-10 text-indigo-200" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white`}>
                  Nivel: {userLevel.name}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Medal className="w-4 h-4" /> Mis Medallas ({userBadges.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {userBadges.length > 0 ? (
                  userBadges.map(badge => (
                    <div 
                      key={badge?.id} 
                      className="relative flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1.5 rounded-md text-sm border border-gray-200 dark:border-gray-600 cursor-pointer"
                      onClick={() => setActiveTooltip(activeTooltip === badge?.id ? null : badge?.id)}
                    >
                      <span>{badge?.icon}</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">{badge?.name}</span>
                      
                      {/* Tooltip */}
                      {activeTooltip === badge?.id && (
                        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-11/12 max-w-sm p-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl z-[100] sm:absolute sm:bottom-full sm:left-1/2 sm:-translate-x-1/2 sm:mb-2 sm:w-48 sm:p-2 sm:text-xs">
                          <div className="font-bold mb-1">{badge?.name}</div>
                          <div>{badge?.description}</div>
                          <div className="hidden sm:block absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500">Aún no tienes medallas. ¡Empieza a jugar para ganarlas!</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="space-y-4 leaderboard-container">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('dashboard.globalLeaderboard')}</h2>
        <p className="text-sm text-gray-500">Competí contra todos los usuarios registrados en el prode. Acá vas a ver la posición de cada jugador a nivel mundial.</p>
        <Leaderboard 
          title={t('dashboard.globalLeaderboard')} 
          players={players} 
          currentUser={user} 
          onUserClick={setSelectedUser} 
          loading={loading} 
        />
      </div>

      {/* Achievements Table */}
      <div className="mt-12 space-y-4 medals-section">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Medal className="w-6 h-6 text-yellow-500" /> Medallas
        </h2>
        <p className="text-sm text-gray-500">Completá estas acciones para desbloquear todas las medallas en tu perfil.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BADGES.map(badge => {
            const isEarned = userBadgeIds.includes(badge.id);
            return (
              <Card key={badge.id} className={`overflow-hidden transition-all duration-300 border-gray-200 dark:border-gray-700 ${isEarned ? '' : 'opacity-50 grayscale'}`}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className={`text-3xl`}>
                    {badge.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-bold text-sm text-gray-900 dark:text-gray-100`}>
                      {badge.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {badge.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {selectedUser && (
        <UserPredictionsModal 
          userId={selectedUser.uid} 
          userName={selectedUser.name} 
          userPoints={selectedUser.points}
          onClose={() => setSelectedUser(null)} 
        />
      )}
    </div>
  );
}
