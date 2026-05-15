import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { User } from "firebase/auth";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { fetchUsersInChunks } from "../lib/firestore-utils";
import {
  Trophy,
  Users,
  Swords,
  UserPlus,
  Check,
  X,
  Clock,
  BookOpen,
  Loader2,
  PenSquare,
  Medal,
  CheckCircle2,
  ArrowRight,
  Globe,
  Lock,
} from "lucide-react";
import { getUserLevel, getUserBadges, BADGES, getBadgesWithProgress } from "../lib/gamification";
import matchesData from "../lib/matches.json";
import { UserPredictionsModal } from "../components/UserPredictionsModal";
import { useTranslation } from "react-i18next";
import { useAuth } from "../components/Providers";
import { useSocial } from "../hooks/useSocial";

interface ProfileProps {
  user: User;
  profileId?: string; // If provided, viewing someone else's profile
}

function computeStreak(activeDays: string[] | undefined): number {
  if (!activeDays?.length) return 0;
  const unique = [...new Set(activeDays.map(d => d.slice(0, 10)))].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  let streak = 0;
  let cursor = today;
  for (const day of unique) {
    const diff = Math.round((new Date(cursor).getTime() - new Date(day).getTime()) / 86400000);
    if (diff === 0 || diff === 1) { streak++; cursor = day; }
    else break;
  }
  return streak;
}

