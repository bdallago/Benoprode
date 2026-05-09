"use client";

import { useEffect, useState, useMemo } from "react";
import { User } from "firebase/auth";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  getCountFromServer,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Trophy,
  Medal,
  User as UserIcon,
  Star,
  Shield,
  Info,
  CheckCircle2,
  BarChart2,
  X,
} from "lucide-react";
import { CountdownBanner } from "../components/CountdownBanner";
import { UserPredictionsModal } from "../components/UserPredictionsModal";
import { useTranslation } from "react-i18next";
import { getUserLevel, getUserBadges, BADGES } from "../lib/gamification";
import { motion, AnimatePresence } from "framer-motion";
import { UpcomingMatches } from "../components/UpcomingMatches";
import matchesData from "../lib/matches.json";
import Link from "next/link";
import { Button } from "../components/ui/button";
import { GlobalLeaderboard } from "../components/GlobalLeaderboard";
import { CalendarExportButton } from "../components/CalendarExportButton";
import { useAuth } from "../components/Providers";
import { MatchReminder } from "../components/MatchReminder";
import { CommunityPredictions } from "../components/CommunityPredictions";

interface Player {
  uid: string;
  displayName: string;
  photoURL: string;
  totalPoints: number;
  role?: string;
  earnedBadges?: string[];
}

