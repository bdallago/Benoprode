"use client";

import { useState, useEffect, createContext, useContext, useRef } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, updateDoc, increment } from "firebase/firestore";
import { auth, db } from "../firebase";
import { Navbar } from "./Navbar";
import '../i18n';
import { useTranslation } from 'react-i18next';
import { usePathname, useRouter } from 'next/navigation';
import { getUserBadges, BADGES } from "../lib/gamification";
import { X } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { TooltipProvider } from "./ui/tooltip";
import footerImg from "../../public/Footer - el Prode de Beno.jpg";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, isAdmin: false });

export const useAuth = () => useContext(AuthContext);

function GlobalBadgeListener({ user }: { user: User }) {
  const [badgeQueue, setBadgeQueue] = useState<any[]>([]);
  const [currentBadge, setCurrentBadge] = useState<any | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
    audioRef.current.volume = 0.5;
  }, []);

  useEffect(() => {
    if (!user) return;

    let myPoints = 0;
    let isLeagueCreatorOrMember = false;
    let inBenoliga = false;
    let hasPerfectGroup = false; // Simplified for now
    let hasInvitedFriends = false; // Simplified for now
    let hasSavedPredictions = false;
    let lockedEarly = false;
    let userData: any = null;

    const unsubscribeUser = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        userData = data;
        myPoints = data.totalPoints || 0;
        hasInvitedFriends = (data.referralsCount || 0) > 0;
        hasSavedPredictions = !!data.hasSavedPredictions;
        lockedEarly = !!data.lockedEarly;
        checkBadges();
      }
    });

    const unsubscribePredictions = onSnapshot(doc(db, "predictions", user.uid), (docSnap) => {
      if (docSnap.exists() && userData) {
        const data = docSnap.data();
        let changed = false;
        
        if (!userData.hasSavedPredictions) {
          hasSavedPredictions = true;
          changed = true;
        }
        
        if (data.isLocked && data.updatedAt) {
          // Check if locked before June 1st 2026
          const lockedDate = new Date(data.updatedAt);
          const deadline = new Date("2026-06-01T00:00:00Z");
          if (lockedDate < deadline && !userData.lockedEarly) {
            lockedEarly = true; // Confiado unlocked
            changed = true;
          }
        }
        
        if (changed) {
          updateDoc(doc(db, "users", user.uid), {
            hasSavedPredictions,
            lockedEarly
          }).catch(console.error);
        }
        
        checkBadges();
      }
    });

    const unsubscribeLeagues = onSnapshot(collection(db, "leagues"), (snapshot) => {
      if (!userData) return;
      const leagues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const userLeagues = leagues.filter((l: any) => l.members?.includes(user.uid) || l.createdBy === user.uid);
      
      const newIsLeagueCreatorOrMember = userLeagues.length > 0;
      const newInBenoliga = userLeagues.some((l: any) => l.name.toLowerCase().includes('benoliga') || l.id === 'benoliga');
      
      if (newIsLeagueCreatorOrMember !== userData.inPrivateLeague || newInBenoliga !== userData.inBenoliga) {
        updateDoc(doc(db, "users", user.uid), {
           inPrivateLeague: newIsLeagueCreatorOrMember,
           inBenoliga: newInBenoliga
        }).catch(console.error);
      }
      
      isLeagueCreatorOrMember = newIsLeagueCreatorOrMember;
      inBenoliga = newInBenoliga;
      checkBadges();
    });

    const checkBadges = () => {
      // We need userStats here. Let's create a dummy one based on what we have
      const userStats = {
        referralsCount: hasInvitedFriends ? 1 : 0,
        inBenoliga,
        inPrivateLeague: isLeagueCreatorOrMember,
        hasSavedPredictions,
        lockedEarly
      };
      if (!userData) return;
      const userBadgeIds = Array.from(new Set(getUserBadges(myPoints, userStats)));
      const userBadgesFull = userBadgeIds.map(id => BADGES.find(b => b.id === id)).filter(Boolean);
      
      const storedBadges = userData.earnedBadges || [];
      const newEarnedBadges = userBadgesFull.filter(b => b && !storedBadges.includes(b.id));
      
      if (newEarnedBadges.length > 0) {
        setBadgeQueue((prev: any[]) => {
          const existingIds = prev.map(p => p.id);
          const toAdd = newEarnedBadges.filter(b => b && !existingIds.includes(b.id));
          return [...prev, ...(toAdd as any[])];
        });
        
        const newBadgesList = Array.from(new Set([...storedBadges, ...userBadgeIds]));
        updateDoc(doc(db, "users", user.uid), {
          earnedBadges: newBadgesList
        }).catch(console.error);
        
        // Also update local data to prevent immediate refire
        userData.earnedBadges = newBadgesList;
      } else if (storedBadges.length === 0 && userBadgeIds.length > 0) {
        updateDoc(doc(db, "users", user.uid), {
          earnedBadges: userBadgeIds
        }).catch(console.error);
        userData.earnedBadges = userBadgeIds;
      }
    };

    return () => {
      unsubscribeUser();
      unsubscribeLeagues();
      unsubscribePredictions();
    };
  }, [user]);

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
          playPromise.catch(e => {
            // normal behavior in modern browsers when no interaction yet
          });
        }
      }
      
      const timer = setTimeout(() => {
        setCurrentBadge(null);
        setBadgeQueue((prev: any[]) => prev.slice(1));
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [currentBadge]);

  if (!currentBadge) return null;

  return (
    <div key={currentBadge.id} className="fixed top-20 right-4 z-50 animate-in slide-in-from-top-10 fade-in duration-500">
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white p-4 rounded-lg shadow-2xl border-2 border-sky-300 flex items-center gap-4 max-w-sm relative pr-10">
        <button 
          onClick={() => {
            setCurrentBadge(null);
            setBadgeQueue((prev: any[]) => prev.slice(1));
          }} 
          className="absolute top-2 right-2 text-sky-200 hover:text-white transition-colors"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="text-4xl animate-bounce">{currentBadge.icon}</div>
        <div>
          <p className="text-xs font-bold text-sky-100 uppercase tracking-wider">¡Nueva Medalla Desbloqueada!</p>
          <h4 className="font-bold text-lg">{currentBadge.name}</h4>
          <p className="text-sm text-sky-50">{currentBadge.description}</p>
        </div>
      </div>
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false); // Unblock UI immediately after auth state is known
      
      if (currentUser) {
        try {
          const isAdminEmail = currentUser.email?.toLowerCase() === "bdallago01@gmail.com";
          
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
            
            const refId = localStorage.getItem('referralId');
            
            await setDoc(userRef, {
              uid: currentUser.uid,
              displayName: currentUser.displayName || "Usuario",
              email: currentUser.email || `${currentUser.uid}@no-email.com`,
              photoURL: currentUser.photoURL || "",
              role: role,
              totalPoints: 0,
              referralsCount: 0,
              referredBy: refId || null,
              lastLogin: new Date().toISOString(),
              tourCompleted: false
            });
            
            if (refId && refId !== currentUser.uid) {
              try {
                const referrerRef = doc(db, "users", refId);
                const referrerSnap = await getDoc(referrerRef);
                if (referrerSnap.exists()) {
                  await updateDoc(referrerRef, {
                    referralsCount: increment(1)
                  });
                }
              } catch (err) {
                console.error("Error updating referrer points:", err);
              }
            }
            
            // New user
            // Clear local storage badges for this user since they are starting fresh
            localStorage.removeItem(`user_badges_${currentUser.uid}`);
          } else {
            const userData = userSnap.data();
            const currentRole = userData.role;
            setIsAdmin(isAdminEmail || currentRole === "admin");
            
            const updates: any = { lastLogin: new Date().toISOString() };
            if (isAdminEmail && currentRole !== "admin") {
              updates.role = "admin";
            } else if (!currentRole) {
              updates.role = "player";
            }
            if (userData.totalPoints == null) {
              updates.totalPoints = 0;
            }
            if (!userData.uid) updates.uid = currentUser.uid;
            if (!userData.displayName) updates.displayName = currentUser.displayName || "Usuario";
            if (!userData.email) updates.email = currentUser.email || `${currentUser.uid}@no-email.com`;
            if (userData.chatWarnings == null) updates.chatWarnings = 0;
            if (userData.isChatBanned == null) updates.isChatBanned = false;
            
            await setDoc(userRef, updates, { merge: true });
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
                  isPublic: true
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <AuthContext.Provider value={{ user, loading, isAdmin }}>
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
          <Navbar user={user} isAdmin={isAdmin} />
          {user && <GlobalBadgeListener user={user} />}
          <main className="container mx-auto px-4 py-8 flex-grow">
            {children}
          </main>
          
          <footer 
            className="w-full text-white pt-6 pb-24 md:py-6 mt-auto border-t border-blue-800/30 dark:border-gray-800 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${footerImg.src}")` }}
          >
            <div className="container mx-auto px-4 text-center space-y-2 text-sm text-blue-200 dark:text-gray-400">
              <p>Este Prode fue realizado por <a href="https://x.com/imbenodl" target="_blank" rel="noopener noreferrer" className="text-white hover:text-blue-300 font-medium transition-colors">@imbenodl</a></p>
              <p>Contacto: <a href="mailto:bdallago01@gmail.com" className="text-white hover:text-blue-300 transition-colors">bdallago01@gmail.com</a></p>
            </div>
          </footer>
        </div>
      </AuthContext.Provider>
    </TooltipProvider>
  );
}
