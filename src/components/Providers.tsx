"use client";

import { useState, useEffect, createContext, useContext, useRef } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot, collection, query, where } from "firebase/firestore";
import { auth, db } from "../firebase";
import { Navbar } from "./Navbar";
import { Joyride, STATUS } from 'react-joyride';
import '../i18n';
import { useTranslation } from 'react-i18next';
import { usePathname } from 'next/navigation';
import { getUserBadges } from "../lib/gamification";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  advanceTour: () => void;
  tourStepIndex: number;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, isAdmin: false, advanceTour: () => {}, tourStepIndex: 0 });

export const useAuth = () => useContext(AuthContext);

function GlobalBadgeListener({ user }: { user: User }) {
  const [newBadge, setNewBadge] = useState<any | null>(null);
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

    const unsubscribeUser = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        myPoints = docSnap.data().totalPoints || 0;
        checkBadges();
      }
    });

    const unsubscribeLeagues = onSnapshot(collection(db, "leagues"), (snapshot) => {
      const leagues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const userLeagues = leagues.filter((l: any) => l.members?.includes(user.uid) || l.createdBy === user.uid);
      
      isLeagueCreatorOrMember = userLeagues.length > 0;
      inBenoliga = userLeagues.some((l: any) => l.name.toLowerCase().includes('benoliga') || l.id === 'benoliga');
      checkBadges();
    });

    const checkBadges = () => {
      const userBadges = getUserBadges(myPoints, isLeagueCreatorOrMember, inBenoliga, hasPerfectGroup, hasInvitedFriends);
      const userBadgeIds = userBadges.map(b => b?.id);
      
      const storedBadgesKey = `user_badges_${user.uid}`;
      const storedBadgesStr = localStorage.getItem(storedBadgesKey);
      const storedBadges = storedBadgesStr ? JSON.parse(storedBadgesStr) : [];
      
      const newEarnedBadges = userBadges.filter(b => b && !storedBadges.includes(b.id));
      
      if (newEarnedBadges.length > 0) {
        setNewBadge(newEarnedBadges[0] || null);
        if (audioRef.current) {
          audioRef.current.play().catch(e => console.log("Audio play failed:", e));
        }
        localStorage.setItem(storedBadgesKey, JSON.stringify(userBadgeIds));
        
        // Hide notification after 5 seconds
        setTimeout(() => {
          setNewBadge(null);
        }, 5000);
      } else if (!storedBadgesStr && userBadges.length > 0) {
        localStorage.setItem(storedBadgesKey, JSON.stringify(userBadgeIds));
      }
    };

    return () => {
      unsubscribeUser();
      unsubscribeLeagues();
    };
  }, [user]);

  if (!newBadge) return null;

  return (
    <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-top-10 fade-in duration-500">
      <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-4 rounded-lg shadow-2xl border-2 border-yellow-300 flex items-center gap-4 max-w-sm">
        <div className="text-4xl animate-bounce">{newBadge.icon}</div>
        <div>
          <p className="text-xs font-bold text-yellow-100 uppercase tracking-wider">¡Nueva Medalla Desbloqueada!</p>
          <h4 className="font-bold text-lg">{newBadge.name}</h4>
          <p className="text-sm text-yellow-50">{newBadge.description}</p>
        </div>
      </div>
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const { t } = useTranslation();
  const pathname = usePathname();

  const advanceTour = () => {
    setStepIndex(prev => prev + 1);
  };

  useEffect(() => {
    if (!runTour) return;
    
    if (stepIndex === 0 && pathname === '/predictions') {
      setStepIndex(1);
    } else if (stepIndex === 7 && pathname === '/leagues') {
      setStepIndex(8);
    } else if (stepIndex === 10 && pathname === '/dashboard') {
      setStepIndex(11);
    } else if (stepIndex === 13 && pathname === '/instructions') {
      setStepIndex(14);
    }
  }, [pathname, stepIndex, runTour]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        setUser(currentUser);
        if (currentUser) {
          const isAdminEmail = currentUser.email?.toLowerCase() === "bdallago01@gmail.com";
          
          // Check if user exists in db, if not create
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            const role = isAdminEmail ? "admin" : "player";
            setIsAdmin(isAdminEmail);
            await setDoc(userRef, {
              uid: currentUser.uid,
              displayName: currentUser.displayName || "Usuario",
              email: currentUser.email,
              photoURL: currentUser.photoURL || "",
              role: role,
              totalPoints: 0,
              lastLogin: new Date().toISOString(),
              tourCompleted: false
            });
            // New user, do not run the tour for now
            setRunTour(false);
          } else {
            const userData = userSnap.data();
            const currentRole = userData.role;
            setIsAdmin(isAdminEmail || currentRole === "admin");
            
            const updates: any = { lastLogin: new Date().toISOString() };
            if (isAdminEmail && currentRole !== "admin") {
              updates.role = "admin";
            }
            await setDoc(userRef, updates, { merge: true });
            
            // Tutorial disabled
            setRunTour(false);
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
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Error in auth state change:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleJoyrideCallback = async (data: any) => {
    const { action, index, status, type } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    
    if (finishedStatuses.includes(status)) {
      setRunTour(false);
      setStepIndex(0);
      if (user) {
        try {
          await setDoc(doc(db, "users", user.uid), { tourCompleted: true }, { merge: true });
        } catch (error) {
          console.error("Error updating tour status:", error);
        }
      }
    } else if (type === 'step:after') {
      // Update state to advance the tour
      setStepIndex(index + (action === 'prev' ? -1 : 1));
    }
  };

  const tourSteps = [
    {
      target: 'a[href="/predictions"]',
      content: <div className="text-justify w-full">¡Bienvenido a El Prode de Beno! Te mostramos cómo jugar en unos simples pasos. Hacé click acá en "Predicciones" para continuar.</div>,
      disableBeacon: true,
      spotlightClicks: true,
      buttons: [] as ('back' | 'close' | 'primary' | 'skip')[]
    },
    {
      target: '.group-card-A',
      content: <div className="text-justify w-full">Estas son las predicciones de la fase de grupos. Acá vas a poder ordenar a las selecciones, grupo por grupo, según como vos crees que van a ser sus posiciones finales. Podes guardar las veces que quieras! Y si te gusta el riesgo o estas super seguro, ya podes fijarlas con el boton "fijar predicciones". Ojo! Esto lo vas a poder hacer una sola vez y se te bloquean las selecciones. Todos las selecciones de la fase de grupo se van a bloquear de manera automatica el 8 de Junio a las 00:00.</div>,
    },
    {
      target: '.group-card-A',
      content: <div className="text-justify w-full">Vamos a probar nuestra primera predicción. Agarrá y arrastrá los equipos y ordenalos como quieras.</div>,
      spotlightClicks: true,
      hideOverlay: true,
      buttons: [] as ('back' | 'close' | 'primary' | 'skip')[]
    },
    {
      target: '.save-draft-btn',
      content: <div className="text-justify w-full">Luego, apretá en "Guardar borrador".</div>,
      spotlightClicks: true,
      hideOverlay: true,
      buttons: [] as ('back' | 'close' | 'primary' | 'skip')[]
    },
    {
      target: 'body',
      placement: 'center' as const,
      content: <div className="text-justify w-full">Listo! ya hiciste un borrador de tu primera predicción, más tarde vas a poder hacerlo con el resto de grupos</div>,
    },
    {
      target: '.tab-specials',
      content: <div className="text-justify w-full">Tambien estan las preguntas especiales! Están en esta pestaña de Predicciones y suman muchos puntos extra. Hace click en "Preguntas Especiales".</div>,
      spotlightClicks: true,
      buttons: [] as ('back' | 'close' | 'primary' | 'skip')[]
    },
    {
      target: '.special-questions-container',
      content: <div className="text-justify w-full">Acá vas a poder desplegar otro tipo de conocimientos futbolísticos. Cada pregunta que aciertes suma 10 puntos! No te olvides de completarlas luego</div>,
    },
    {
      target: 'a[href="/leagues"]',
      content: <div className="text-justify w-full">Creá o unite a una liga: Competí contra tus amigos o compañeros de trabajo en torneos privados. Hace click en la pestaña "Torneos".</div>,
      spotlightClicks: true,
      buttons: [] as ('back' | 'close' | 'primary' | 'skip')[]
    },
    {
      target: '.benoliga-card',
      content: <div className="text-justify w-full">Mirá, ya hay un torneo! Beno te invita a su desafío con "La Benoliga".</div>,
    },
    {
      target: '.create-league-btn',
      content: <div className="text-justify w-full">Podes crear tus propios torneos, tanto públicos, para que cualquiera participe, como privados, para que compartas el link con tus amigos y jueguen solo entre ustedes</div>,
    },
    {
      target: 'a[href="/dashboard"]',
      content: <div className="text-justify w-full">Seguí tu posición en el Ranking Global, hace click acá y vamos a verlo!</div>,
      spotlightClicks: true,
      buttons: [] as ('back' | 'close' | 'primary' | 'skip')[]
    },
    {
      target: '.top-5-ranking',
      content: <div className="text-justify w-full">A medida que vayas obteniendo aciertos vas a sumar puntos. Tambien podes conseguir medallas!</div>,
    },
    {
      target: '.medals-section',
      content: <div className="text-justify w-full">En "Mis Medallas" vas a poder verlas a medidas que las consigas. Baja hasta la sección "Medallas" para enterarte cuantas hay y como conseguirlas</div>,
    },
    {
      target: 'a[href="/instructions"]',
      content: <div className="text-justify w-full">Acá tenes las reglas de como funciona el prode y como sumás puntos, vamos allá!</div>,
      spotlightClicks: true,
      buttons: [] as ('back' | 'close' | 'primary' | 'skip')[]
    },
    {
      target: 'body',
      placement: 'center' as const,
      content: <div className="text-justify w-full">Siempre que tengas dudas, podes consultar el reglamento. Si tu duda no esta acá, en la pestaña de inicio podes contactar directamente con Beno, el te va a responder!</div>,
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, advanceTour, tourStepIndex: stepIndex }}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 pb-20 md:pb-0">
        <Navbar user={user} isAdmin={isAdmin} />
        {user && <GlobalBadgeListener user={user} />}
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
        {user && (
          <Joyride
            steps={tourSteps}
            run={runTour}
            stepIndex={stepIndex}
            continuous
            options={{
              buttons: ['back', 'close', 'primary', 'skip'],
              zIndex: 10000,
            }}
            locale={{ skip: 'Omitir tutorial', last: 'Finalizar tutorial', next: 'Siguiente', back: 'Atrás' }}
            onEvent={handleJoyrideCallback}
          />
        )}
      </div>
    </AuthContext.Provider>
  );
}
