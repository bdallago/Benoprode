"use client";

import { useState, useEffect, createContext, useContext, useRef } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  updateDoc,
  increment,
  arrayUnion,
  getDocFromServer,
  DocumentSnapshot,
} from "firebase/firestore";
import { auth, db } from "../firebase";

// Mandatory connection test
async function testFirestoreConnection() {
  try {
    // We try to fetch a dummy doc strictly from server to "wake up" the connection
    await getDocFromServer(doc(db, "system_stats", "connection_test"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("offline")) {
      console.warn("Firestore initialization: client is offline.");
    }
  }
}

testFirestoreConnection();
import { Navbar } from "./Navbar";
import "../i18n";
import { useTranslation } from "react-i18next";
import { usePathname, useRouter } from "next/navigation";
import { getUserBadges, BADGES } from "../lib/gamification";
import { X, MessageCircle } from "lucide-react";
import { LiveChat } from "./LiveChat";
import { useTheme } from "./ThemeProvider";
import { TooltipProvider } from "./ui/tooltip";

export interface League {
  id: string;
  name: string;
  createdBy: string;
  members: string[];
  createdAt: string;
  isPublic: boolean;
  lastMessageAt?: string;
  lastMessageUserId?: string;
}

export interface UserStats {
  uid?: string;
  displayName?: string;
  photoURL?: string;
  email?: string;
  role?: string;
  totalPoints?: number;
  earnedBadges?: string[];
  activeDays?: string[];
  rank?: number;
  inBenoliga?: boolean;
  inPrivateLeague?: boolean;
  referralsCount?: number;
  hasSavedPredictions?: boolean;
  lockedEarly?: boolean;
  loginCount?: number;
  lastLogin?: string;
  [key: string]: unknown;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  globalLeagues: League[];
  hasMoreLeagues: boolean;
  loadMoreLeagues: () => Promise<void>;
  userStats: UserStats;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  globalLeagues: [],
  hasMoreLeagues: false,
  loadMoreLeagues: async () => {},
  userStats: {},
});

export const useAuth = () => useContext(AuthContext);

