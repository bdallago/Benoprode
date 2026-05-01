import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, getDoc, arrayUnion, arrayRemove, deleteDoc, getDocs, where, documentId } from "firebase/firestore";
import { db } from "../firebase";
import { useTranslation } from 'react-i18next';
import { useSearchParams } from "next/navigation";
import { useAuth } from "../components/Providers";

export interface Player {
  uid: string;
  displayName: string;
  photoURL: string;
  totalPoints: number;
  role?: string;
}

export interface League {
  id: string;
  name: string;
  createdBy: string;
  members: string[];
  createdAt: string;
  isPublic: boolean;
}

export function useLeagues(userId: string) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const { globalLeagues } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [pendingInvitation, setPendingInvitation] = useState<{league: League, inviter: string} | null>(null);

  useEffect(() => {
    if (!selectedLeague?.members?.length) {
      setPlayers([]);
      return;
    }
    
    setLoading(true);
    const fetchLeagueMembers = async () => {
      try {
        const uids = selectedLeague.members;
        setLoading(true);
        // Clear previous players list to avoid showing stale data from another league
        setPlayers([]);

        // Batch in groups of 30 due to Firestore 'in' limits
        const chunks = [];
        for (let i = 0; i < uids.length; i += 30) {
          chunks.push(uids.slice(i, i + 30));
        }
        
        let allPlayers: Player[] = [];
        for (const chunk of chunks) {
          const q = query(
            collection(db, "users"), 
            where(documentId(), "in", chunk)
          );
          const snap = await getDocs(q);
          const p = snap.docs.map(d => ({ ...d.data(), uid: d.id } as Player));
          allPlayers = [...allPlayers, ...p];
        }

        // Diagnostic: if counts don't match, log the missing UIDs for debugging
        if (allPlayers.length < uids.length) {
          const foundUids = new Set(allPlayers.map(p => p.uid));
          const missing = uids.filter(uid => !foundUids.has(uid));
          console.warn("DISCREPANCIA DETECTADA en miembros de liga:", selectedLeague.name, "IDs sin perfil:", missing);
          
          // DO NOT process automatic cleanup here. New users might experience a split-second delay 
          // between creating their auth session and having their users document synced.
          // Doing arrayRemove here kicks legitimate new users out of their newly joined leagues instantly.
        }
        
        // sort by totalPoints desc
        allPlayers.sort((a, b) => b.totalPoints - a.totalPoints);
        setPlayers(allPlayers);
      } catch (err) {
        console.error("Error fetching league members", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeagueMembers();
  }, [JSON.stringify(selectedLeague?.members)]); 

  useEffect(() => {
    if (!userId || !globalLeagues) return;

    const leaguesData = globalLeagues as League[];
    setLeagues(leaguesData);
    
    // Update selected league if it exists to keep members list in sync
    if (selectedLeague) {
      const updated = leaguesData.find(l => l.id === selectedLeague.id);
      if (updated && JSON.stringify(updated.members) !== JSON.stringify(selectedLeague.members)) {
        setSelectedLeague(updated);
      }
    }
    
    // Handle auto-join via URL or Hash
    let leagueId = searchParams?.get('league');
    let inviter = searchParams?.get('inviter') || t('leagues.aPlayer');
    
    if (!leagueId && typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
      leagueId = hashParams.get('league');
      if (hashParams.has('inviter')) {
        inviter = hashParams.get('inviter') || t('leagues.aPlayer');
      }
    }

    if (inviter && inviter !== t('leagues.aPlayer') && typeof window !== 'undefined') {
      localStorage.setItem('referralId', inviter);
    }

    if (leagueId) {
      const league = leaguesData.find((l: any) => l.id === leagueId);
      if (league) {
        if (!league.members.includes(userId)) {
          setPendingInvitation({ league, inviter });
          setLoading(false);
        } else {
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          setSelectedLeague(league);
        }
      } else {
         setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [userId, searchParams, t, !!selectedLeague, globalLeagues]);

  const createLeague = async (name: string, isPublic: boolean) => {
    const newLeague = {
      name: name.trim(),
      createdBy: userId,
      members: [userId],
      createdAt: new Date().toISOString(),
      isPublic: isPublic
    };
    await addDoc(collection(db, "leagues"), newLeague);
  };

  const deleteLeague = async (leagueId: string) => {
    await deleteDoc(doc(db, "leagues", leagueId));
    if (selectedLeague?.id === leagueId) setSelectedLeague(null);
  };

  const joinLeague = async (leagueId: string) => {
    await updateDoc(doc(db, "leagues", leagueId), {
      members: arrayUnion(userId)
    });
  };

  const leaveLeague = async (leagueId: string) => {
    setLoading(true);
    try {
      const leagueRef = doc(db, "leagues", leagueId);
      const leagueSnap = await getDoc(leagueRef);
      
      if (leagueSnap.exists()) {
        const members = leagueSnap.data().members || [];
        // Check if I'm the last one in the ACTUAL database state
        if (members.length <= 1 && members.includes(userId)) {
          await deleteDoc(leagueRef);
        } else {
          await updateDoc(leagueRef, {
            members: arrayRemove(userId)
          });
        }
      }
      if (selectedLeague?.id === leagueId) setSelectedLeague(null);
    } catch (error) {
      console.error("Error al abandonar la liga:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (leagueId: string, memberId: string) => {
    await updateDoc(doc(db, "leagues", leagueId), {
      members: arrayRemove(memberId)
    });
  };

  return {
    players,
    leagues,
    loading,
    selectedLeague,
    setSelectedLeague,
    pendingInvitation,
    setPendingInvitation,
    createLeague,
    deleteLeague,
    joinLeague,
    leaveLeague,
    removeMember
  };
}