export default function Dashboard({ initialLeaderboardData, initialTotalCount }: { initialLeaderboardData?: Player[], initialTotalCount?: number }) {
  const { user, userStats: contextUserStats } = useAuth();
  
  if (!user) return null; // Protective check
  
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<{
    uid: string;
    name: string;
    points: number;
  } | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const [isAllBadgesModalOpen, setIsAllBadgesModalOpen] = useState(false);

  // Gamification states
  const [isLeagueCreatorOrMember, setIsLeagueCreatorOrMember] = useState(false);
  const [inBenoliga, setInBenoliga] = useState(false);
  const [hasPerfectGroup, setHasPerfectGroup] = useState(false);
  const [hasInvitedFriends, setHasInvitedFriends] = useState(false);

  const { t } = useTranslation();

  const [userStats, setUserStats] = useState<any>({});

  const [totalPlayers, setTotalPlayers] = useState(initialTotalCount || 0);
  const [exactRank, setExactRank] = useState(() => {
    // Intentamos calcular el rank desde la lista pre-cargada para no esperar al fetch
    if (initialLeaderboardData && user) {
       const index = initialLeaderboardData.findIndex(p => p.uid === user.uid);
       if (index !== -1) return index + 1;
    }
    return 0;
  });

  useEffect(() => {
    if (contextUserStats && Object.keys(contextUserStats).length > 0) {
      setUserStats(contextUserStats);
      setHasInvitedFriends((contextUserStats.referralsCount || 0) > 0);
      setIsLeagueCreatorOrMember(contextUserStats.inPrivateLeague || false);
      setInBenoliga(contextUserStats.inBenoliga || false);
    }
  }, [contextUserStats]);

  useEffect(() => {
    // 2. FETCH EXACT RANK AND TOTAL USERS EFFICIENTLY
    const fetchExactRank = async () => {
      // Si ya tenemos rank y total de los props, no hace falta el fetch pesado inicial
      if (exactRank > 0 && totalPlayers > 0) {
        setLoading(false);
        return;
      }

      if (typeof window !== "undefined" && !window.navigator.onLine) {
         console.warn("Skipping rank fetch: Client is offline");
         setLoading(false);
         return;
      }

      try {
        const myDoc = await getDoc(doc(db, "users", user.uid));
        const data = myDoc.data();
        const pts = data?.totalPoints || 0;

        // Si el totalUsers ya lo tenemos de los props, solo pedimos el rank
        const queries = [];
        if (totalPlayers === 0) {
           queries.push(getCountFromServer(collection(db, "users")));
        } else {
           queries.push(Promise.resolve({ data: () => ({ count: totalPlayers }) }));
        }

        queries.push(getCountFromServer(query(collection(db, "users"), where("totalPoints", ">", pts))));

        const [totalSnap, rankSnap]: any = await Promise.all(queries);

        setTotalPlayers(totalSnap.data().count);
        setExactRank(rankSnap.data().count + 1);
      } catch (error: any) {
        // Eliminamos el setTimeout que causaba saturación en cascada y lo dejamos como soft-fail
        console.warn("Error calculating exact rank (soft fail):", error?.message || error);
      } finally {
        setLoading(false);
      }
    };

    fetchExactRank();

    // Fetch user predictions and actual results to check for perfect group
    const checkPerfectGroup = async () => {
      if (typeof window !== "undefined" && !window.navigator.onLine) return;
      try {
        const [predsSnap, resultsSnap] = await Promise.all([
          getDoc(doc(db, "predictions", user.uid)),
          getDoc(doc(db, "results", "actual"))
        ]);

        if (predsSnap.exists() && resultsSnap.exists()) {
          const preds = predsSnap.data().groups || {};
          const results = resultsSnap.data().groups || {};

          let perfect = false;
          for (const group in results) {
            if (
              results[group] &&
              preds[group] &&
              JSON.stringify(results[group]) === JSON.stringify(preds[group])
            ) {
              perfect = true;
              break;
            }
          }
          setHasPerfectGroup(perfect);
        }
      } catch (error: any) {
        // Soft fail sin retries recursivos
        console.warn("Error checking perfect group (soft fail):", error?.message || error);
      }
    };

    checkPerfectGroup();

    return () => {
      // nothing specialized to clean up here for user doc as it's now global
    };
  }, [user.uid]);

  const myData = userStats;
  const myPoints = myData?.totalPoints || 0;
  const myRank = exactRank;
  const userLevel = getUserLevel(myPoints);

  const userBadgeIds = myData?.earnedBadges || userStats?.earnedBadges || [];
  const userBadges = userBadgeIds
    .map((id: string) => BADGES.find((b: any) => b.id === id))
    .filter(Boolean);

  const TIPS = [
    "¿Sabías que acertar al resultado exacto te da más puntos que solo acertar al ganador?",
    "Tip: En tu Perfil podés chequear cuáles y cuántas medallas te faltan coleccionar.",
    "¿Sabías que podés crear Duelos 1v1 con tus amigos en sus perfiles para competir por puntos extra?",
    "Tip: Usá los Comentarios en vivo en la pestaña de Predicciones para dejar tu opinión o debatir durante los partidos.",
    "Tip: ¡Compartí tu enlace de referido y recibí medallas cuando tus amigos se sumen al Prode!",
  ];

  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    if (!TIPS.length) return;
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % TIPS.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Top 10% / Top 30% Logic
  const percentile = myRank > 0 && totalPlayers > 1 ? (myRank / totalPlayers) * 100 : 100;

  const rankBadges = [];
  if (percentile <= 10 && myPoints > 0) {
    rankBadges.push({
      text: t("dashboard.top10badge", "Top 10% Mundial 🏆"),
      className: "bg-amber-500/20 text-amber-200 border border-amber-500/50",
    });
  } else if (percentile <= 30 && myPoints > 0) {
    rankBadges.push({
      text: t("dashboard.top30badge", "Top 30% Mundial 🥈"),
      className: "bg-slate-300/20 text-slate-100 border border-slate-300/50",
    });
  }


  return (
    <div id="tutorial-ranking-board" className="max-w-6xl mx-auto space-y-6">
      <div className="mb-0">
        <CountdownBanner />
        <div className="flex justify-center sm:justify-end mt-4 mb-4 relative z-10">
          <CalendarExportButton />
        </div>
      </div>

      <MatchReminder />

      <motion.div
        key={`tip-${currentTip}`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.5 }}
        className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-xl px-4 py-3 flex items-center justify-center text-center shadow-sm"
      >
        <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
          {TIPS[currentTip]}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white border-none h-full shadow-lg">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-200 font-medium mb-1 uppercase tracking-wider text-sm">
                    {t("dashboard.points")}
                  </p>
                  <h2 className="text-6xl font-black tracking-tighter">
                    {myPoints}
                  </h2>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                  <Trophy className="h-12 w-12 text-white" />
                </div>
              </div>
              <p className="text-sm text-blue-200 mt-6 opacity-80">
                {t(
                  "dashboard.pointsCalcInfo",
                  "Los puntos se calculan automáticamente según tus aciertos.",
                )}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-indigo-600 to-purple-800 text-white border-none h-full shadow-lg">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-200 font-medium mb-1 uppercase tracking-wider text-sm">
                    {t("dashboard.globalRank")}
                  </p>
                  <h2 className="text-6xl font-black tracking-tighter">
                    {loading || !myRank ? '…' : `#${myRank}`}
                  </h2>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                  <BarChart2 className="h-12 w-12 text-indigo-200" />
                </div>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span
                  className={`px-4 py-1.5 rounded-full text-sm font-bold bg-white/20 text-white backdrop-blur-sm`}
                >
                  {t("profile.rank", "Nivel") as string}:{" "}
                  {
                    t(
                      `gamification.levels.${userLevel.id}`,
                      userLevel.name,
                    ) as string
                  }
                </span>
                {rankBadges.map((badge, index) => (
                  <span
                    key={index}
                    className={`px-4 py-1.5 rounded-full text-sm font-bold backdrop-blur-sm shadow-sm ${badge.className}`}
                  >
                    {badge.text}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="flex"
        >
          <UpcomingMatches user={user} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <CommunityPredictions />
        </motion.div>
      </div>

      <div className="space-y-4 leaderboard-container">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t("dashboard.globalLeaderboard")}
        </h2>
        <p className="text-sm text-gray-500">
          {t(
            "dashboard.competeAgainstAll",
            "Competí contra todos los usuarios registrados en el prode. Acá vas a ver la posición de cada jugador a nivel mundial.",
          )}
        </p>
        <GlobalLeaderboard 
          currentUser={user} 
          onUserClick={setSelectedUser} 
          initialData={initialLeaderboardData}
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
    </div>
  );
}
