import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, limit, getDocs, startAfter, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Trophy, Search, ChevronLeft, ChevronRight, Target, UserPlus, Check } from 'lucide-react';
import { Button } from './ui/button';
import { useTranslation } from 'react-i18next';

export function GlobalLeaderboard({ currentUser, onUserClick }: { currentUser: User, onUserClick?: (u: any) => void }) {
  const { t } = useTranslation();
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // States to track sent requests in this session to prevent double-clicks
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [friends, setFriends] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentUser?.uid) return;
    const fetchData = async () => {
      try {
        const qReq = query(
          collection(db, "friendRequests"),
          where("fromUserId", "==", currentUser.uid),
          where("status", "==", "pending")
        );
        const snapReq = await getDocs(qReq);
        const pendingUids = new Set<string>();
        snapReq.forEach(doc => {
          pendingUids.add(doc.data().toUserId);
        });
        setSentRequests(pendingUids);

        // Fetch friendships
        const qFriends1 = query(collection(db, "friendships"), where("user1Id", "==", currentUser.uid));
        const qFriends2 = query(collection(db, "friendships"), where("user2Id", "==", currentUser.uid));
        
        const [snap1, snap2] = await Promise.all([getDocs(qFriends1), getDocs(qFriends2)]);
        const friendsUids = new Set<string>();
        snap1.forEach(doc => friendsUids.add(doc.data().user2Id));
        snap2.forEach(doc => friendsUids.add(doc.data().user1Id));
        setFriends(friendsUids);
      } catch (err) {
        console.error("Error fetching social data:", err);
      }
    };
    fetchData();
  }, [currentUser]);

  // Pagination state
  const [cursors, setCursors] = useState<any[]>([]); 
  const [page, setPage] = useState(0); 
  const [hasMore, setHasMore] = useState(true);

  const handleAddFriend = async (e: React.MouseEvent, targetUserId: string) => {
    e.stopPropagation();
    if (sentRequests.has(targetUserId)) return;

    try {
      // Create request
      await addDoc(collection(db, "friendRequests"), {
        fromUserId: currentUser.uid,
        toUserId: targetUserId,
        status: "pending",
        createdAt: new Date().toISOString()
      });
      
      // Notify them
      await addDoc(collection(db, "notifications"), {
        userId: targetUserId,
        type: "friend_request",
        title: "Nueva solicitud de amistad",
        message: `${currentUser.displayName || "Un usuario"} quiere añadirte como amigo.`,
        read: false,
        createdAt: new Date().toISOString(),
        actionUrl: `/profile?tab=friends`
      });

      setSentRequests(prev => {
        const next = new Set(prev);
        next.add(targetUserId);
        return next;
      });
    } catch (err) {
      console.error("Error sending friend request", err);
      alert("Hubo un error al enviar la solicitud.");
    }
  };

  const fetchPage = useCallback(async (dir: 'next' | 'prev' | 'first' | 'restore') => {
    setLoading(true);
    try {
      let q;
      
      if (searchQuery.trim().length > 2) {
        const searchTerm = searchQuery.trim();
        q = query(
          collection(db, "users"),
          where("displayName", ">=", searchTerm),
          where("displayName", "<=", searchTerm + '\uf8ff'),
          limit(25)
        );
      } else {
        if (dir === 'restore') {
          // Attempt to restore page
          let savedPage = 0;
          try {
            const saved = sessionStorage.getItem('globalLeaderboardPage');
            if (saved) savedPage = parseInt(saved, 10);
          } catch {}
          
          if (savedPage > 0) {
            const neededSize = (savedPage + 1) * 25;
            const bigQ = query(collection(db, "users"), orderBy("totalPoints", "desc"), limit(neededSize));
            const snap = await getDocs(bigQ);
            
            const startIdx = savedPage * 25;
            const fetchedPlayers = snap.docs.slice(startIdx, startIdx + 25).map(doc => ({ ...doc.data(), uid: doc.id }));
            
            if (fetchedPlayers.length > 0) {
              setPlayers(fetchedPlayers);
              const newCursors = [];
              for (let i = 24; i < snap.docs.length; i += 25) {
                newCursors.push(snap.docs[i]);
              }
              setCursors(newCursors);
              setPage(savedPage);
              setHasMore(snap.docs.length === neededSize);
              setLoading(false);
              return;
            } else {
              // fallback to page 0 if not enough data
              sessionStorage.removeItem('globalLeaderboardPage');
              dir = 'first';
            }
          } else {
             dir = 'first';
          }
        }
        
        if (dir === 'first') {
          q = query(collection(db, "users"), orderBy("totalPoints", "desc"), limit(25));
          setCursors([]);
          setPage(0);
          try { sessionStorage.setItem('globalLeaderboardPage', '0'); } catch {}
        } else if (dir === 'next') {
          const lastVisible = cursors[cursors.length - 1];
          q = query(collection(db, "users"), orderBy("totalPoints", "desc"), startAfter(lastVisible), limit(25));
          setPage(p => { const newP = p + 1; try { sessionStorage.setItem('globalLeaderboardPage', newP.toString()); } catch {} return newP; });
        } else if (dir === 'prev') {
          if (page - 2 < 0) {
            q = query(collection(db, "users"), orderBy("totalPoints", "desc"), limit(25));
            setCursors([]);
            setPage(0);
            try { sessionStorage.setItem('globalLeaderboardPage', '0'); } catch {}
          } else {
            const cursor = cursors[page - 2];
            q = query(collection(db, "users"), orderBy("totalPoints", "desc"), startAfter(cursor), limit(25));
            setCursors(prev => prev.slice(0, prev.length - 1));
            setPage(p => { const newP = p - 1; try { sessionStorage.setItem('globalLeaderboardPage', newP.toString()); } catch {} return newP; });
          }
        }
      }

      if (q) {
        const snap = await getDocs(q);
        const fetchedPlayers = snap.docs.map(doc => ({ ...doc.data(), uid: doc.id }));
        setPlayers(fetchedPlayers);
        
        if (!searchQuery.trim().length && (dir === 'next' || dir === 'first')) {
           const lastVisible = snap.docs[snap.docs.length - 1];
           if (lastVisible) {
             if (dir === 'first') setCursors([lastVisible]);
             else setCursors(prev => [...prev, lastVisible]);
           }
        }
        
        setHasMore(snap.docs.length === 25);
      }
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, cursors, page]);

  const [initialMount, setInitialMount] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (initialMount && !searchQuery.trim()) {
        fetchPage('restore');
        setInitialMount(false);
      } else {
        fetchPage('first');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, initialMount]);

  return (
    <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-md overflow-hidden">
      <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-400 text-xl m-0">
            <Trophy className="h-6 w-6" /> {t('dashboard.worldRanking', 'Ranking Mundial')}
          </CardTitle>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('dashboard.searchPlayer', 'Buscar jugador...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm dark:text-white dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => { setSearchQuery(currentUser.displayName || ''); }} className="w-full flex items-center gap-2">
               <Target className="w-4 h-4" /> {t('dashboard.findMe', 'Buscarme')}
            </Button>
          </div>
        </div>
      </CardHeader>

      <div className="overflow-auto max-h-[400px]">
        {loading ? (
          <div className="p-8 text-center text-gray-500">{t('dashboard.loadingRanking', 'Cargando clasificación...')}</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm">
                <th className="py-3 px-4 font-semibold w-24 text-center">{t('dashboard.tablePos', 'Pos')}</th>
                <th className="py-3 px-4 font-semibold">{t('dashboard.tablePlayer', 'Jugador')}</th>
                <th className="py-3 px-4 font-semibold text-right w-32">{t('dashboard.tablePoints', 'Puntos')}</th>
              </tr>
            </thead>
            <tbody>
              {players.length > 0 ? players.map((p, index) => {
                 const rank = searchQuery ? "-" : (page * 25) + index + 1;
                 const isMe = p.uid === currentUser.uid;
                 return (
                  <tr key={p.uid} onClick={() => onUserClick && onUserClick({ uid: p.uid, name: p.displayName || 'Usuario Anónimo', points: p.totalPoints || 0 })} className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/80 cursor-pointer transition-colors ${isMe ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
                    <td className="py-3 px-4 text-center font-bold text-gray-400">
                      {rank}
                    </td>
                    <td className="py-3 px-4 font-medium flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {p.photoURL ? (
                          <img src={p.photoURL} alt={p.displayName} className="w-8 h-8 rounded-full border border-gray-200" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                            {p.displayName ? p.displayName.charAt(0).toUpperCase() : '?'}
                          </div>
                        )}
                        <span className={isMe ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}>
                          {p.displayName || 'Usuario Anónimo'}
                          {isMe && <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">{t('profile.you', 'Tú')}</span>}
                        </span>
                      </div>
                      
                      {!isMe && (
                        friends.has(p.uid) ? (
                          <div className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
                            {t('profile.areFriends', 'Amigos')}
                          </div>
                        ) : sentRequests.has(p.uid) ? (
                          <div className="text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded border border-amber-200 dark:border-amber-800">
                            {t('profile.requestSent', 'Solicitud pendiente')}
                          </div>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="p-1.5 h-8 w-8 shrink-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full"
                            onClick={(e) => handleAddFriend(e, p.uid)}
                            title={t('profile.addFriend', 'Añadir amigo')}
                          >
                            <UserPlus className="w-5 h-5" />
                          </Button>
                        )
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-800 dark:text-gray-200">
                      {p.totalPoints || 0}
                    </td>
                  </tr>
                 );
              }) : (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-500">{t('dashboard.noPlayersFound', 'No se encontraron jugadores.')}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      
      {!searchQuery && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <Button variant="outline" size="sm" onClick={() => fetchPage('prev')} disabled={page === 0 || loading} className="flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> {t('dashboard.prevPage', 'Anterior')}
          </Button>
          <span className="text-sm font-medium text-gray-500">{t('dashboard.page', 'Página')} {page + 1}</span>
          <Button variant="outline" size="sm" onClick={() => fetchPage('next')} disabled={!hasMore || loading} className="flex items-center gap-1">
            {t('dashboard.nextPage', 'Siguiente')} <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </Card>
  );
}
