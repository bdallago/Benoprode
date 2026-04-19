import { useState, useMemo } from "react";
import { User } from "firebase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Trophy, Search, ChevronLeft, ChevronRight, User as UserIcon, Target, Trash2 } from "lucide-react";
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
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

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
        <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-400">
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
      
      <div className="overflow-auto max-h-[320px] top-5-ranking">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm">
              <th className="py-3 px-4 font-semibold w-24 text-center">Posición</th>
              <th className="py-3 px-4 font-semibold">Jugador</th>
              <th className="py-3 px-4 font-semibold text-right w-32">Puntos</th>
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
                  <td className="py-3 px-4 text-center">
                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                      player.rank === 1 ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-400 border border-sky-300' :
                      player.rank === 2 ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-300' :
                      player.rank === 3 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-400 border border-orange-300' :
                      'text-gray-600 dark:text-gray-200'
                    }`}>
                      {player.rank}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {player.photoURL ? (
                        <img src={player.photoURL} alt={player.displayName} className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border border-gray-300 dark:border-gray-600">
                          <UserIcon className="h-4 w-4 text-gray-500 dark:text-gray-200" />
                        </div>
                      )}
                      <span className={`font-medium ${player.uid === currentUser.uid ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                        {player.displayName}
                        {player.uid === currentUser.uid && <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">Tú</span>}
                        {/* @ts-ignore - added dynamically */}
                        {player.topBadges && player.topBadges.map(badge => (
                          <span key={badge} className={`ml-2 text-xs px-2 py-0.5 rounded-full border ${badge === 'Top 10%' ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/50 dark:text-amber-400' : 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-300'}`}>
                            {badge}
                          </span>
                        ))}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900 dark:text-gray-100 text-lg">
                    {player.totalPoints}
                  </td>
                  {onRemoveUser && (
                    <td className="py-3 px-4 text-right">
                      {player.uid !== currentUser.uid && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveUser({uid: player.uid, name: player.displayName});
                          }}
                          title="Eliminar jugador"
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
        <div className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-200">
            Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredPlayers.length)} de {filteredPlayers.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-2">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