export default function Profile({ user, profileId }: ProfileProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isOwnProfile = !profileId || profileId === user.uid;
  const targetUserId = profileId || user.uid;
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { 
    friends, 
    sentRequests, 
    receivedRequests, 
    addFriend, 
    acceptRequest, 
    rejectRequest 
  } = useSocial(user);
  
  const initialTab =
    (searchParams.get("tab") as "stats" | "friends" | "duels" | "torneos") || "stats";

  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stats" | "friends" | "duels" | "torneos">(
    initialTab,
  );
  const [isAllBadgesModalOpen, setIsAllBadgesModalOpen] = useState(false);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "stats" || tab === "friends" || tab === "duels" || tab === "torneos") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const switchTab = (tab: "stats" | "friends" | "duels" | "torneos") => {
    setActiveTab(tab);
    router.replace(`${pathname}?tab=${tab}`, { scroll: false });
  };

  // Friendship state - Derived from useSocial
  const friendStatus = friends.has(targetUserId) 
    ? "friends" 
    : sentRequests.has(targetUserId) 
      ? "pending_sent" 
      : receivedRequests.has(targetUserId) 
        ? "pending_received" 
        : "none";

  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [pendingRequestsList, setPendingRequestsList] = useState<any[]>([]);
  const [duelsList, setDuelsList] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isPredictionsModalOpen, setIsPredictionsModalOpen] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [predictionCount, setPredictionCount] = useState<number | null>(null);
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Live search effect
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // Set searching to true immediately to hide "no results" while typing
    setIsSearching(true);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const normalizedTerm = searchTerm.trim().toLowerCase();
        const q = query(
          collection(db, "users"),
          where("displayNameLower", ">=", normalizedTerm),
          where("displayNameLower", "<=", normalizedTerm + "\uf8ff"),
          limit(25),
        );
        const snap = await getDocs(q);
        const results = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => u.id !== user.uid);
        setSearchResults(results);
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchTerm, user.uid]);

  const handleSearch = () => {
    // Already handled by useEffect
  };

  const { globalLeagues } = useAuth();

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", targetUserId));
        if (isMounted && userDoc.exists()) {
          setProfileData(userDoc.data());
          setUserStats((prev: any) => ({ ...prev, ...userDoc.data() }));
        }
      } catch (error) {
        if (isMounted) console.error("Error fetching profile:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProfile();
    return () => { isMounted = false; };
  }, [targetUserId]);

  useEffect(() => {
    getDoc(doc(db, 'predictions', targetUserId)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setPredictionCount(Object.keys(data.matches || {}).length);
      } else {
        setPredictionCount(0);
      }
    }).catch(() => setPredictionCount(0));
  }, [targetUserId]);

  useEffect(() => {
    if (globalLeagues) {
      const userLeagues = globalLeagues.filter(
        (l: any) =>
          l.members?.includes(targetUserId) || l.createdBy === targetUserId,
      );

      setUserStats((prev: any) => ({
        ...prev,
        inBenoliga: userLeagues.some(
          (l: any) =>
            l.name.toLowerCase().includes("beno") || l.id === "benoliga",
        ),
        inPrivateLeague: userLeagues.length > 0,
      }));
    }
  }, [targetUserId, globalLeagues]);

  useEffect(() => {
    // Friends: one combined fetch instead of two cross-firing onSnapshot+getDocs
    const fetchFriends = async () => {
      const [snap1, snap2] = await Promise.all([
        getDocs(query(collection(db, "friendships"), where("user1Id", "==", targetUserId))),
        getDocs(query(collection(db, "friendships"), where("user2Id", "==", targetUserId))),
      ]);
      const friendIds = new Set<string>();
      snap1.docs.forEach((d) => friendIds.add(d.data().user2Id));
      snap2.docs.forEach((d) => friendIds.add(d.data().user1Id));
      const fetched = await fetchUsersInChunks(db, Array.from(friendIds));
      setFriendsList(fetched.map((f) => ({ ...f, id: f.uid })));
    };
    fetchFriends().catch(() => {});

    // Duels: same — one combined fetch, no cross-firing
    const fetchDuels = async () => {
      const [snap1, snap2] = await Promise.all([
        getDocs(query(collection(db, "duels_v2"), where("challengerId", "==", targetUserId))),
        getDocs(query(collection(db, "duels_v2"), where("challengedId", "==", targetUserId))),
      ]);
      const allDuels = new Map<string, any>();
      snap1.docs.forEach((d) => allDuels.set(d.id, { id: d.id, ...d.data() }));
      snap2.docs.forEach((d) => allDuels.set(d.id, { id: d.id, ...d.data() }));
      setDuelsList(
        Array.from(allDuels.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      );
    };
    fetchDuels().catch(() => {});

    // Pending friend requests: onSnapshot is appropriate here (need real-time badge)
    let unsubReqs = () => {};
    if (isOwnProfile) {
      unsubReqs = onSnapshot(
        query(
          collection(db, "friendRequests"),
          where("toUserId", "==", targetUserId),
          where("status", "==", "pending"),
        ),
        async (snap) => {
          if (snap.empty) { setPendingRequestsList([]); return; }
          const reqs = snap.docs.map((d) => ({ reqId: d.id, ...d.data() }));
          const uids = reqs.map((r: any) => r.fromUserId);
          const fetchedUsers = await fetchUsersInChunks(db, uids);
          setPendingRequestsList(
            reqs.map((req: any) => ({
              id: req.reqId,
              fromUserId: req.fromUserId,
              ...fetchedUsers.find((u) => u.uid === req.fromUserId),
            })),
          );
        },
      );
    }

    return () => { unsubReqs(); };
  }, [targetUserId, isOwnProfile, user.uid]);

  const [h2hStats, setH2hStats] = useState({
    userWins: 0,
    targetWins: 0,
    ties: 0,
  });

  useEffect(() => {
    if (isOwnProfile || duelsList.length === 0) return;

    let userWins = 0;
    let targetWins = 0;
    let ties = 0;

    duelsList.forEach((duel: any) => {
      if (duel.status !== "completed") return;
      if (!duel.challengerId || !duel.challengedId) return;

      const challengerIsUser = duel.challengerId === user.uid;
      // Only count duels between THESE two users
      if (
        !(
          (duel.challengerId === user.uid && duel.challengedId === profileId) ||
          (duel.challengerId === profileId && duel.challengedId === user.uid)
        )
      ) {
        return;
      }

      if (duel.winnerId === "tie") {
        ties++;
      } else if (duel.winnerId === user.uid) {
        userWins++;
      } else if (duel.winnerId === profileId) {
        targetWins++;
      }
    });

    setH2hStats({ userWins, targetWins, ties });
  }, [duelsList, isOwnProfile, user.uid, profileId]);

  useEffect(() => {
    // Relationships are now handled by useSocial
  }, [user.uid, targetUserId, isOwnProfile]);

  const handleSendFriendRequest = async () => {
    try {
      await addFriend(targetUserId);
    } catch (error) {
      console.error("Error sending friend request:", error);
    }
  };

  const handleAcceptFriendRequest = async () => {
    try {
      await acceptRequest(targetUserId);
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <Card className="overflow-hidden">
          <div className="h-32 bg-gray-200 dark:bg-gray-800"></div>
          <CardContent className="relative pt-0 pb-6 px-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12 sm:-mt-16 mb-4">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-gray-800 bg-gray-300 dark:bg-gray-700 flex-shrink-0"></div>
              <div className="flex-1 text-center sm:text-left space-y-2 mt-4 sm:mt-0 w-full sm:w-auto">
                <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-48 mx-auto sm:mx-0"></div>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <div className="h-6 w-24 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                  <div className="h-4 w-16 bg-gray-300 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex border-b dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50 rounded-t-xl h-14"></div>
        <div className="h-64 bg-gray-100 dark:bg-gray-800/50 rounded-xl"></div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        Usuario no encontrado
      </div>
    );
  }

  const level = getUserLevel(profileData.totalPoints || 0);
  const badgeIds = profileData.earnedBadges || [];
  const badges = badgeIds
    .map((id: string) => BADGES.find((b) => b.id === id))
    .filter(Boolean);

  const streak = computeStreak(profileData?.activeDays);
  const totalDuelsWon = duelsList.filter((d: any) => d.status === 'completed' && d.winnerId === targetUserId).length;
  const allBadgeProgress = getBadgesWithProgress({
    referralsCount: profileData?.referralsCount ?? 0,
    duelsWon: totalDuelsWon,
    exactMatchCount: profileData?.exactMatchCount ?? 0,
    correctMatchCount: profileData?.correctMatchCount ?? 0,
    groupsPerfectCount: profileData?.groupsPerfectCount ?? 0,
  });
  const closestBadges = allBadgeProgress
    .filter(item => !badgeIds.includes(item.badgeId))
    .sort((a, b) => (b.current / b.target) - (a.current / a.target))
    .slice(0, 3);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card className="overflow-hidden border-0 shadow-sm bg-white dark:bg-gray-900 mb-6">
        <div className="h-32 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative opacity-90">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white dark:to-gray-900 mix-blend-normal"></div>
        </div>
        <CardContent className="relative pt-0 pb-6 px-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-16 sm:-mt-20 mb-4">
            {/* Avatar */}
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-[6px] border-white dark:border-gray-900 bg-white dark:bg-gray-700 overflow-hidden flex-shrink-0 relative z-10 shadow-md">
              {profileData.photoURL ? (
                <img
                  src={profileData.photoURL}
                  alt={profileData.displayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-blue-600 dark:text-blue-400">
                  {profileData.displayName?.charAt(0) || "U"}
                </div>
              )}
            </div>

            {/* User Info Section */}
            <div className="flex-1 text-center sm:text-left relative z-10 pt-2 sm:pt-0 mb-2 sm:mb-0 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 truncate mb-2">
                {profileData.displayName}
              </h1>
              
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${level.bg} ${level.color}`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t(`gamification.levels.${level.id}`, level.name) as string}
                </span>
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                  {profileData.totalPoints || 0} pts
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="relative z-10 w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-800/50 mt-4 sm:mt-0">
              {!isOwnProfile ? (
                <>
                  {friendStatus === "none" && (
                    <Button
                      onClick={handleSendFriendRequest}
                      className="flex items-center justify-center gap-2 rounded-full h-11 px-6 shadow-md bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all"
                    >
                      <UserPlus className="w-4 h-4" />{" "}
                      {t("profile.sendFriendRequest")}
                    </Button>
                  )}
                  {friendStatus === "pending_sent" && (
                    <Button
                      disabled
                      variant="outline"
                      className="border-gray-300 text-gray-600 bg-gray-50 flex items-center justify-center gap-2 rounded-full h-11 px-6 font-bold"
                    >
                      <Clock className="w-4 h-4" /> {t("profile.requestSent")}
                    </Button>
                  )}
                  {friendStatus === "pending_received" && (
                    <Button
                      onClick={handleAcceptFriendRequest}
                      variant="success"
                      className="flex items-center justify-center gap-2 rounded-full h-11 px-6 shadow-md font-bold transition-all"
                    >
                      <Check className="w-4 h-4" />{" "}
                      {t("notifications.titleAcceptRequest")}
                    </Button>
                  )}
                  {friendStatus === "friends" && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
                       <Button
                         disabled
                         variant="outline"
                         className="text-green-700 border-green-200 bg-green-50 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 font-bold flex items-center justify-center gap-2 rounded-full h-11 px-6"
                       >
                         <Users className="w-4 h-4" /> {t("profile.areFriends")}
                       </Button>
                       <Button
                         onClick={() => setIsPredictionsModalOpen(true)}
                         className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md font-bold flex items-center justify-center gap-2 rounded-full h-11 px-6 transition-all"
                       >
                         <Swords className="w-4 h-4" />{" "}
                         {t("profile.viewPredictionsAndChallenge")}
                       </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                  <Button
                    onClick={() => setIsPredictionsModalOpen(true)}
                    variant="outline"
                    className="font-bold flex items-center justify-center gap-2 shadow-sm border-gray-200 text-gray-700 hover:bg-gray-50 rounded-full h-11 px-6 dark:border-gray-700 dark:text-gray-300 dark:bg-gray-800/50 dark:hover:bg-gray-800 transition-all"
                  >
                    <BookOpen className="w-4 h-4" />{" "}
                    {t("profile.viewPredictions")}
                  </Button>
                  <Button
                    onClick={() => router.push("/predictions")}
                    variant="default"
                    className="font-bold flex items-center justify-center gap-2 shadow-md bg-blue-600 hover:bg-blue-700 text-white rounded-full h-11 px-6 transition-all border border-blue-600 hover:border-blue-700"
                  >
                    <PenSquare className="w-4 h-4" />{" "}
                    {t("profile.editPredictions")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex border-b dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-xl sticky top-2 z-10 shadow-sm mt-4">
        <button
          onClick={() => switchTab("stats")}
          className={`flex-1 py-4 text-sm font-bold border-b-[3px] transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 ${activeTab === "stats" ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-200 dark:hover:text-gray-300"}`}
        >
          {t("profile.summary")}
        </button>
        <button
          onClick={() => switchTab("friends")}
          className={`flex-1 py-4 text-sm font-bold border-b-[3px] transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 ${activeTab === "friends" ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-200 dark:hover:text-gray-300"}`}
        >
          <div className="flex items-center justify-center gap-2">
            {t("profile.friends")}
            {isOwnProfile && pendingRequestsList.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-bounce">
                {pendingRequestsList.length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => switchTab("duels")}
          className={`flex-1 py-4 text-sm font-bold border-b-[3px] transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 ${activeTab === "duels" ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-200 dark:hover:text-gray-300"}`}
        >
          {t("profile.duels")}
        </button>
        {isOwnProfile && (
          <button
            onClick={() => switchTab("torneos")}
            className={`flex-1 py-4 text-sm font-bold border-b-[3px] transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 ${activeTab === "torneos" ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-200 dark:hover:text-gray-300"}`}
          >
            Torneos
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="py-4">
        {activeTab === "stats" && (
          <div className="space-y-6">
            {!isOwnProfile && (
              <div className="bg-blue-900 overflow-hidden relative p-6 rounded-xl flex flex-col justify-center text-center shadow-lg mb-6">
                <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>

                <h3 className="text-white font-bold uppercase tracking-wider text-xs mb-3 flex items-center justify-center gap-2 relative z-10">
                  <Swords className="w-4 h-4" /> {t("profile.headToHead")}
                </h3>

                <div className="flex items-center justify-center gap-8 md:gap-16 relative z-10 w-full mb-2">
                  <div className="flex flex-col items-center">
                    <span className="text-4xl md:text-6xl font-black text-white">
                      {h2hStats.targetWins}
                    </span>
                    <span className="text-blue-200 text-xs font-bold uppercase mt-1">
                      {profileData?.displayName?.split(" ")[0] || "Rival"}
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-black text-blue-200">{h2hStats.ties}</span>
                    <span className="text-blue-300 text-[10px] font-bold uppercase mt-1">Empates</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="text-4xl md:text-6xl font-black text-white">
                      {h2hStats.userWins}
                    </span>
                    <span className="text-blue-200 text-xs font-bold uppercase mt-1">
                      {t("profile.you")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Puntos', value: profileData?.totalPoints ?? 0, icon: '⭐', color: 'text-yellow-600 dark:text-yellow-400' },
                { label: 'Predicciones', value: predictionCount ?? '…', icon: '🎯', color: 'text-blue-600 dark:text-blue-400' },
                { label: 'Días activo', value: profileData?.activeDays?.length ?? 0, icon: '📅', color: 'text-green-600 dark:text-green-400' },
                { label: 'Medallas', value: badges.length, icon: '🏅', color: 'text-orange-600 dark:text-orange-400' },
              ].map(stat => (
                <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center text-center gap-1">
                  <span className="text-2xl">{stat.icon}</span>
                  <span className={`text-2xl font-black ${stat.color}`}>{stat.value}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{stat.label}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-800/50 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all shadow-sm">
                <div className="bg-blue-100 dark:bg-blue-900/40 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                  <Trophy className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-bold mb-1 uppercase tracking-wider">
                  {t("profile.globalRank")}
                </div>
                <div className="text-4xl font-black text-gray-900 dark:text-white mb-3">
                  # -
                </div>
                <Link
                  href="/dashboard"
                  className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 group-hover:underline"
                >
                  {t("profile.goToLeaderboard")}{" "}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Advanced stats toggle */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowAdvancedStats(v => !v)}
                className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1.5 py-1 px-3 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                {showAdvancedStats ? '▲ Ocultar estadísticas' : '▼ Ver estadísticas avanzadas'}
              </button>
            </div>

            {showAdvancedStats && (() => {
              const myLeagueCount = (globalLeagues || []).filter((l: any) => l.members?.includes(targetUserId)).length;
              const referrals = profileData?.referralsCount ?? 0;
              const nextMilestone = referrals < 1
                ? { target: 1, name: 'Sociable' }
                : referrals < 5
                  ? { target: 5, name: 'Influencer' }
                  : referrals < 10
                    ? { target: 10, name: 'Embajador' }
                    : null;
              return (
                <div className="grid grid-cols-3 gap-3 animate-in slide-in-from-top-2 duration-200">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center text-center gap-1">
                    <span className="text-2xl">🔥</span>
                    <span className="text-2xl font-black text-orange-600 dark:text-orange-400">{streak}d</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Racha</span>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center text-center gap-1">
                    <span className="text-2xl">👥</span>
                    <span className="text-2xl font-black text-green-600 dark:text-green-400">{referrals}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Referidos</span>
                    {nextMilestone ? (
                      <span className="text-xs text-green-500 dark:text-green-400 font-medium">{referrals}/{nextMilestone.target} → {nextMilestone.name}</span>
                    ) : (
                      <span className="text-xs text-yellow-500 font-medium">¡Embajador! 🌍</span>
                    )}
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center text-center gap-1">
                    <span className="text-2xl">🏆</span>
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{myLeagueCount}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Ligas</span>
                  </div>
                </div>
              );
            })()}

            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm mt-8 rounded-2xl overflow-hidden">
              <CardHeader className="bg-yellow-50/50 dark:bg-yellow-900/10 border-b border-gray-100 dark:border-gray-700/50 pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-yellow-800 dark:text-yellow-400">
                  <Medal className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />{" "}
                  {t("dashboard.yourMedals", "Tus Medallas")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-2 text-gray-600 dark:text-gray-200 font-medium">
                      <span>
                        {t("dashboard.medalProgress", "Progreso de medallas")}
                      </span>
                      <span>
                        {badges.length} de {BADGES.length} (
                        {Math.round((badges.length / BADGES.length) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-6">
                      <div
                        className="bg-blue-500 h-3 rounded-full transition-all duration-1000"
                        style={{
                          width: `${(badges.length / BADGES.length) * 100}%`,
                        }}
                      ></div>
                    </div>

                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4">
                      {t("dashboard.earnedMedals", "Medallas Obtenidas")}
                    </h3>
                    <div className="flex flex-wrap gap-4">
                      {badges.length > 0 ? (
                        badges.map(
                          (badge: any) =>
                            badge && (
                              <div
                                key={badge.id}
                                className="relative group cursor-pointer"
                                onClick={() =>
                                  setActiveTooltip(
                                    activeTooltip === badge.id
                                      ? null
                                      : badge.id,
                                  )
                                }
                              >
                                <div className="w-16 h-16 rounded-xl bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-800 flex items-center justify-center text-4xl shadow-sm hover:border-blue-400 dark:hover:border-blue-500 hover:scale-105 transition-all">
                                  {badge.icon}
                                </div>
                              </div>
                            ),
                        )
                      ) : (
                        <p className="text-gray-500 dark:text-gray-200 text-sm italic">
                          {t(
                            "dashboard.noMedalsYet",
                            "Aún no has obtenido ninguna medalla. ¡Participá para ganar la primera!",
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="w-full md:w-80 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center items-start gap-2 mb-4">
                      <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                        Más cerca de obtener
                      </h3>
                      <button
                        onClick={() => setIsAllBadgesModalOpen(true)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium text-left"
                      >
                        {t("dashboard.viewAllMedals", "Ver todas las medallas")}
                      </button>
                    </div>
                    <div className="space-y-4">
                      {closestBadges.length > 0 ? closestBadges.map((item) => {
                        const badge = BADGES.find(b => b.id === item.badgeId);
                        if (!badge) return null;
                        const pct = Math.min(100, Math.round((item.current / item.target) * 100));
                        return (
                          <div key={item.badgeId} className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 flex items-center justify-center text-2xl grayscale shrink-0">
                              {badge.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-700 dark:text-gray-300 truncate">{badge.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{item.current}/{item.target} {item.label}</p>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      }) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic text-center py-2">
                          ¡Todas las medallas medibles están desbloqueadas!
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "friends" && (
          <div className="space-y-8">
            {isOwnProfile && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    {t("profile.searchFriends")}
                  </h3>
                </div>

                <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder={t("profile.searchPlaceholder")}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    {isSearching && (
                      <div className="flex items-center px-2">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                      </div>
                    )}
                  </div>

                  {searchResults.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {searchResults.map((result) => (
                        <div
                          key={result.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center overflow-hidden">
                              {result.photoURL ? (
                                <img
                                  src={result.photoURL}
                                  alt={result.displayName}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span className="text-blue-600 dark:text-blue-400 font-bold">
                                  {result.displayName?.charAt(0) || "U"}
                                </span>
                              )}
                            </div>
                            <span className="font-bold text-sm dark:text-white">
                              {result.displayName}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => router.push(`/profile/${result.id}`)}
                          >
                            {t("profile.viewProfile")}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchTerm && searchResults.length === 0 && !isSearching && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      {t("profile.noUsersFound")}
                    </p>
                  )}
                </div>
              </div>
            )}

            {isOwnProfile && pendingRequestsList.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  {t("profile.incomingRequests")}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pendingRequestsList.map((req) => (
                    <div
                      key={req.id}
                      className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-between gap-4"
                    >
                      <Link
                        href={`/profile/${req.fromUserId}`}
                        className="flex items-center gap-3 flex-1 hover:opacity-80"
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center overflow-hidden shrink-0">
                          {req.photoURL ? (
                            <img
                              src={req.photoURL}
                              alt={req.displayName}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-blue-600 dark:text-blue-400 font-bold">
                              {req.displayName?.charAt(0) || "U"}
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-gray-900 dark:text-gray-100">
                          {req.displayName}
                        </span>
                      </Link>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white p-2"
                          onClick={async () => {
                            await acceptRequest(req.fromUserId);
                          }}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50 p-2"
                          onClick={() => {
                            rejectRequest(req.fromUserId);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                {t("profile.friendsList")}
              </h3>
              {friendsList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {friendsList.map((friend) => (
                    <Link
                      key={friend.id}
                      href={`/profile/${friend.id}`}
                      className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center gap-4 hover:border-blue-500 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center overflow-hidden shrink-0">
                        {friend.photoURL ? (
                          <img
                            src={friend.photoURL}
                            alt={friend.displayName}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-blue-600 dark:text-blue-400 font-bold text-lg">
                            {friend.displayName?.charAt(0) || "U"}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-gray-100">
                          {friend.displayName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-200">
                          {friend.totalPoints || 0} pts
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-200">
                    {t("profile.noFriends")}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "duels" && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
              {t("profile.duelHistory")}
            </h3>

            {/* Head-to-head history when viewing another user */}
            {!isOwnProfile && (() => {
              const h2hDuels = duelsList.filter(d =>
                (d.challengerId === user.uid && d.challengedId === profileId) ||
                (d.challengerId === profileId && d.challengedId === user.uid)
              );
              if (h2hDuels.length === 0) return null;
              return (
                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Swords className="w-4 h-4 text-blue-500" />
                    Partidas entre vos y {profileData?.displayName?.split(' ')[0] || 'este jugador'}
                  </h4>
                  <div className="space-y-2">
                    {h2hDuels.map(duel => {
                      const isWinner = duel.status === 'completed' && duel.winnerId === user.uid;
                      const isLoser = duel.status === 'completed' && duel.winnerId && duel.winnerId !== user.uid && duel.winnerId !== 'tie';
                      const isTie = duel.status === 'completed' && duel.winnerId === 'tie';
                      return (
                        <div key={duel.id} className="flex items-center justify-between text-sm bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-100 dark:border-gray-700">
                          <span className="text-gray-600 dark:text-gray-300 text-xs truncate max-w-[60%]">
                            {duel.matchId?.replace(/_/g, ' ')}
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            isWinner ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : isLoser ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : isTie ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}>
                            {isWinner ? '✓ Ganaste' : isLoser ? '✗ Perdiste' : isTie ? 'Empate' : 'En curso'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {duelsList.length > 0 && (
              <div className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex-1 text-center border-r border-gray-200 dark:border-gray-600">
                  <div className="text-sm text-gray-500">
                    {t("profile.wonDuels")}
                  </div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {duelsList.reduce(
                      (acc, d) =>
                        acc +
                        (d.winnerId === targetUserId
                          ? d.duelType === "group_complete"
                            ? 3
                            : 1
                          : 0),
                      0,
                    )}
                  </div>
                </div>
                <div className="flex-1 text-center border-r border-gray-200 dark:border-gray-600">
                  <div className="text-sm text-gray-500">
                    {t("profile.lostDuels")}
                  </div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {
                      duelsList.filter(
                        (d) => d.winnerId && d.winnerId !== targetUserId,
                      ).length
                    }
                  </div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-sm text-gray-500">
                    {t("profile.extraPoints")}
                  </div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {Math.floor(
                      duelsList.reduce(
                        (acc, d) =>
                          acc +
                          (d.winnerId === targetUserId
                            ? d.duelType === "group_complete"
                              ? 3
                              : 1
                            : 0),
                        0,
                      ) / 3,
                    )}
                  </div>
                </div>
              </div>
            )}

            {duelsList.length > 0 ? (
              <div className="space-y-4 mt-4">
                {duelsList.map((duel) => {
                  const isChallenger = duel.challengerId === targetUserId;
                  const otherUserName = isChallenger
                    ? duel.challengedName
                    : duel.challengerName;
                  const isWinner = duel.winnerId === targetUserId;
                  const isLoser =
                    duel.winnerId && duel.winnerId !== targetUserId;

                  let statusText = t("profile.inProgress");
                  let statusClass =
                    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";

                  if (duel.status === "pending") {
                    statusText = t("notifications.pending");
                    statusClass =
                      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
                  } else if (duel.status === "rejected") {
                    statusText = t("notifications.reject");
                    statusClass =
                      "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
                  } else if (duel.status === "accepted") {
                    statusText = t("profile.accepted");
                    statusClass =
                      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
                  } else if (duel.status === "completed") {
                    if (isWinner) {
                      statusText = t("profile.winner");
                      statusClass =
                        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
                    } else if (isLoser) {
                      statusText = t("profile.loser");
                      statusClass =
                        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
                    } else {
                      statusText = t("profile.tie");
                      statusClass =
                        "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
                    }
                  }

                  const formatDuelEventName = (
                    matchId: string,
                    duelType: string,
                  ) => {
                    if (duelType === "group_complete") {
                      const groupLetter = matchId
                        .replace("group_", "")
                        .replace("_complete", "");
                      return `${t("profile.groupComplete")} ${groupLetter}`;
                    }
                    if (duelType === "group_position") {
                      const parts = matchId.split("_");
                      // check safe parsing
                      if (parts.length >= 4)
                        return `${t("profile.position")} ${parts[3]} - Grupo ${parts[1]}`;
                    }
                    if (
                      duelType === "match_exact" ||
                      duelType === "match_winner"
                    ) {
                      const matchInfo = matchesData.find(
                        (m: any) => m.id === matchId,
                      );
                      if (matchInfo) {
                        return `${matchInfo.teamA} vs ${matchInfo.teamB}`;
                      }
                    }
                    if (duelType === "special") return `Pregunta Especial`;
                    if (duelType === "knockout") return `Fase Eliminatoria`;
                    return matchId;
                  };

                  const eventName = formatDuelEventName(
                    duel.matchId,
                    duel.duelType,
                  );
                  const typeLabel =
                    duel.duelType === "match_exact"
                      ? t("profile.exactResult")
                      : duel.duelType === "match_winner"
                        ? t("profile.winnerOrTie")
                        : "";

                  return (
                    <div
                      key={duel.id}
                      className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
                          <Swords className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 dark:text-gray-100">
                            {t("profile.duelVs")} {otherUserName || "Usuario"}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-200">
                            {t("profile.event")}: {eventName}{" "}
                            {typeLabel ? `(${typeLabel})` : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${statusClass}`}
                        >
                          {statusText}
                        </span>

                        {isOwnProfile &&
                          duel.challengedId === targetUserId &&
                          duel.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="success"
                                onClick={async () => {
                                  await updateDoc(
                                    doc(db, "duels_v2", duel.id),
                                    { status: "accepted" },
                                  );
                                  await addDoc(
                                    collection(db, "notifications"),
                                    {
                                      userId: duel.challengerId,
                                      type: "duel_accepted",
                                      title: "Duelo Aceptado",
                                      message: `${user!.displayName || "Un usuario"} aceptó tu duelo.`,
                                      read: false,
                                      createdAt: new Date().toISOString(),
                                      actionUrl: `/profile?tab=duels`,
                                    },
                                  );
                                }}
                              >
                                {t("notifications.acceptDuel")}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={async () => {
                                  await updateDoc(
                                    doc(db, "duels_v2", duel.id),
                                    { status: "rejected" },
                                  );
                                }}
                              >
                                {t("notifications.reject")}
                              </Button>
                            </div>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-center flex flex-col items-center justify-center">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
                  <Swords className="w-16 h-16 text-blue-500 relative z-10" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Duelos 1v1
                </h4>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6 text-sm">
                  Desafiá a un amigo y apuesten quién sabe más en esta fecha.
                  ¡El que acierta más, gana puntos extra!
                </p>
                {isOwnProfile && (
                  <Button
                    onClick={() => switchTab("friends")}
                    className="bg-blue-600 hover:bg-blue-700 font-bold shadow-sm"
                  >
                    Crear duelo con un amigo
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "torneos" && isOwnProfile && (() => {
          const myLeagues = (globalLeagues || []).filter((l: any) => l.members?.includes(user.uid));
          const isBenoliga = (l: any) => l.name?.toLowerCase().includes('beno') || l.id === 'benoliga';
          const sorted = [
            ...myLeagues.filter(isBenoliga),
            ...myLeagues.filter((l: any) => !isBenoliga(l)),
          ];
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-blue-500" /> Mis Torneos
                </h3>
                <Link href="/leagues" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                  Ver todos <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              {sorted.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-center">
                  <Trophy className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No estás en ningún torneo todavía.</p>
                  <Link href="/leagues" className="mt-3 inline-block text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
                    Explorar torneos
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sorted.map((league: any) => (
                    <Link
                      key={league.id}
                      href={`/leagues?league=${league.id}`}
                      className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors flex flex-col gap-2 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                          {league.name}
                        </span>
                        {league.isPublic ? (
                          <span className="flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-normal shrink-0">
                            <Globe className="w-3 h-3" /> Pública
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-normal shrink-0">
                            <Lock className="w-3 h-3" /> Privada
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> {league.members?.length || 0} miembros
                        </span>
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          Ver ranking <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {isPredictionsModalOpen && profileData && (
        <UserPredictionsModal
          userId={targetUserId}
          userName={profileData.displayName}
          userPoints={profileData.totalPoints || 0}
          onClose={() => setIsPredictionsModalOpen(false)}
        />
      )}

      {activeTooltip && (() => {
        const activeBadge = badges.find((b: any) => b && b.id === activeTooltip);
        if (!activeBadge) return null;
        return createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-black/40"
            onClick={() => setActiveTooltip(null)}
          >
            <div
              className="bg-gray-900 text-white p-5 rounded-2xl shadow-2xl max-w-xs w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-4xl mb-3">{activeBadge.icon}</div>
              <div className="font-bold text-blue-300 text-base mb-2">
                {t(`gamification.badges.${activeBadge.id}.name`, activeBadge.name) as string}
              </div>
              <div className="text-gray-300 text-sm leading-relaxed">
                {t(`gamification.badges.${activeBadge.id}.description`, activeBadge.description) as string}
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {isAllBadgesModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm sm:backdrop-blur-none flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full shadow-xl max-h-[90vh] flex flex-col overflow-hidden transition-colors duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Medal className="w-6 h-6 text-blue-500" />{" "}
                {t("dashboard.allMedals", "Todas las Medallas")}
              </h3>
              <button
                onClick={() => setIsAllBadgesModalOpen(false)}
                className="text-gray-500 dark:text-gray-200 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {BADGES.map((badge) => {
                  const isEarned = badgeIds.includes(badge.id);
                  const isSecretAndNotEarned = badge.isSecret && !isEarned;
                  const progressItem = !isEarned ? allBadgeProgress.find(p => p.badgeId === badge.id) : undefined;
                  const pct = progressItem ? Math.min(100, Math.round((progressItem.current / progressItem.target) * 100)) : null;

                  const displayIcon = isSecretAndNotEarned ? (
                    <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 text-2xl font-bold shrink-0">
                      ?
                    </div>
                  ) : (
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center text-3xl shrink-0 ${isEarned ? "bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-800" : "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 grayscale"}`}
                    >
                      {badge.icon}
                    </div>
                  );

                  const displayName = isSecretAndNotEarned
                    ? (t("dashboard.mysteryMedal", "Medalla misteriosa") as string)
                    : (t(`gamification.badges.${badge.id}.name`, badge.name) as string);
                  const displayDesc = isSecretAndNotEarned
                    ? (t("dashboard.mysteryMedalDesc", "Sabrás su contenido cuando la obtengas") as string)
                    : (t(`gamification.badges.${badge.id}.description`, badge.description) as string);

                  return (
                    <div
                      key={badge.id}
                      className={`flex items-start gap-4 p-5 rounded-xl border ${isEarned ? "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10" : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-70"}`}
                    >
                      {displayIcon}
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-bold text-base ${isEarned ? "text-blue-900 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}>
                          {displayName}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-200 mt-1 line-clamp-3">
                          {displayDesc}
                        </p>
                        {!isEarned && pct !== null && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>{progressItem!.current}/{progressItem!.target} {progressItem!.label}</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                              <div className="bg-blue-400 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )}
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