function GlobalBadgeListener({
  user,
  globalLeagues,
  userStats,
}: {
  user: User;
  globalLeagues: League[];
  userStats: UserStats;
}) {
  const [badgeQueue, setBadgeQueue] = useState<{ id: string; name: string; icon: string; description: string }[]>([]);
  const [currentBadge, setCurrentBadge] = useState<{ id: string; name: string; icon: string; description: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Refs so the stable subscription always reads fresh values without recreating
  const globalLeaguesRef = useRef(globalLeagues);
  const userStatsRef = useRef(userStats);
  const checkBadgesRef = useRef<(() => void) | null>(null);
  useEffect(() => { globalLeaguesRef.current = globalLeagues; });
  useEffect(() => { userStatsRef.current = userStats; });

  // Re-run badge check when userStats or globalLeagues change (no subscription involved)
  useEffect(() => {
    if (user && userStats && Object.keys(userStats).length > 0) {
      checkBadgesRef.current?.();
    }
  }, [user, userStats?.totalPoints, userStats?.earnedBadges?.length, globalLeagues?.length]);

  useEffect(() => {
    audioRef.current = new Audio("/badge-sound.mp3");
    audioRef.current.volume = 0.5;
  }, []);

  useEffect(() => {
    if (!user) return;

    const checkBadges = () => {
      const stats = userStatsRef.current;
      const leagues = globalLeaguesRef.current;
      if (!stats) return;

      const myPoints = stats.totalPoints || 0;
      const hasInvitedFriends = (stats.referralsCount || 0) > 0;
      const hasSavedPredictions = !!stats.hasSavedPredictions;
      const lockedEarly = !!stats.lockedEarly;

      const userLeagues = leagues.filter(
        (l: any) => l.members?.includes(user.uid) || l.createdBy === user.uid,
      );
      const inBenoliga = userLeagues.some(
        (l: any) =>
          l.name?.toLowerCase().includes("beno") || l.id === "benoliga",
      );
      const inPrivateLeague = userLeagues.length > 0;

      const badgeCriteria = {
        referralsCount: hasInvitedFriends ? 1 : 0,
        inBenoliga,
        inPrivateLeague,
        hasSavedPredictions,
        lockedEarly,
      };

      const userBadgeIds = Array.from(
        new Set(getUserBadges(myPoints, badgeCriteria)),
      );
      const userBadgesFull = userBadgeIds
        .map((id) => BADGES.find((b) => b.id === id))
        .filter(Boolean);

      const storedBadges = stats.earnedBadges || [];
      const newEarnedBadges = userBadgesFull.filter(
        (b) => b && !storedBadges.includes(b.id),
      ) as { id: string; name: string; icon: string; description: string }[];

      if (newEarnedBadges.length > 0) {
        setBadgeQueue((prev) => {
          const existingIds = prev.map((p) => p.id);
          const toAdd = newEarnedBadges.filter((b) => !existingIds.includes(b.id));
          return [...prev, ...toAdd];
        });
        const newBadgesList = Array.from(
          new Set([...storedBadges, ...userBadgeIds]),
        );
        updateDoc(doc(db, "users", user.uid), {
          earnedBadges: newBadgesList,
        }).catch(e => console.warn('Badge persist failed:', e));
      } else if (storedBadges.length === 0 && userBadgeIds.length > 0) {
        updateDoc(doc(db, "users", user.uid), {
          earnedBadges: userBadgeIds,
        }).catch(e => console.warn('Badge persist failed:', e));
      }
    };

    checkBadgesRef.current = checkBadges;
    checkBadges();

    const unsubscribePredictions = onSnapshot(
      doc(db, "predictions", user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const stats = userStatsRef.current;
          let changed = false;
          let nextSavedPredictions = !!stats.hasSavedPredictions;
          let nextLockedEarly = !!stats.lockedEarly;

          if (!stats.hasSavedPredictions) {
            nextSavedPredictions = true;
            changed = true;
          }

          if (data.isLocked && data.updatedAt) {
            const lockedDate = new Date(data.updatedAt);
            const deadline = new Date("2026-06-01T00:00:00Z");
            if (lockedDate < deadline && !stats.lockedEarly) {
              nextLockedEarly = true;
              changed = true;
            }
          }

          if (changed) {
            updateDoc(doc(db, "users", user.uid), {
              hasSavedPredictions: nextSavedPredictions,
              lockedEarly: nextLockedEarly,
            }).catch(e => console.warn('Could not update prediction flags:', e));
          }
        }
        checkBadges();
      },
      (err) => {
        console.warn("Predictions snapshot error (idle/cancel):", err);
      }
    );

    return () => {
      unsubscribePredictions();
    };
  }, [user]); // Only recreate when user changes — globalLeagues/userStats are read via refs

  // Effect 1: Process the queue
  useEffect(() => {
    if (badgeQueue.length > 0 && !currentBadge) {
      const t = setTimeout(() => {
        setCurrentBadge(badgeQueue[0]);
      }, 500); // 500ms delay between badges
      return () => clearTimeout(t);
    }
  }, [badgeQueue, currentBadge]);

  // Effect 2: Handle the active badge timer
  useEffect(() => {
    if (currentBadge) {
      if (audioRef.current) {
        // Only try to play if user interacted with document, otherwise ignore safely
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((e) => {
            // normal behavior in modern browsers when no interaction yet
          });
        }
      }

      const timer = setTimeout(() => {
        setCurrentBadge(null);
        setBadgeQueue((prev) => prev.slice(1));
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [currentBadge]);

  if (!currentBadge) return null;

  return (
    <div
      key={currentBadge.id}
      className="fixed top-20 right-4 z-50 animate-in slide-in-from-top-10 fade-in duration-500"
    >
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white p-4 rounded-lg shadow-2xl border-2 border-sky-300 flex items-center gap-4 max-w-sm relative pr-10">
        <button
          onClick={() => {
            setCurrentBadge(null);
            setBadgeQueue((prev) => prev.slice(1));
          }}
          className="absolute top-2 right-2 text-sky-200 hover:text-white transition-colors"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="text-4xl animate-bounce">{currentBadge.icon}</div>
        <div>
          <p className="text-xs font-bold text-sky-100 uppercase tracking-wider">
            ¡Nueva Medalla Desbloqueada!
          </p>
          <h4 className="font-bold text-lg">{currentBadge.name}</h4>
          <p className="text-sm text-sky-50">{currentBadge.description}</p>
        </div>
      </div>
    </div>
  );
}

function LiveChatFAB({ user }: { user: User }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'liveChat'), orderBy('createdAt', 'desc'), limit(1));
    const unsubscribe = onSnapshot(q, (snap) => {
      if (snap.empty) { setHasUnread(false); return; }
      const last = snap.docs[0].data();
      if (last.userId === user.uid) { setHasUnread(false); return; }
      const createdAt = last.createdAt;
      const lastTime = createdAt?.toDate ? createdAt.toDate().toISOString() : '';
      const lastRead = localStorage.getItem('lastReadLiveChat') ?? '';
      setHasUnread(!!lastTime && lastTime > lastRead);
    }, () => {});
    return () => unsubscribe();
  }, [user.uid]); // Stable — no isOpen dep to avoid teardown on every open/close

  // Separate effect: mark as read whenever the panel opens
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      localStorage.setItem('lastReadLiveChat', new Date().toISOString());
    }
  }, [isOpen]);

  const openChat = () => {
    setIsOpen(true);
    setHasUnread(false);
    localStorage.setItem('lastReadLiveChat', new Date().toISOString());
  };

  return (
    <>
      {/* FAB — above mobile bottom nav (h-16 + pb-safe ≈ 80–100px, so bottom-28 clears it) */}
      <button
        onClick={isOpen ? () => setIsOpen(false) : openChat}
        className="fixed bottom-28 right-5 md:bottom-8 md:right-8 z-[60] w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl flex items-center justify-center transition-colors"
        title="Chat en vivo"
      >
        <MessageCircle className="w-6 h-6" />
        {hasUnread && (
          <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white" />
        )}
      </button>

      {/* Panel — mobile: nearly full-width, above FAB; desktop: right-anchored 384px panel */}
      {isOpen && (
        <div
          className="fixed inset-x-4 bottom-48 md:inset-x-auto md:right-8 md:bottom-24 md:w-96 z-[60] shadow-2xl rounded-xl overflow-hidden"
          style={{ height: 'min(520px, calc(100dvh - 14rem))' }}
        >
          <LiveChat onClose={() => setIsOpen(false)} />
        </div>
      )}
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [globalLeagues, setGlobalLeagues] = useState<League[]>([]);
  const [hasMoreLeagues, setHasMoreLeagues] = useState(false);
  const lastLeagueDocRef = useRef<DocumentSnapshot | null>(null);

  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();

  useEffect(() => {
    if (!user) {
      setUserStats({});
      setGlobalLeagues([]);
      setHasMoreLeagues(false);
      lastLeagueDocRef.current = null;
      return;
    }

    const unsubscribeUser = onSnapshot(
      doc(db, "users", user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          setUserStats(docSnap.data());
        }
      },
      (err) => {
        console.warn("User document snapshot error (idle/cancel):", err);
      }
    );

    // Scoped listener: only the user's own leagues (first 20), no unbounded collection read
    const unsubscribeLeagues = onSnapshot(
      query(collection(db, "leagues"), orderBy("createdAt", "desc"), limit(20)),
      (snapshot) => {
        lastLeagueDocRef.current = snapshot.docs[snapshot.docs.length - 1] ?? null;
        setHasMoreLeagues(snapshot.docs.length === 20);
        setGlobalLeagues(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as League)));
      },
      (err) => {
        console.warn("Leagues snapshot error (idle/cancel):", err);
      }
    );

    return () => {
      unsubscribeUser();
      unsubscribeLeagues();
    };
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false); // Unblock UI immediately after auth state is known

      if (currentUser) {
        try {
          const isAdminEmail =
            currentUser.email?.toLowerCase() === "bdallago01@gmail.com";

          // Check if user exists in db, if not create
          const userRef = doc(db, "users", currentUser.uid);
          let userSnap;
          try {
            userSnap = await getDoc(userRef);
          } catch (e: any) {
            if (e.message?.includes("offline")) {
              console.warn("Client is offline, skipping user DB sync.");
              // Fallback to basic admin check based on email since we can't read DB
              setIsAdmin(isAdminEmail);
              return;
            }
            throw e;
          }

          if (!userSnap.exists()) {
            const role = isAdminEmail ? "admin" : "player";
            setIsAdmin(isAdminEmail);

            const refId = localStorage.getItem("referralId");
            const todayStr = new Date().toISOString().split("T")[0];

            await setDoc(userRef, {
              uid: currentUser.uid,
              displayName: currentUser.displayName || "Usuario",
              email: currentUser.email || `${currentUser.uid}@no-email.com`,
              photoURL: currentUser.photoURL || "",
              role: role,
              totalPoints: 0,
              referralsCount: 0,
              referredBy: refId || null,
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              activeDays: [todayStr],
              loginCount: 1,
              tourCompleted: false,
              chatWarnings: 0,
              isChatBanned: false,
            });

            if (refId && refId !== currentUser.uid) {
              try {
                const referrerRef = doc(db, "users", refId);
                const referrerSnap = await getDoc(referrerRef);
                if (referrerSnap.exists()) {
                  await updateDoc(referrerRef, {
                    referralsCount: increment(1),
                  });
                }
              } catch (err) {
                console.error("Error updating referrer points:", err);
              }
            }

            localStorage.removeItem(`user_badges_${currentUser.uid}`);
          } else {
            const userData = userSnap.data();
            const currentRole = userData.role;
            setIsAdmin(isAdminEmail || currentRole === "admin");

            const todayStr = new Date().toISOString().split("T")[0];
            const updates: Record<string, unknown> = {
              lastLogin: new Date().toISOString(),
              loginCount: increment(1),
              activeDays: arrayUnion(todayStr),
              uid: currentUser.uid,
            };

            if (isAdminEmail && currentRole !== "admin") updates.role = "admin";
            else if (!currentRole) updates.role = "player";

            if (userData.totalPoints == null) updates.totalPoints = 0;
            if (!userData.displayName)
              updates.displayName = currentUser.displayName || "Usuario";
            if (!userData.email)
              updates.email =
                currentUser.email || `${currentUser.uid}@no-email.com`;
            if (userData.chatWarnings == null) updates.chatWarnings = 0;
            if (userData.isChatBanned == null) updates.isChatBanned = false;

            await updateDoc(userRef, updates);
          }

          // Auto-create Benoliga if admin
          if (isAdminEmail) {
            try {
              const benoligaRef = doc(db, "leagues", "benoliga");
              const benoligaSnap = await getDoc(benoligaRef);
              if (!benoligaSnap.exists()) {
                await setDoc(benoligaRef, {
                  name: "La Benoliga",
                  createdBy: currentUser.uid,
                  members: [currentUser.uid],
                  createdAt: new Date().toISOString(),
                  isPublic: true,
                });
              }
            } catch (e) {
              console.error("Error auto-creating Benoliga", e);
            }
          }
        } catch (error) {
          console.error("Error in auth state change:", error);
        }
      } else {
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadMoreLeagues = async () => {
    if (!user || !lastLeagueDocRef.current) return;
    try {
      const snap = await getDocs(
        query(collection(db, "leagues"), orderBy("createdAt", "desc"), startAfter(lastLeagueDocRef.current), limit(20))
      );
      lastLeagueDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
      setHasMoreLeagues(snap.docs.length === 20);
      setGlobalLeagues((prev) => [...prev, ...snap.docs.map((d) => ({ id: d.id, ...d.data() } as League))]);
    } catch (e) {
      console.warn("loadMoreLeagues failed:", e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <AuthContext.Provider value={{ user, loading, isAdmin, globalLeagues, hasMoreLeagues, loadMoreLeagues, userStats }}>
        <div className="min-h-[100dvh] flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
          <Navbar user={user} isAdmin={isAdmin} />
          {user && (
            <GlobalBadgeListener user={user} globalLeagues={globalLeagues} userStats={userStats} />
          )}
          {user && <LiveChatFAB user={user} />}
          <main className="container mx-auto px-4 py-8 flex-grow">
            {children}
          </main>

          <footer
            className="w-full text-white pt-6 pb-24 md:py-6 mt-auto border-t border-blue-800/30 dark:border-gray-800 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: 'url("/footer.jpeg")' }}
          >
            <div className="container mx-auto px-4 text-center space-y-2 text-sm text-blue-200 dark:text-gray-200">
              <p>
                {t("footer.developedBy")}{" "}
                <a
                  href="https://x.com/imbenodl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-blue-300 font-medium transition-colors"
                >
                  @imbenodl
                </a>
              </p>
              <p>
                {t("footer.contact")}{" "}
                <a
                  href="mailto:bdallago01@gmail.com"
                  className="text-white hover:text-blue-300 transition-colors"
                >
                  bdallago01@gmail.com
                </a>
              </p>
            </div>
          </footer>
        </div>
      </AuthContext.Provider>
    </TooltipProvider>
  );
}
