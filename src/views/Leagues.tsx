import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { User } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, getDocs, addDoc, updateDoc, doc, arrayUnion, arrayRemove, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Trophy, User as UserIcon, Plus, LogIn, LogOut, Share2, Users, Trash2, Check, Globe, Lock } from "lucide-react";
import { Button } from "../components/ui/button";
import { CountdownBanner } from "../components/CountdownBanner";
import { UserPredictionsModal } from "../components/UserPredictionsModal";
import { useTranslation } from 'react-i18next';
import { useAuth } from "../components/Providers";
import { Leaderboard } from "../components/Leaderboard";

interface Player {
  uid: string;
  displayName: string;
  photoURL: string;
  totalPoints: number;
  role?: string;
}

interface League {
  id: string;
  name: string;
  createdBy: string;
  members: string[];
  createdAt: string;
  isPublic: boolean;
}

export default function Leagues({ user }: { user: User }) {
  const { isAdmin, tourStepIndex } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isConfirmingCreate, setIsConfirmingCreate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [leagueError, setLeagueError] = useState("");
  const [leagueToDelete, setLeagueToDelete] = useState<League | null>(null);
  const [leagueToLeave, setLeagueToLeave] = useState<League | null>(null);
  const [copiedLeagueId, setCopiedLeagueId] = useState<string | null>(null);
  const [pendingInvitation, setPendingInvitation] = useState<{league: League, inviter: string} | null>(null);
  const [selectedUser, setSelectedUser] = useState<{uid: string, name: string} | null>(null);
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("totalPoints", "desc"));
    const unsubscribeUsers = onSnapshot(q, (snapshot) => {
      const playersData = snapshot.docs.map((doc) => ({ ...doc.data(), uid: doc.id } as Player));
      setPlayers(playersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching leaderboard", error);
      setLoading(false);
    });

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
          if (!league.members.includes(user.uid)) {
            setPendingInvitation({ league, inviter });
          } else {
            if (typeof window !== 'undefined') {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
            setSelectedLeague(league);
          }
        }
      }
    });

    return () => {
      unsubscribeUsers();
      unsubscribeLeagues();
    };
  }, [user.uid, searchParams, t]);

  const handleCreateClick = () => {
    if (!newLeagueName.trim()) return;

    const normalizedName = newLeagueName.trim().toLowerCase();
    const nameExists = leagues.some(l => l.name.toLowerCase() === normalizedName);
    
    if (nameExists) {
      setLeagueError(t('leagues.nameExistsError'));
      return;
    }

    setLeagueError("");
    setIsConfirmingCreate(true);
  };

  const confirmCreateLeague = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const newLeague = {
        name: newLeagueName.trim(),
        createdBy: user.uid,
        members: [user.uid],
        createdAt: new Date().toISOString(),
        isPublic: isPublic
      };
      await addDoc(collection(db, "leagues"), newLeague);
      setShowCreateModal(false);
      setIsConfirmingCreate(false);
      setNewLeagueName("");
      setIsPublic(false);
      setLeagueError("");
    } catch (err) {
      console.error("Error creating league", err);
    } finally {
      setIsCreating(false);
    }
  };

  const deleteLeague = async (leagueId: string) => {
    try {
      await deleteDoc(doc(db, "leagues", leagueId));
      if (selectedLeague?.id === leagueId) setSelectedLeague(null);
      setLeagueToDelete(null);
    } catch (err) {
      console.error("Error deleting league", err);
    }
  };

  const joinLeague = async (leagueId: string) => {
    try {
      await updateDoc(doc(db, "leagues", leagueId), {
        members: arrayUnion(user.uid)
      });
    } catch (err) {
      console.error("Error joining league", err);
    }
  };

  const leaveLeague = async (leagueId: string) => {
    try {
      const league = leagues.find(l => l.id === leagueId);
      if (league && league.members.length === 1 && league.members[0] === user.uid) {
        // If last member, delete the league
        await deleteDoc(doc(db, "leagues", leagueId));
      } else {
        await updateDoc(doc(db, "leagues", leagueId), {
          members: arrayRemove(user.uid)
        });
      }
      if (selectedLeague?.id === leagueId) setSelectedLeague(null);
      setLeagueToLeave(null);
    } catch (err) {
      console.error("Error leaving league", err);
    }
  };

  const inviteToLeague = (league: League) => {
    // 1. Fijamos tu dominio oficial de producción
    const origin = "https://www.elprodedebeno.com.ar";
    
    // 2. Preparamos el nombre y armamos la URL correcta con el #
    const inviterName = encodeURIComponent(user.displayName || t('leagues.aPlayer'));
    const url = `${origin}/#league=${league.id}&inviter=${inviterName}`;
    
    // 3. Copiamos al portapapeles
    navigator.clipboard.writeText(t('leagues.inviteMessage', { name: league.name, url }));
    
    // 4. Mostramos el tilde de éxito
    setCopiedLeagueId(league.id);
    setTimeout(() => setCopiedLeagueId(null), 3000);
  };

  const inviteViaWhatsApp = (league: League) => {
    const origin = "https://www.elprodedebeno.com.ar";
    const inviterName = encodeURIComponent(user.displayName || t('leagues.aPlayer'));
    const url = `${origin}/#league=${league.id}&inviter=${inviterName}`;
    
    const message = `¡Ey! Armé una liga en El Prode de Beno para que compitamos: "${league.name}"\n\nSumate a jugar, es gratis y nos divertimos un rato.\n\nEntrá acá para unirte:\n${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const handleAcceptInvitation = async () => {
    if (!pendingInvitation) return;
    try {
      await updateDoc(doc(db, "leagues", pendingInvitation.league.id), {
        members: arrayUnion(user.uid)
      });
      window.history.replaceState({}, document.title, window.location.pathname);
      setSelectedLeague(pendingInvitation.league);
      setPendingInvitation(null);
    } catch (err) {
      console.error("Error joining league", err);
    }
  };

  const handleRejectInvitation = () => {
    window.history.replaceState({}, document.title, window.location.pathname);
    setPendingInvitation(null);
  };

  const currentUser = players.find((p) => p.uid === user.uid);

  // Filter leagues: Show all leagues
  const visibleLeagues = leagues;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <CountdownBanner />

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left w-full sm:w-auto">
            <h2 className="text-3xl font-bold text-gray-900">{t('leagues.title')}</h2>
            <p className="text-sm text-gray-500 mt-1 text-justify sm:text-left">{t('leagues.description')}</p>
          </div>
          <Button 
            onClick={() => setShowCreateModal(true)} 
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto shrink-0 create-league-btn"
            disabled={tourStepIndex === 9}
          >
            <Plus className="w-4 h-4 mr-2"/> {t('leagues.createLeague')}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Benoliga Highlight Card */}
          {(() => {
            const benoliga = leagues.find(l => l.name.toLowerCase().includes('benoliga') || l.id === 'benoliga');
            const isMember = benoliga ? benoliga.members.includes(user.uid) : false;
            
            return (
              <Card className="col-span-full border-2 border-yellow-400 dark:border-yellow-500 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 relative overflow-hidden benoliga-card">
                <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-wider">
                  Creado por Beno
                </div>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" /> {benoliga ? benoliga.name : 'La Benoliga'}
                      <span className="flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-1 rounded-full font-normal" title={t('leagues.anyoneCanJoin')}>
                        <Globe className="w-3 h-3" /> {t('leagues.public')}
                      </span>
                    </div>
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Users className="w-4 h-4" /> {benoliga ? benoliga.members.length : 1}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Competí contra Beno y ganale en su cara y en su cancha. ¡El creador del prode te desafía!
                  </p>
                  {isMember ? (
                    <div className="flex gap-2 flex-wrap">
                      <Button variant={selectedLeague?.id === benoliga?.id ? "default" : "outline"} size="sm" onClick={() => benoliga && setSelectedLeague(benoliga)} className="bg-yellow-100 hover:bg-yellow-200 text-yellow-900 border-yellow-300 dark:bg-yellow-900/40 dark:hover:bg-yellow-900/60 dark:text-yellow-100 dark:border-yellow-700">
                        {t('leagues.viewRanking')}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => benoliga && inviteToLeague(benoliga)} className="bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 border-yellow-300 dark:border-yellow-700">
                        {copiedLeagueId === benoliga?.id ? (
                          <><Check className="w-4 h-4 mr-2 text-green-600 dark:text-green-400"/> <span className="text-green-600 dark:text-green-400">{t('leagues.copied')}</span></>
                        ) : (
                          <><Share2 className="w-4 h-4 mr-2"/> {t('leagues.invite')}</>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-yellow-950 font-bold" onClick={() => {
                      if (benoliga) {
                        joinLeague(benoliga.id);
                      } else {
                        alert("¡Próximamente! La Benoliga oficial se abrirá pronto.");
                      }
                    }}>
                      <LogIn className="w-4 h-4 mr-2"/> Unirse al Desafío
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {visibleLeagues.filter(l => !(l.name.toLowerCase().includes('benoliga') || l.id === 'benoliga')).map(league => {
            const isMember = league.members.includes(user.uid);
            return (
              <Card key={league.id} className={selectedLeague?.id === league.id ? 'ring-2 ring-blue-500' : ''}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      {league.name}
                      {league.isPublic ? (
                        <span className="flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-1 rounded-full font-normal transition-colors duration-200" title={t('leagues.anyoneCanJoin')}>
                          <Globe className="w-3 h-3" /> {t('leagues.public')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full font-normal transition-colors duration-200" title={t('leagues.inviteOnly')}>
                          <Lock className="w-3 h-3" /> {t('leagues.private')}
                        </span>
                      )}
                      {isAdmin && (
                        <button 
                          onClick={() => setLeagueToDelete(league)} 
                          className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title={t('leagues.deleteLeague')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Users className="w-4 h-4" /> {league.members.length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2 flex-wrap">
                  {isMember ? (
                    <>
                      <Button variant={selectedLeague?.id === league.id ? "default" : "outline"} size="sm" onClick={() => setSelectedLeague(league)}>
                        {t('leagues.viewRanking')}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => inviteToLeague(league)}>
                        {copiedLeagueId === league.id ? (
                          <><Check className="w-4 h-4 mr-2 text-green-600 dark:text-green-400"/> <span className="text-green-600 dark:text-green-400">{t('leagues.copied')}</span></>
                        ) : (
                          <><Share2 className="w-4 h-4 mr-2"/> {t('leagues.invite')}</>
                        )}
                      </Button>
                      <Button variant="outline" size="sm" className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/40 dark:text-green-400 dark:border-green-800" onClick={() => inviteViaWhatsApp(league)}>
                        <svg viewBox="0 0 24 24" className="w-4 h-4 mr-2 fill-current" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        WhatsApp
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 ml-auto" onClick={() => setLeagueToLeave(league)}>
                        <LogOut className="w-4 h-4 mr-2"/> {t('leagues.leave')}
                      </Button>
                    </>
                  ) : (
                    league.isPublic ? (
                      <Button size="sm" onClick={() => joinLeague(league.id)} className="w-full">
                        <LogIn className="w-4 h-4 mr-2"/> {t('leagues.joinLeague')}
                      </Button>
                    ) : (
                      <Button size="sm" disabled className="w-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed transition-colors duration-200">
                        <Lock className="w-4 h-4 mr-2"/> {t('leagues.requiresInvite')}
                      </Button>
                    )
                  )}
                </CardContent>
              </Card>
            )
          })}
          {visibleLeagues.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed dark:border-gray-700 transition-colors duration-200">
              {t('leagues.noLeagues')}
            </div>
          )}
        </div>

        {selectedLeague && (
          <div className="mt-8">
            <Leaderboard 
              title={`${t('leagues.ranking')}: ${selectedLeague.name}`} 
              players={players.filter(p => selectedLeague.members.includes(p.uid))} 
              currentUser={user} 
              onUserClick={(u) => setSelectedUser({uid: u.uid, name: u.name})} 
              loading={loading} 
            />
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl transition-colors duration-200">
            {!isConfirmingCreate ? (
              <>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('leagues.createNewLeague')}</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('leagues.leagueName')}</label>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors duration-200"
                    placeholder={t('leagues.leagueNamePlaceholder')}
                    value={newLeagueName}
                    onChange={(e) => { setNewLeagueName(e.target.value); setLeagueError(""); }}
                    autoFocus
                  />
                  {leagueError && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{leagueError}</p>}
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('leagues.privacy')}</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div 
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${!isPublic ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                      onClick={() => setIsPublic(false)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Lock className={`w-4 h-4 ${!isPublic ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                        <span className={`font-medium ${!isPublic ? 'text-blue-900 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>{t('leagues.private')}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('leagues.privateDesc')}</p>
                    </div>
                    <div 
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${isPublic ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                      onClick={() => setIsPublic(true)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Globe className={`w-4 h-4 ${isPublic ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                        <span className={`font-medium ${isPublic ? 'text-blue-900 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>{t('leagues.public')}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('leagues.publicDesc')}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => { setShowCreateModal(false); setLeagueError(""); }}>{t('leagues.cancel')}</Button>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white" 
                    onClick={handleCreateClick}
                    disabled={!newLeagueName.trim()}
                  >
                    {t('leagues.continue')}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('leagues.confirmLeague')}</h3>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-md mb-6 transition-colors duration-200">
                  <p className="text-blue-800 dark:text-blue-300 font-medium mb-2">{t('leagues.attention')}</p>
                  <p className="text-blue-700 dark:text-blue-400 text-sm" dangerouslySetInnerHTML={{ __html: t('leagues.confirmCreateDesc', { name: newLeagueName.trim(), privacy: isPublic ? t('leagues.public') : t('leagues.private') }) }} />
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsConfirmingCreate(false)}>{t('leagues.back')}</Button>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white" 
                    onClick={confirmCreateLeague}
                    disabled={isCreating}
                  >
                    {isCreating ? t('leagues.creating') : t('leagues.confirmAndCreate')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {leagueToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl transition-colors duration-200">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('leagues.deleteLeagueTitle')}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {t('leagues.deleteLeagueDesc', { name: leagueToDelete.name })}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setLeagueToDelete(null)}>{t('leagues.cancel')}</Button>
              <Button 
                variant="destructive"
                onClick={() => deleteLeague(leagueToDelete.id)}
              >
                {t('leagues.yesDelete')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {leagueToLeave && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl transition-colors duration-200">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('leagues.leaveLeagueTitle')}</h3>
            {leagueToLeave.members.length === 1 ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-md mb-6">
                <p className="text-red-800 dark:text-red-400 font-medium mb-2">{t('leagues.attention')}</p>
                <p className="text-red-700 dark:text-red-300 text-sm" dangerouslySetInnerHTML={{ __html: t('leagues.leaveLeagueLastMember', { name: leagueToLeave.name }) }} />
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {t('leagues.leaveLeagueDesc', { name: leagueToLeave.name })}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setLeagueToLeave(null)}>{t('leagues.cancel')}</Button>
              <Button 
                variant="destructive"
                onClick={() => leaveLeague(leagueToLeave.id)}
              >
                {leagueToLeave.members.length === 1 ? t('leagues.yesLeaveAndDelete') : t('leagues.yesLeave')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {pendingInvitation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl text-center transition-colors duration-200">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-100 dark:bg-blue-900/40 p-4 rounded-full">
                <Trophy className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('leagues.invitationTitle')}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-lg" dangerouslySetInnerHTML={{ __html: t('leagues.invitationDesc', { inviter: pendingInvitation.inviter, name: pendingInvitation.league.name }) }} />
            <div className="flex justify-center gap-4">
              <Button variant="outline" className="w-full" onClick={handleRejectInvitation}>{t('leagues.reject')}</Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white w-full"
                onClick={handleAcceptInvitation}
              >
                {t('leagues.acceptAndJoin')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedUser && (
        <UserPredictionsModal 
          userId={selectedUser.uid} 
          userName={selectedUser.name} 
          onClose={() => setSelectedUser(null)} 
        />
      )}
    </div>
  );
}
