import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, arrayUnion, arrayRemove, deleteDoc, getDocs, where, documentId } from "firebase/firestore";
import { db } from "../firebase";
import { useTranslation } from 'react-i18next';
import { useSearchParams } from "next/navigation";

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
  }, [selectedLeague?.members]);

  useEffect(() => {
    if (!userId) return;

    const unsubscribeLeagues = onSnapshot(collection(db, "leagues"), (snapshot) => {
      const leaguesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as League));
      setLeagues(leaguesData);
      
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

      if (leagueId) {
        const league = leaguesData.find(l => l.id === leagueId);
        if (league) {
          if (!league.members.includes(userId)) {
            setPendingInvitation({ league, inviter });
            setLoading(false);
          } else {
            if (typeof window !== 'undefined') {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
            setSelectedLeague(league);
            // loading will be set false by the league members fetch
          }
        } else {
           setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeLeagues();
    };
  }, [userId, searchParams, t]);

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
    const league = leagues.find(l => l.id === leagueId);
    if (league && league.members.length === 1 && league.members[0] === userId) {
      // If last member, delete the league
      await deleteDoc(doc(db, "leagues", leagueId));
    } else {
      await updateDoc(doc(db, "leagues", leagueId), {
        members: arrayRemove(userId)
      });
    }
    if (selectedLeague?.id === leagueId) setSelectedLeague(null);
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
