import { useState, useMemo, useEffect } from "react";
import { User } from "firebase/auth";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Trophy, Search, ChevronLeft, ChevronRight, User as UserIcon, Target, Trash2, UserPlus } from "lucide-react";
import { useTranslation } from 'react-i18next';

interface Player {
  uid: string;
  displayName: string;
  photoURL: string;
  totalPoints: number;
}

interface LeaderboardProps {
  title: string;
  players: Player[];
  currentUser: User;
  onUserClick?: (user: {uid: string, name: string, points: number}) => void;
  loading?: boolean;
  onRemoveUser?: (user: {uid: string, name: string}) => void;
}

const ITEMS_PER_PAGE = 50;

export function Leaderboard({ title, players, currentUser, onUserClick, loading, onRemoveUser }: LeaderboardProps) {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`leaderboardPage_${title}`);
      return saved ? parseInt(saved, 10) : 1;
    } catch {
      return 1;
    }
  });
  const [searchQuery, setSearchQuery] = useState("");
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

  useEffect(() => {
    try {
      sessionStorage.setItem(`leaderboardPage_${title}`, currentPage.toString());
    } catch {}
  }, [currentPage, title]);

  const handleAddFriend = async (e: React.MouseEvent, targetUserId: string, targetName: string) => {
    e.stopPropagation();
    if (sentRequests.has(targetUserId)) return;

    try {
      await addDoc(collection(db, "friendRequests"), {
        fromUserId: currentUser.uid,
        toUserId: targetUserId,
        status: "pending",
        createdAt: serverTimestamp()
      });
      
      await addDoc(collection(db, "notifications"), {
        userId: targetUserId,
        type: "friend_request",
        title: "Nueva solicitud de amistad",
        message: `${currentUser.displayName || "Un usuario"} quiere añadirte como amigo.`,
        read: false,
        createdAt: new Date().toISOString(),
        actionUrl: `/profile`
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

  // Calculate ranks first
  const playersWithRank = useMemo(() => {
    return players.map(player => {
      const rank = players.findIndex(p => p.totalPoints === player.totalPoints) + 1;
      const pct = players.length > 1 ? (rank / players.length) * 100 : 100;
      let topBadges = [];
      if (pct <= 10 && player.totalPoints > 0) {
        topBadges.push('Top 10%');
      } else if (pct <= 30 && player.totalPoints > 0) {
        topBadges.push('Top 30%');
      }
      return { ...player, rank, topBadges };
    });
  }, [players]);

  const filteredPlayers = useMemo(() => {
    if (!searchQuery) return playersWithRank;
    return playersWithRank.filter(p => 
      p.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [playersWithRank, searchQuery]);

  const totalPages = Math.ceil(filteredPlayers.length / ITEMS_PER_PAGE);
  const currentPlayers = filteredPlayers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const goToMyRank = () => {
    const myIndex = filteredPlayers.findIndex(p => p.uid === currentUser.uid);
    if (myIndex !== -1) {
      const myPage = Math.floor(myIndex / ITEMS_PER_PAGE) + 1;
      setCurrentPage(myPage);
      
      // Use setTimeout to allow the page to render before scrolling
      setTimeout(() => {
        const userRow = document.getElementById(`player-row-${currentUser.uid}`);
        if (userRow) {
          userRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add a temporary highlight effect
          userRow.classList.add('bg-blue-100', 'dark:bg-blue-900/40');
          setTimeout(() => {
            userRow.classList.remove('bg-blue-100', 'dark:bg-blue-900/40');
          }, 2000);
        }
      }, 100);
    }
  };

  if (loading) {
    return (
      <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-md">
        <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 text-center py-4">
          <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
            <Trophy className="h-5 w-5" /> {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-10 text-center text-gray-500">
          Cargando clasificación...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-md overflow-hidden">
      <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-400 text-xl m-0">
            <Trophy className="h-6 w-6" /> {title}
          </CardTitle>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar jugador..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm dark:text-white dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToMyRank}
              className="w-full sm:w-auto flex items-center gap-2 whitespace-nowrap bg-blue-50 dark:bg-blue-600 hover:bg-blue-100 dark:hover:bg-blue-500 text-blue-700 dark:text-white border-blue-200 dark:border-blue-500 font-medium transition-colors"
            >
              <Target className="h-4 w-4" /> Mi Posición
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <div className="overflow-auto max-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm">
              <th className="py-3 px-4 font-semibold w-16 text-center">Pos</th>
              <th className="py-3 px-4 font-semibold">Jugador</th>
              <th className="py-3 px-4 font-semibold text-right w-24">Puntos</th>
              {onRemoveUser && <th className="py-3 px-4 w-12"></th>}
            </tr>
          </thead>
          <tbody>
            {currentPlayers.length > 0 ? (
              currentPlayers.map((player) => (
                <tr 
                  key={player.uid}
                  id={`player-row-${player.uid}`}
                  onClick={() => onUserClick && onUserClick({ uid: player.uid, name: player.displayName, points: player.totalPoints })}
                  className={`
                    border-b border-gray-100 dark:border-gray-700/50 transition-colors cursor-pointer
                    ${player.uid === currentUser.uid 
                      ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40' 
                      : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/80'
                    }
                  `}
                >
                  <td className="py-2 px-1 text-center">
                    <div className={`inline-flex items-center justify-center w-6 h-6 md:w-7 md:h-7 rounded-full font-bold text-[10px] md:text-xs ${
                      player.rank === 1 ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-400 border border-sky-300' :
                      player.rank === 2 ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-300' :
                      player.rank === 3 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-400 border border-orange-300' :
                      'text-gray-600 dark:text-gray-200'
                    }`}>
                      {player.rank}
                    </div>
                  </td>
                  <td className="py-2 px-1 max-w-[120px] md:max-w-none">
                    <div className="flex items-center justify-between gap-1 md:gap-2">
                      <div className="flex items-center gap-1.5 md:gap-2 min-w-0 flex-1">
                        {player.photoURL ? (
                          <img src={player.photoURL} alt={player.displayName} className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-gray-200 dark:border-gray-600 shrink-0" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border border-gray-300 dark:border-gray-600 shrink-0">
                            <UserIcon className="h-3 w-3 md:h-4 md:w-4 text-gray-500 dark:text-gray-200" />
                          </div>
                        )}
                        <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className={`font-medium truncate text-[11px] md:text-sm leading-tight shrink ${player.uid === currentUser.uid ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                              {player.displayName}
                            </span>
                            {player.uid === currentUser.uid && <span className="text-[9px] md:text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 px-1 py-0 rounded-full border border-blue-200 dark:border-blue-800 whitespace-nowrap shrink-0">Tú</span>}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-0.5 min-w-0">
                            {/* @ts-ignore - added dynamically */}
                            {player.topBadges && player.topBadges.length > 0 && player.topBadges.map(badge => (
                              <span key={badge} className={`text-[8px] md:text-[10px] px-1 md:px-1.5 py-0 rounded-full border leading-none whitespace-nowrap ${badge === 'Top 10%' ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/50 dark:text-amber-400' : 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-300'}`}>
                                {badge}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="shrink-0 flex items-center justify-end ml-1">
                        {player.uid !== currentUser.uid && (
                          friends.has(player.uid) ? (
                            <div className="text-[8px] md:text-[10px] font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 whitespace-nowrap">
                              Amigos
                            </div>
                          ) : sentRequests.has(player.uid) ? (
                            <div className="text-[8px] md:text-[9px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-1 py-0.5 rounded border border-amber-200 dark:border-amber-800 whitespace-nowrap">
                              Pendiente
                            </div>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="p-0.5 h-6 w-6 md:h-7 md:w-7 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full"
                              onClick={(e) => handleAddFriend(e, player.uid, player.displayName)}
                            >
                              <UserPlus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-2 md:px-4 text-right font-bold text-gray-900 dark:text-gray-100 text-sm md:text-base">
                    {player.totalPoints}
                  </td>
                  {onRemoveUser && (
                    <td className="py-3 px-2 text-right">
                      {player.uid !== currentUser.uid && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveUser({uid: player.uid, name: player.displayName});
                          }}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={onRemoveUser ? 4 : 3} className="py-8 text-center text-gray-500 dark:text-gray-200">
                  No se encontraron jugadores.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between">
          <span className="text-[10px] md:text-sm text-gray-500 dark:text-gray-200">
            {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredPlayers.length)} / {filteredPlayers.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium">
              {currentPage}/{totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
