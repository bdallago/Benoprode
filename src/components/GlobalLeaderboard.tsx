import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, orderBy, limit, getDocs, startAfter, where, addDoc, serverTimestamp, documentId, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Trophy, Search, ChevronLeft, ChevronRight, Target, UserPlus, Check, Users } from 'lucide-react';
import { Button } from './ui/button';
import { useTranslation } from 'react-i18next';

export function GlobalLeaderboard({ currentUser, onUserClick }: { currentUser: User, onUserClick?: (u: any) => void }) {
  const { t } = useTranslation();
  const [players, setPlayers] = useState<any[]>([]);
  const allPlayersCache = useRef<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFriendsOnly, setShowFriendsOnly] = useState(false);
  
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
  const [page, setPage] = useState(0); 
  const [hasMore, setHasMore] = useState(true);
  const [cursors, setCursors] = useState<any[]>([]);
  const fetchingRef = useRef(false);
  const lastPageRef = useRef(-1);

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
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    
    const sessionKey = 'globalLeaderboardPage';
    let targetPage = page;
    
    if (dir === 'first') {
      targetPage = 0;
    } else if (dir === 'next') {
      targetPage = page + 1;
    } else if (dir === 'prev') {
      targetPage = Math.max(0, page - 1);
    } else if (dir === 'restore') {
      try {
        const saved = sessionStorage.getItem(sessionKey);
        targetPage = saved ? parseInt(saved, 10) : 0;
      } catch {
        targetPage = 0;
      }
    }

    // If it's the same page we already have and not a forced restore/first, skip
    if (dir !== 'restore' && dir !== 'first' && targetPage === lastPageRef.current && players.length > 0) {
      fetchingRef.current = false;
      return;
    }

    setLoading(true);

    try {
      // 1. Try Cached API Data
      if (!searchQuery.trim() && !showFriendsOnly) {
        try {
          let playersData: any[] = allPlayersCache.current || [];
          
          if (playersData.length === 0) {
            const res = await fetch('/api/leaderboard');
            if (res.ok) {
              const data = await res.json();
              playersData = data.players || [];
              allPlayersCache.current = playersData;
            }
          }

          if (playersData.length > 0) {
            // deduplicate all full data once
            const uniqueMap = new Map();
            playersData.forEach((p: any) => { if (p && p.uid) uniqueMap.set(p.uid, p); });
            const allUnique = Array.from(uniqueMap.values());
            
            const start = targetPage * 25;
            const end = start + 25;
            const pagePlayers = allUnique.slice(start, end);

            console.log(`Leaderboard Paging: target=${targetPage}, from=${start}, count=${pagePlayers.length}, totalUnique=${allUnique.length}`);
            
            if (pagePlayers.length > 0) {
              console.log(`Leaderboard Success (Local Paging): Page=${targetPage}, from=${start}, count=${pagePlayers.length}, totalUnique=${allUnique.length}`);
              setPlayers(pagePlayers);
              setPage(targetPage);
              lastPageRef.current = targetPage;
              setHasMore(allUnique.length > end);
              try { sessionStorage.setItem(sessionKey, targetPage.toString()); } catch {}
              setLoading(false);
              fetchingRef.current = false;
              return;
            } else if (targetPage === 0 && allUnique.length > 0) {
              // This is p0 and it has players
              setPlayers(allUnique.slice(0, 25));
              setPage(0);
              lastPageRef.current = 0;
              setHasMore(allUnique.length > 25);
              setLoading(false);
              fetchingRef.current = false;
              return;
            } else if (allUnique.length > 0) {
              setHasMore(false);
            }
          }
        } catch (e) {
          console.error("Leaderboard fetch error:", e);
        }
      }

      // 2. Friends Filter
      if (showFriendsOnly) {
        // ... (friends logic looks mostly okay)
        // [omitted for brevity, keep existing friends logic]
        const friendsArr = Array.from(friends);
        const fetchedPlayers: any[] = [];
        for (let i = 0; i < friendsArr.length; i += 10) {
          const chunk = friendsArr.slice(i, i + 10);
          const chunkQ = query(collection(db, "users"), where(documentId(), "in", chunk));
          const snap = await getDocs(chunkQ);
          snap.docs.forEach(doc => fetchedPlayers.push({ ...doc.data(), uid: doc.id }));
        }
        if (currentUser?.uid) {
          const meQ = await getDoc(doc(db, "users", currentUser.uid));
          if (meQ.exists()) fetchedPlayers.push({ ...meQ.data(), uid: currentUser.uid });
        }
        fetchedPlayers.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
        const uniqueMap = new Map();
        fetchedPlayers.forEach(p => uniqueMap.set(p.uid, p));
        setPlayers(Array.from(uniqueMap.values()));
        setHasMore(false);
        setPage(0);
        setLoading(false);
        fetchingRef.current = false;
        return;
      }

      // 3. Fallback Live Queries (for search or API failure)
      let q;
      if (searchQuery.trim().length > 2) {
        const searchTerm = searchQuery.trim();
        q = query(
          collection(db, "users"),
          where("displayName", ">=", searchTerm),
          where("displayName", "<=", searchTerm + '\uf8ff'),
          limit(25)
        );
        setPage(0);
        setHasMore(false);
      } else {
        // Full manual query paging if API failed
        if (dir === 'first' || dir === 'restore' || (dir === 'next' && cursors.length === 0)) {
           q = query(collection(db, "users"), orderBy('totalPoints', "desc"), limit(25));
           if (dir !== 'restore') setCursors([]);
           setPage(0);
        } else if (dir === 'next' && cursors.length > 0) {
           const lastVisible = cursors[cursors.length - 1];
           q = query(collection(db, "users"), orderBy('totalPoints', "desc"), startAfter(lastVisible), limit(25));
           setPage(p => p + 1);
        } else if (dir === 'prev' && page > 0) {
           if (page === 1) {
             q = query(collection(db, "users"), orderBy('totalPoints', "desc"), limit(25));
             setCursors([]);
             setPage(0);
           } else {
             const prevCursor = cursors[page - 2];
             q = query(collection(db, "users"), orderBy('totalPoints', "desc"), startAfter(prevCursor), limit(25));
             setCursors(prev => prev.slice(0, prev.length - 1));
             setPage(p => p - 1);
           }
        }
      }

      if (q) {
        const snap = await getDocs(q);
        const fetched = snap.docs.map(doc => ({ ...doc.data(), uid: doc.id }));
        setPlayers(fetched);
        
        if (!searchQuery && (dir === 'next' || dir === 'first' || dir === 'restore')) {
          const last = snap.docs[snap.docs.length - 1];
          if (last) {
            if (dir === 'next') {
              setCursors(prev => [...prev, last]);
            } else {
              // first or restore (if it was p0)
              setCursors([last]);
            }
          }
        }
        setHasMore(snap.docs.length === 25);
      }
    } catch(e) {
      console.error("Leaderboard fallback error:", e);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [searchQuery, page, showFriendsOnly, friends, currentUser, cursors, players.length]);

  const [initialMount, setInitialMount] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Si el componente se está montando por primera vez, intentamos restaurar
      if (initialMount) {
        fetchPage('restore');
        setInitialMount(false);
      } else {
        // Solo reseteamos a la página 1 si los filtros realmente cambiaron
        fetchPage('first');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, showFriendsOnly]); // Quitamos page de aquí para evitar resets infinitos

  return (
    <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-md overflow-hidden">
      <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-400 text-xl m-0">
            <Trophy className="h-6 w-6" /> {t('dashboard.worldRanking', 'Ranking Mundial')}
          </CardTitle>
          <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto flex-1 md:justify-end">
            <div className="relative w-full md:max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('dashboard.searchPlayer', 'Buscar jugador...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm dark:text-white dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button 
                variant={showFriendsOnly ? "default" : "outline"}
                size="sm" 
                onClick={() => { setShowFriendsOnly(!showFriendsOnly); setPage(0); setCursors([]); }} 
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 ${showFriendsOnly ? 'bg-blue-600 hover:bg-blue-700 text-white border-transparent' : 'bg-white dark:bg-gray-800'}`}
              >
                <Users className="w-4 h-4" /> 📌 <span className="sm:inline">{t('dashboard.showFriendsOnly', 'Solo mis amigos')}</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => { setSearchQuery(currentUser.displayName || ''); }} 
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 bg-white dark:bg-gray-800"
              >
                <Target className="w-4 h-4" /> <span className="sm:inline">{t('dashboard.findMe', 'Buscarme')}</span>
              </Button>
            </div>
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
              {(() => {
                const seenUids = new Set();
                const uniquePlayers = players.filter(p => {
                  if (!p || !p.uid || seenUids.has(p.uid)) return false;
                  seenUids.add(p.uid);
                  return true;
                });

                return uniquePlayers.length > 0 ? uniquePlayers.map((p, index) => {
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
                  )
                }) : null
              })()}
              {players.length === 0 && !loading && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-500">{t('dashboard.noPlayersFound', 'No se encontraron jugadores.')}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      
      {!searchQuery && !showFriendsOnly && (
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
