import { useState, useMemo, useEffect } from "react";
import { User } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Trophy, Search, ChevronLeft, ChevronRight, User as UserIcon, Target, Trash2, UserPlus } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useSocial } from "../hooks/useSocial";

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
  const { friends, sentRequests, addFriend } = useSocial(currentUser);
  const [currentPage, setCurrentPage] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`leaderboardPage_${title}`);
      return saved ? parseInt(saved, 10) : 1;
    } catch {
      return 1;
    }
  });
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    try {
      sessionStorage.setItem(`leaderboardPage_${title}`, currentPage.toString());
    } catch {}
  }, [currentPage, title]);

  const handleAddFriendAction = async (e: React.MouseEvent, targetUserId: string) => {
    e.stopPropagation();
    try {
      await addFriend(targetUserId);
    } catch (err) {
      alert("Hubo un error al enviar la solicitud.");
    }
  };

  // Calculate ranks in one O(n) pass — players arrives pre-sorted by points desc
  const playersWithRank = useMemo(() => {
    let currentRank = 1;
    return players.map((player, index) => {
      if (index > 0 && player.totalPoints < players[index - 1].totalPoints) {
        currentRank = index + 1;
      }
      const pct = players.length > 1 ? (currentRank / players.length) * 100 : 100;
      const topBadges: string[] = [];
      if (pct <= 10 && player.totalPoints > 0) topBadges.push('Top 10%');
      else if (pct <= 30 && player.totalPoints > 0) topBadges.push('Top 30%');
      return { ...player, rank: currentRank, topBadges };
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
      
      <div className="md:overflow-y-auto md:max-h-[400px]">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm">
              <th className="py-3 px-2 font-semibold w-10 text-center">Pos</th>
              <th className="py-3 px-2 md:px-4 font-semibold">Jugador</th>
              <th className="py-3 px-2 font-semibold text-right w-14">Pts</th>
              {onRemoveUser && <th className="py-3 px-2 w-10"></th>}
            </tr>
          </thead>
          <tbody>
            {currentPlayers.length > 0 ? (
              currentPlayers.map((player) => {
                const isMe = player.uid === currentUser.uid;
                return (
                  <tr
                    key={player.uid}
                    id={`player-row-${player.uid}`}
                    onClick={() => onUserClick && onUserClick({ uid: player.uid, name: player.displayName, points: player.totalPoints })}
                    className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/80 cursor-pointer transition-colors ${isMe ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                  >
                    <td className="py-3 px-2 md:px-4 text-center font-bold text-gray-400 text-sm">
                      {player.rank}
                    </td>
                    <td className="py-3 px-2 md:px-4 font-medium overflow-hidden">
                      <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                        <div className="w-7 h-7 shrink-0 flex items-center justify-center">
                          {!isMe && (
                            friends.has(player.uid) ? (
                              <span title={t('profile.areFriends', 'Amigos')}><UserIcon className="w-4 h-4 text-green-500" /></span>
                            ) : sentRequests.has(player.uid) ? (
                              <span title={t('profile.requestSent', 'Solicitud pendiente')}><UserIcon className="w-4 h-4 text-orange-500" /></span>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-0 h-7 w-7 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full"
                                onClick={(e) => handleAddFriendAction(e, player.uid)}
                                title={t('profile.addFriend', 'Añadir amigo')}
                              >
                                <UserPlus className="w-4 h-4" />
                              </Button>
                            )
                          )}
                        </div>
                        {player.photoURL ? (
                          <img src={player.photoURL} alt={player.displayName} className="w-7 h-7 rounded-full border border-gray-200 dark:border-gray-600 shrink-0" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-gray-700 flex items-center justify-center text-blue-600 dark:text-gray-300 font-bold text-xs shrink-0">
                            {player.displayName ? player.displayName.charAt(0).toUpperCase() : '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0 flex items-center gap-1.5">
                          <span className={`truncate text-sm ${isMe ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-900 dark:text-gray-100'}`}>
                            {player.displayName}
                          </span>
                          {isMe && <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full shrink-0">{t('profile.you', 'Tú')}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-sm text-gray-800 dark:text-gray-200">
                      {player.totalPoints}
                    </td>
                    {onRemoveUser && (
                      <td className="py-3 px-2 text-right">
                        {!isMe && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveUser({ uid: player.uid, name: player.displayName });
                            }}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
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
