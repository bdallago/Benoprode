import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, orderBy, limit, getDocs, startAfter, where, documentId, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Trophy, Search, ChevronLeft, ChevronRight, Target, UserPlus, Users } from 'lucide-react';
import { Button } from './ui/button';
import { useTranslation } from 'react-i18next';
import { useSocial } from '../hooks/useSocial';
import { fetchUsersInChunks } from '../lib/firestore-utils';

export function GlobalLeaderboard({ currentUser, onUserClick, initialData }: { currentUser: User, onUserClick?: (u: any) => void, initialData?: any[] }) {
  const { t } = useTranslation();
  const { friends, sentRequests, addFriend } = useSocial(currentUser);
  const allPlayersCache = useRef<any[]>(initialData || []);
  const [players, setPlayers] = useState<any[]>(() => {
    if (initialData && initialData.length > 0) {
      return initialData.slice(0, 25);
    }
    return [];
  });
  const [loading, setLoading] = useState(!initialData || initialData.length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFriendsOnly, setShowFriendsOnly] = useState(false);

  // Pagination state
  const [page, setPage] = useState(0); 
  const [hasMore, setHasMore] = useState(true);
  const [cursors, setCursors] = useState<any[]>([]);
  const fetchingRef = useRef(false);
  const lastPageRef = useRef(-1);

  const handleAddFriendAction = async (e: React.MouseEvent, targetUserId: string) => {
    e.stopPropagation();
    try {
      await addFriend(targetUserId);
    } catch (err) {
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
            const topDocRef = doc(db, "system_stats", "leaderboard_top_1000");
            const topDocSnap = await getDoc(topDocRef);
            if (topDocSnap.exists()) {
              const data = topDocSnap.data();
              playersData = data?.players || [];
              allPlayersCache.current = playersData;
            }
          }

          if (playersData.length > 0) {
            const uniqueMap = new Map();
            playersData.forEach((p: any) => { if (p && p.uid) uniqueMap.set(p.uid, p); });
            const allUnique = Array.from(uniqueMap.values());
            
            const start = targetPage * 25;
            const end = start + 25;
            const pagePlayers = allUnique.slice(start, end);
            
            if (pagePlayers.length > 0) {
              setPlayers(pagePlayers);
              setPage(targetPage);
              lastPageRef.current = targetPage;
              setHasMore(allUnique.length > end);
              try { sessionStorage.setItem(sessionKey, targetPage.toString()); } catch {}
              setLoading(false);
              fetchingRef.current = false;
              return;
            } else if (targetPage === 0 && allUnique.length > 0) {
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
        const friendsArr = Array.from(friends);
        const fetchedPlayers = await fetchUsersInChunks(db, friendsArr);
        
        if (currentUser?.uid) {
          const meQ = await getDoc(doc(db, "users", currentUser.uid));
          if (meQ.exists() && !fetchedPlayers.some(p => p.uid === currentUser.uid)) {
            fetchedPlayers.push({ ...meQ.data(), uid: currentUser.uid });
          }
        }
        fetchedPlayers.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
        const uniqueMap = new Map();
        fetchedPlayers.forEach((p: any) => uniqueMap.set(p.uid, p));
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
        const lowSearch = searchTerm.toLowerCase();
        
        // Local Fuzzy Search Optimization
        const localResults = allPlayersCache.current?.filter(p => 
          (p.displayName || "").toLowerCase().includes(lowSearch)
        ) || [];

        if (localResults.length > 0) {
           setPlayers(localResults.slice(0, 25));
           setPage(0);
           setHasMore(localResults.length > 25);
           setLoading(false);
           fetchingRef.current = false;
           return;
        }

        q = query(
          collection(db, "users"),
          where("displayName", ">=", searchTerm),
          where("displayName", "<=", searchTerm + '\uf8ff'),
          limit(25)
        );
        setPage(0);
        setHasMore(false);
      } else {
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
        const fetched = snap.docs.map((d: any) => ({ ...d.data(), uid: d.id }));
        setPlayers(fetched);
        
        if (!searchQuery && (dir === 'next' || dir === 'first' || dir === 'restore')) {
          const last = snap.docs[snap.docs.length - 1];
          if (last) {
            if (dir === 'next') {
              setCursors(prev => [...prev, last]);
            } else {
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Si ya tenemos datos iniciales, confiamos en ellos y evitamos el primer fetch
    if (initialData && initialData.length > 0) {
       setLoading(false);
       setHasMore(initialData.length > 25);
       // Poblar el caché con los datos iniciales si no está poblado
       if (allPlayersCache.current.length === 0) {
         allPlayersCache.current = initialData;
       }
    } else {
       fetchPage('restore');
    }
  }, []);

  const isFirstRender = useRef(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Evitamos ejecutar el fetch de filtros en el primer render si ya cargamos datos desde el server
    if (isFirstRender.current) {
        isFirstRender.current = false;
        if (initialData && initialData.length > 0 && !searchQuery && !showFriendsOnly) return;
    }
    
    fetchPage('first');
  }, [searchQuery, showFriendsOnly]);

  return (
    <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-md overflow-hidden">
      <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-400 text-xl m-0">
            <Trophy className="h-6 w-6" /> {t('dashboard.worldRanking', 'Ranking Mundial')}
          </CardTitle>
          <div className="flex flex-col md:flex-row items-center gap-3 w-full flex-1 md:ml-4">
            <div className="relative w-full flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('dashboard.searchPlayer', 'Buscar jugador...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm dark:text-white dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
              <Button 
                variant={showFriendsOnly ? "default" : "outline"}
                size="sm" 
                onClick={() => { setShowFriendsOnly(!showFriendsOnly); setPage(0); setCursors([]); }} 
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 h-10 ${showFriendsOnly ? 'bg-blue-600 hover:bg-blue-700 text-white border-transparent' : 'bg-white dark:bg-gray-800'}`}
              >
                <Users className="w-4 h-4" /> 📌 <span className="inline">{t('dashboard.showFriendsOnly', 'Solo mis amigos')}</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => { setSearchQuery(currentUser.displayName || ''); }} 
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 h-10 bg-white dark:bg-gray-800"
              >
                <Target className="w-4 h-4" /> <span className="inline">{t('dashboard.findMe', 'Buscarme')}</span>
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
                const uniquePlayers = players.filter((p: any) => {
                  if (!p || !p.uid || seenUids.has(p.uid)) return false;
                  seenUids.add(p.uid);
                  return true;
                });

                return uniquePlayers.length > 0 ? uniquePlayers.map((p: any, index: number) => {
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
                          <span className={isMe ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-900 dark:text-gray-100'}>
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
                              onClick={(e) => handleAddFriendAction(e, p.uid)}
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
