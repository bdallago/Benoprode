import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Trophy, Plus, LogIn, LogOut, Share2, Users, Trash2, Check, Globe, Lock, MessageSquare } from "lucide-react";
import { Button } from "../components/ui/button";
import { CountdownBanner } from "../components/CountdownBanner";
import { useTranslation } from 'react-i18next';
import { useAuth } from "../components/Providers";
import { Leaderboard } from "../components/Leaderboard";
import { useLeagues } from "../hooks/useLeagues";
import { UserPredictionsModal } from "../components/UserPredictionsModal";
import { LeagueChat } from "../components/LeagueChat";
import { LeagueActivity } from "../components/LeagueActivity";
import { addDoc, collection, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useFocusTrap } from "../hooks/useFocusTrap";

export default function Leagues({ user }: { user: User }) {
  const { isAdmin } = useAuth();
  const { t } = useTranslation();
  
  const {
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
  } = useLeagues(user.uid);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isConfirmingCreate, setIsConfirmingCreate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [leagueError, setLeagueError] = useState("");
  const [leagueToDelete, setLeagueToDelete] = useState<any>(null);
  const [leagueToLeave, setLeagueToLeave] = useState<any>(null);
  const [userToRemoveFromLeague, setUserToRemoveFromLeague] = useState<{leagueId: string, userId: string, userName: string} | null>(null);
  const [copiedLeagueId, setCopiedLeagueId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<{uid: string, name: string} | null>(null);
  const [activeChatLeague, setActiveChatLeague] = useState<any>(null);
  const [unreadLeagues, setUnreadLeagues] = useState<Set<string>>(new Set());

  // Compute unread badges from leagues data using lastMessageAt vs localStorage
  useEffect(() => {
    if (!leagues.length) return;
    const unread = new Set<string>();
    for (const league of leagues) {
      if (!league.members.includes(user.uid)) continue;
      const lastMsg = (league as any).lastMessageAt as string | undefined;
      const lastMsgUserId = (league as any).lastMessageUserId as string | undefined;
      if (!lastMsg) continue;
      if (lastMsgUserId === user.uid) continue; // propio mensaje, no marcar
      const lastRead = localStorage.getItem(`lastRead_${league.id}`);
      if (!lastRead || lastMsg > lastRead) {
        unread.add(league.id);
      }
    }
    setUnreadLeagues(unread);
  }, [leagues, user.uid]);

  const openChat = (league: any) => {
    setActiveChatLeague(league);
    setUnreadLeagues(prev => { const next = new Set(prev); next.delete(league.id); return next; });
  };

  // Focus traps for each modal (hook must be called unconditionally)
  const createModalRef = useFocusTrap(showCreateModal);
  const deleteModalRef = useFocusTrap(!!leagueToDelete);
  const leaveModalRef = useFocusTrap(!!leagueToLeave);
  const removeModalRef = useFocusTrap(!!userToRemoveFromLeague);
  const inviteModalRef = useFocusTrap(!!pendingInvitation);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showCreateModal) { setShowCreateModal(false); setIsConfirmingCreate(false); return; }
      if (leagueToDelete) { setLeagueToDelete(null); return; }
      if (leagueToLeave) { setLeagueToLeave(null); return; }
      if (userToRemoveFromLeague) { setUserToRemoveFromLeague(null); return; }
      if (pendingInvitation) { window.history.replaceState({}, document.title, window.location.pathname); setPendingInvitation(null); return; }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [showCreateModal, leagueToDelete, leagueToLeave, userToRemoveFromLeague, pendingInvitation]);

  const sendWelcomeMessage = async (leagueId: string) => {
    // Fixed doc ID makes this idempotent — double-joins never produce duplicate welcome messages
    await setDoc(doc(db, 'leagues', leagueId, 'messages', `welcome_${user.uid}`), {
      text: `${user.displayName || 'Alguien'} se unió a la liga 🎉`,
      userId: user.uid,
      userName: user.displayName || 'Jugador',
      createdAt: new Date().toISOString(),
      isSystem: true,
    }).catch(() => {});
  };

  const handleCreateClick = () => {
    if (!newLeagueName.trim()) return;

    const normalizedName = newLeagueName.trim().toLowerCase();
    const nameExists = leagues.some((l: any) => l.name.toLowerCase() === normalizedName);
    
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
      await createLeague(newLeagueName, isPublic);
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

  const inviteToLeague = (league: any) => {
    const origin = window.location.origin;
    const inviterName = encodeURIComponent(user.displayName || t('leagues.aPlayer'));
    const url = `${origin}/leagues?league=${league.id}&inviter=${inviterName}`;
    
    navigator.clipboard.writeText(t('leagues.inviteMessage', { name: league.name, url }));
    
    setCopiedLeagueId(league.id);
    setTimeout(() => setCopiedLeagueId(null), 3000);
  };

  const inviteViaWhatsApp = (league: any) => {
    const origin = window.location.origin;
    const inviterName = encodeURIComponent(user.displayName || t('leagues.aPlayer'));
    const url = `${origin}/leagues?league=${league.id}&inviter=${inviterName}`;
    
    const message = `¡Ey! Armé una liga en El Prode de Beno para que compitamos: "${league.name}"\n\nSumate a jugar, es gratis y nos divertimos un rato.\n\nEntrá acá para unirte:\n${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const handleAcceptInvitation = async () => {
    if (!pendingInvitation) return;
    try {
      await joinLeague(pendingInvitation.league.id);
      await sendWelcomeMessage(pendingInvitation.league.id);
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

  const confirmRemoveUser = async () => {
    if (!userToRemoveFromLeague) return;
    try {
      await removeMember(userToRemoveFromLeague.leagueId, userToRemoveFromLeague.userId);
      setUserToRemoveFromLeague(null);
    } catch (err) {
      console.error("Error removing user from league", err);
    }
  };

  // Benoliga logic
  const isBenoliga = (l: any) => l.name.toLowerCase().includes('beno') || l.id === 'benoliga';
  const benoliga = leagues.find(isBenoliga);
  const myLeagues = leagues.filter((l: any) => !isBenoliga(l) && l.members.includes(user.uid));
  const notMyLeagues = leagues.filter((l: any) => !isBenoliga(l) && !l.members.includes(user.uid));
  const MAX_TOTAL = 20;
  const extraSlots = Math.max(0, MAX_TOTAL - (benoliga ? 1 : 0) - myLeagues.length);
  const otherLeagues = [...myLeagues, ...notMyLeagues.slice(0, extraSlots)];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-pulse p-4">
        <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-lg w-full mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {[1, 2, 4].map(i => <div key={i} className="h-48 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4">
      <CountdownBanner />

      <div className="space-y-6">
        <div id="tutorial-leagues-actions" className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left w-full sm:w-auto">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('leagues.title')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('leagues.description')}</p>
          </div>
          <Button 
            onClick={() => setShowCreateModal(true)} 
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto shrink-0"
          >
            <Plus className="w-4 h-4 mr-2"/> {t('leagues.createLeague')}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Benoliga Card */}
          {benoliga && (
            <div className={`col-span-full space-y-4 ${selectedLeague?.id === benoliga.id ? 'mt-2' : ''}`}>
               <Card className={`border-2 border-sky-400 dark:border-sky-500 bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 relative overflow-hidden ${selectedLeague?.id === benoliga.id ? 'ring-2 ring-sky-500' : ''}`}>
                  <div className="absolute top-0 right-0 bg-sky-400 text-sky-900 text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-wider">
                    {t('leagues.createdByBeno', 'Creado por Beno')}
                  </div>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                        <Trophy className="w-5 h-5 text-sky-600 dark:text-sky-400" /> {benoliga.name}
                        <span className="flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-1 rounded-full font-normal">
                          <Globe className="w-3 h-3" /> {t('leagues.public')}
                        </span>
                      </div>
                      <span className="text-sm font-normal text-gray-500 dark:text-gray-200 flex items-center gap-1">
                        <Users className="w-4 h-4" /> {benoliga.members.length}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      {t('leagues.benoligaDesc', 'Competí contra Beno y ganale en su cara y en su cancha. ¡El creador del prode te desafía!')}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant={selectedLeague?.id === benoliga.id ? "default" : "outline"} size="sm" onClick={() => setSelectedLeague(selectedLeague?.id === benoliga.id ? null : benoliga)}>
                        {selectedLeague?.id === benoliga.id ? t('leagues.hideRanking') : t('leagues.viewRanking')}
                      </Button>
                      {benoliga.members.includes(user.uid) ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => inviteToLeague(benoliga)}>
                            {copiedLeagueId === benoliga.id ? (
                              <><Check className="w-4 h-4 mr-2 text-green-600 dark:text-green-400"/> <span className="text-green-600 dark:text-green-400">{t('leagues.copied')}</span></>
                            ) : (
                              <><Share2 className="w-4 h-4 mr-2"/> {t('leagues.invite')}</>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant={unreadLeagues.has(benoliga.id) ? "default" : "outline"}
                            className={unreadLeagues.has(benoliga.id) ? "bg-red-500 hover:bg-red-600 text-white border-red-500" : ""}
                            onClick={() => openChat(benoliga)}
                          >
                            <MessageSquare className="w-4 h-4 mr-2" /> Chat
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" className="font-bold" onClick={async () => { await joinLeague(benoliga.id); await sendWelcomeMessage(benoliga.id); }}>
                          <LogIn className="w-4 h-4 mr-2"/> {t('leagues.joinChallenge', 'Unirse al Desafío')}
                        </Button>
                      )}
                    </div>
                  </CardContent>
               </Card>
               {selectedLeague?.id === benoliga.id && (
                  <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-4">
                    <Leaderboard
                      title={`${t('leagues.ranking')}: ${benoliga.name}`}
                      players={players.filter(p => benoliga.members.includes(p.uid))}
                      currentUser={user}
                      onUserClick={(u) => setSelectedUser({uid: u.uid, name: u.name})}
                      loading={loading}
                      onRemoveUser={isAdmin || benoliga.createdBy === user.uid ? (u) => setUserToRemoveFromLeague({leagueId: benoliga.id, userId: u.uid, userName: u.name}) : undefined}
                    />
                    <LeagueActivity leagueId={benoliga.id} />
                  </div>
               )}
            </div>
          )}

          {/* Other Leagues */}
          {otherLeagues.map((league: any) => {
            const isSelected = selectedLeague?.id === league.id;
            const isMember = league.members.includes(user.uid);

            return (
              <div key={league.id} className={`${isSelected ? 'col-span-full order-none' : ''} space-y-4`}>
                <Card className={`${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                        {league.name}
                        {league.isPublic ? (
                          <span className="flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-1 rounded-full font-normal">
                             <Globe className="w-3 h-3" /> {t('leagues.public')}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full font-normal">
                             <Lock className="w-3 h-3" /> {t('leagues.private')}
                          </span>
                        )}
                        {isAdmin && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setLeagueToDelete(league); }} 
                            className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <span className="text-sm font-normal text-gray-500 dark:text-gray-200 flex items-center gap-1">
                        <Users className="w-4 h-4" /> {league.members.length}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex gap-2 flex-wrap">
                    <Button variant={isSelected ? "default" : "outline"} size="sm" onClick={() => setSelectedLeague(isSelected ? null : league)}>
                      {isSelected ? t('leagues.hideRanking') : t('leagues.viewRanking')}
                    </Button>
                    
                    {isMember ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => inviteToLeague(league)}>
                          {copiedLeagueId === league.id ? (
                            <><Check className="w-4 h-4 mr-2 text-green-600 dark:text-green-400"/> <span className="text-green-600 dark:text-green-400">{t('leagues.copied')}</span></>
                          ) : (
                            <><Share2 className="w-4 h-4 mr-2"/> {t('leagues.invite')}</>
                          )}
                        </Button>
                        <Button variant="success" size="sm" onClick={() => inviteViaWhatsApp(league)}>
                          <svg viewBox="0 0 24 24" className="w-4 h-4 mr-2 fill-current" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          WhatsApp
                        </Button>
                        <Button
                          size="sm"
                          variant={unreadLeagues.has(league.id) ? "default" : "outline"}
                          className={unreadLeagues.has(league.id) ? "bg-red-500 hover:bg-red-600 text-white border-red-500" : ""}
                          onClick={() => openChat(league)}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" /> Chat
                        </Button>
                        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setLeagueToLeave(league)}>
                          <LogOut className="w-4 h-4 mr-2"/> {t('leagues.leave')}
                        </Button>
                      </>
                    ) : (
                      league.isPublic ? (
                        <Button size="sm" onClick={async () => { await joinLeague(league.id); await sendWelcomeMessage(league.id); }} className="w-full">
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
                {isSelected && (
                  <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-4">
                    <Leaderboard
                      title={`${t('leagues.ranking')}: ${league.name}`}
                      players={players.filter(p => league.members.includes(p.uid))}
                      currentUser={user}
                      onUserClick={(u) => setSelectedUser({uid: u.uid, name: u.name})}
                      loading={loading}
                      onRemoveUser={isAdmin || league.createdBy === user.uid ? (u) => setUserToRemoveFromLeague({leagueId: league.id, userId: u.uid, userName: u.name}) : undefined}
                    />
                    <LeagueActivity leagueId={league.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {leagues.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed dark:border-gray-700">
            {t('leagues.noLeagues')}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div ref={createModalRef} role="dialog" aria-modal="true" aria-labelledby="dialog-create-title" className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            {!isConfirmingCreate ? (
              <>
                <h3 id="dialog-create-title" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('leagues.createNewLeague')}</h3>
                <div className="mb-4">
                  <label htmlFor="league-name-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('leagues.leagueName')}</label>
                  <input
                    id="league-name-input"
                    type="text"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder={t('leagues.leagueNamePlaceholder')}
                    value={newLeagueName}
                    onChange={(e) => { setNewLeagueName(e.target.value); setLeagueError(""); }}
                  />
                  {leagueError && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{leagueError}</p>}
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('leagues.privacy')}</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`border rounded-lg p-3 cursor-pointer ${!isPublic ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' : 'border-gray-200 dark:border-gray-600'}`} onClick={() => setIsPublic(false)}>
                      <div className="flex items-center gap-2 mb-1">
                        <Lock className={`w-4 h-4 ${!isPublic ? 'text-blue-600' : 'text-gray-500'}`} />
                        <span className={`font-medium ${!isPublic ? 'text-blue-900 dark:text-blue-100' : 'text-gray-700'}`}>{t('leagues.privatePrivacy', 'Privada')}</span>
                      </div>
                      <p className="text-[10px] text-gray-500">{t('leagues.privateDesc', 'Solo con link')}</p>
                    </div>
                    <div className={`border rounded-lg p-3 cursor-pointer ${isPublic ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' : 'border-gray-200 dark:border-gray-600'}`} onClick={() => setIsPublic(true)}>
                      <div className="flex items-center gap-2 mb-1">
                        <Globe className={`w-4 h-4 ${isPublic ? 'text-blue-600' : 'text-gray-500'}`} />
                        <span className={`font-medium ${isPublic ? 'text-blue-900 dark:text-blue-100' : 'text-gray-700'}`}>{t('leagues.publicPrivacy', 'Pública')}</span>
                      </div>
                      <p className="text-[10px] text-gray-500">{t('leagues.publicDesc', 'Para todos')}</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowCreateModal(false)}>{t('leagues.cancel')}</Button>
                  <Button className="bg-blue-600" onClick={handleCreateClick} disabled={!newLeagueName.trim()}>{t('leagues.continue')}</Button>
                </div>
              </>
            ) : (
              <>
                <h3 id="dialog-create-title" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('leagues.confirmLeague')}</h3>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md mb-6">
                  <p className="text-blue-800 dark:text-blue-200 font-medium mb-2">{t('leagues.attention')}</p>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">{t('leagues.creatingLigaDesc', 'Vas a crear "{{name}}" como una liga {{type}}.', { name: newLeagueName, type: isPublic ? t('leagues.publicPrivacy', 'Pública') : t('leagues.privatePrivacy', 'Privada') })}</p>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsConfirmingCreate(false)}>{t('leagues.back')}</Button>
                  <Button className="bg-blue-600" onClick={confirmCreateLeague} disabled={isCreating}>{isCreating ? t('leagues.creating', 'Creando...') : t('leagues.confirmAndCreate', 'Confirmar y Crear')}</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {leagueToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div ref={deleteModalRef} role="dialog" aria-modal="true" aria-labelledby="dialog-delete-title" className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 id="dialog-delete-title" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('leagues.deleteLeagueTitle', 'Eliminar Liga')}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{t('leagues.deleteLeagueConfirm', '¿Estás seguro de que querés eliminar "{{name}}"? Esta acción es irreversible.', { name: leagueToDelete.name })}</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setLeagueToDelete(null)}>{t('leagues.cancel')}</Button>
              <Button variant="destructive" onClick={() => deleteLeague(leagueToDelete.id)}>{t('leagues.delete', 'Eliminar')}</Button>
            </div>
          </div>
        </div>
      )}

      {leagueToLeave && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div ref={leaveModalRef} role="dialog" aria-modal="true" aria-labelledby="dialog-leave-title" className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 id="dialog-leave-title" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('leagues.leaveLeagueTitle', 'Salir de la Liga')}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{t('leagues.leaveLeagueConfirm', '¿Estás seguro de que querés salir de "{{name}}"?', { name: leagueToLeave.name })}</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setLeagueToLeave(null)}>{t('leagues.cancel')}</Button>
              <Button variant="destructive" onClick={() => leaveLeague(leagueToLeave.id)}>{t('leagues.leaveBtn', 'Salir')}</Button>
            </div>
          </div>
        </div>
      )}

      {userToRemoveFromLeague && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div ref={removeModalRef} role="dialog" aria-modal="true" aria-labelledby="dialog-remove-title" className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 id="dialog-remove-title" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('leagues.removePlayerTitle', 'Eliminar Jugador')}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{t('leagues.removePlayerConfirm', '¿Borrar a {{name}}?', { name: userToRemoveFromLeague.userName })}</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setUserToRemoveFromLeague(null)}>{t('leagues.cancel')}</Button>
              <Button variant="destructive" onClick={confirmRemoveUser}>{t('leagues.delete', 'Eliminar')}</Button>
            </div>
          </div>
        </div>
      )}

      {pendingInvitation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div ref={inviteModalRef} role="dialog" aria-modal="true" aria-labelledby="dialog-invite-title" className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl text-center">
            <Trophy className="h-10 w-10 text-blue-600 mx-auto mb-4" />
            <h3 id="dialog-invite-title" className="text-xl font-bold mb-2">{t('leagues.inviteTitle', '¡Invitación a Liga!')}</h3>
            <p className="text-gray-600 mb-6">{t('leagues.inviteText', '{{inviter}} te invita a unirte a "{{league}}".', { inviter: pendingInvitation.inviter, league: pendingInvitation.league.name })}</p>
            <div className="flex gap-4">
              <Button variant="outline" className="w-full" onClick={handleRejectInvitation}>{t('leagues.reject', 'Rechazar')}</Button>
              <Button className="bg-blue-600 w-full" onClick={handleAcceptInvitation}>{t('leagues.acceptAndJoin', 'Aceptar y Unirse')}</Button>
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

      {activeChatLeague && (
        <LeagueChat
          leagueId={activeChatLeague.id}
          leagueName={activeChatLeague.name}
          isPublic={activeChatLeague.isPublic}
          isMember={activeChatLeague.members.includes(user.uid)}
          currentUser={user}
          onClose={() => setActiveChatLeague(null)}
        />
      )}

    </div>
  );
}
