import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { Trophy, Plus, LogIn, LogOut, Share2, Users, Trash2, Check, Globe, Lock, MessageSquare, Loader2, Search, X, AlertTriangle } from "lucide-react";
import { Button } from "../components/ui/button";
import { CountdownBanner } from "../components/CountdownBanner";
import { useTranslation } from 'react-i18next';
import { useAuth } from "../components/Providers";
import { Leaderboard } from "../components/Leaderboard";
import { useLeagues } from "../hooks/useLeagues";
import { UserPredictionsModal } from "../components/UserPredictionsModal";
import { LeagueChat } from "../components/LeagueChat";
import { LeagueActivity } from "../components/LeagueActivity";
import { LeagueStats } from "../components/LeagueStats";
import { addDoc, collection, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useFocusTrap } from "../hooks/useFocusTrap";

function GhostMemberBanner({ count, repairing, result, onRepair }: {
  count: number;
  repairing: boolean;
  result: { repaired: number; notFoundInAuth: number } | null;
  onRepair: () => void;
}) {
  if (result) {
    return (
      <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-3 flex items-center gap-3 text-sm">
        <Check className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
        <span className="text-green-800 dark:text-green-300">
          Reparación completada: <strong>{result.repaired}</strong> perfil{result.repaired !== 1 ? 'es' : ''} creado{result.repaired !== 1 ? 's' : ''}.
          {result.notFoundInAuth > 0 && ` ${result.notFoundInAuth} UID${result.notFoundInAuth !== 1 ? 's' : ''} no encontrado${result.notFoundInAuth !== 1 ? 's' : ''} en Auth (cuenta eliminada).`}
        </span>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 text-sm text-amber-800 dark:text-amber-300 min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
        <span><strong>{count}</strong> miembro{count !== 1 ? 's' : ''} sin perfil detectado{count !== 1 ? 's' : ''} en esta liga.</span>
      </div>
      <Button size="sm" variant="outline" disabled={repairing} onClick={onRepair} className="shrink-0 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30">
        {repairing ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Reparando...</> : 'Reparar perfiles'}
      </Button>
    </div>
  );
}

export default function Leagues({ user }: { user: User }) {
  const { isAdmin, hasMoreLeagues, loadMoreLeagues } = useAuth();
  const { t } = useTranslation();
  
  const {
    players,
    leagues,
    loading,
    selectedLeague,
    setSelectedLeague,
    pendingInvitation,
    setPendingInvitation,
    orphanedMemberIds,
    createLeague,
    deleteLeague,
    joinLeague,
    leaveLeague,
    removeMember
  } = useLeagues(user.uid);

  const [loadingMore, setLoadingMore] = useState(false);
  
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
  const [joiningLeagueId, setJoiningLeagueId] = useState<string | null>(null);
  const [leagueSearch, setLeagueSearch] = useState('');
  const [repairingGhosts, setRepairingGhosts] = useState(false);
  const [repairResult, setRepairResult] = useState<{repaired: number, notFoundInAuth: number} | null>(null);

  const repairGhostMembers = async () => {
    if (!orphanedMemberIds.length || repairingGhosts) return;
    setRepairingGhosts(true);
    setRepairResult(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/repair-ghost-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uids: orphanedMemberIds }),
      });
      const data = await res.json();
      setRepairResult({ repaired: data.repaired?.length ?? 0, notFoundInAuth: data.notFoundInAuth?.length ?? 0 });
    } catch (e) {
      console.error('Error reparando miembros:', e);
    } finally {
      setRepairingGhosts(false);
    }
  };

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
    const url = `${origin}/leagues?league=${league.id}&inviter=${inviterName}&ref=${user.uid}`;
    
    navigator.clipboard.writeText(t('leagues.inviteMessage', { name: league.name, url }));
    
    setCopiedLeagueId(league.id);
    setTimeout(() => setCopiedLeagueId(null), 3000);
  };

  const inviteViaWhatsApp = (league: any) => {
    const origin = window.location.origin;
    const inviterName = encodeURIComponent(user.displayName || t('leagues.aPlayer'));
    const url = `${origin}/leagues?league=${league.id}&inviter=${inviterName}&ref=${user.uid}`;
    
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
  const isBenoliga = (l: any) => l.id === 'benoliga' || l.name.toLowerCase().includes('beno');
  const benoliga = leagues.find(isBenoliga);
  const myLeagues = leagues.filter((l: any) => !isBenoliga(l) && l.members.includes(user.uid));
  const notMyLeagues = leagues.filter((l: any) => !isBenoliga(l) && !l.members.includes(user.uid));
  // My leagues first, then the rest — no frontend cap (pagination is handled by loadMoreLeagues)
  const otherLeagues = [...myLeagues, ...notMyLeagues];

  const leagueSearchLower = leagueSearch.trim().toLowerCase();
  const filteredBenoliga = leagueSearchLower
    ? (benoliga && benoliga.name.toLowerCase().includes(leagueSearchLower) ? benoliga : undefined)
    : benoliga;
  const filteredOtherLeagues = leagueSearchLower
    ? otherLeagues.filter((l: any) => l.name.toLowerCase().includes(leagueSearchLower))
    : otherLeagues;

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
    <div className="max-w-6xl mx-auto space-y-6">
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

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={leagueSearch}
            onChange={e => setLeagueSearch(e.target.value)}
            placeholder={t('leagues.searchPlaceholder', 'Buscar torneo...')}
            className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
          />
          {leagueSearch && (
            <button
              onClick={() => setLeagueSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Benoliga Card */}
          {filteredBenoliga && (
            <div className="col-span-full space-y-4">
              <div className={`rounded-xl overflow-hidden border-2 border-sky-400 dark:border-sky-500 shadow-md ${selectedLeague?.id === filteredBenoliga.id ? 'ring-2 ring-sky-500' : ''}`}>
                {/* Header band */}
                <div className="px-4 py-4 bg-gradient-to-r from-sky-500 to-cyan-500 relative">
                  <div className="absolute top-0 right-0 bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-bl-lg uppercase tracking-wider">
                    {t('leagues.createdByBeno', 'Creado por Beno')}
                  </div>
                  <div className="flex items-start gap-2.5 pr-24">
                    <Trophy className="w-5 h-5 text-white/90 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-white text-base leading-snug">{filteredBenoliga.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-white/80 flex items-center gap-1"><Globe className="w-3 h-3" /> {t('leagues.public')}</span>
                        <span className="text-xs text-white/80 flex items-center gap-1"><Users className="w-3 h-3" /> {filteredBenoliga.members.length} jugadores</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Body */}
                <div className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/10 dark:to-blue-900/10 px-4 py-3 space-y-2.5">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t('leagues.benoligaDesc', 'Competí contra Beno y ganale en su cara y en su cancha. ¡El creador del prode te desafía!')}
                  </p>
                  {filteredBenoliga.members.includes(user.uid) ? (
                    <>
                      <div className="flex gap-2">
                        <Button
                          variant={selectedLeague?.id === filteredBenoliga.id ? "default" : "outline"}
                          size="sm"
                          className={`flex-1 ${selectedLeague?.id !== filteredBenoliga.id ? 'border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 bg-white dark:bg-transparent' : ''}`}
                          onClick={() => setSelectedLeague(selectedLeague?.id === filteredBenoliga.id ? null : filteredBenoliga)}
                        >
                          {selectedLeague?.id === filteredBenoliga.id ? t('leagues.hideRanking') : t('leagues.viewRanking')}
                        </Button>
                        <Button
                          size="sm"
                          variant={unreadLeagues.has(filteredBenoliga.id) ? "default" : "outline"}
                          className={unreadLeagues.has(filteredBenoliga.id) ? "bg-red-500 hover:bg-red-600 text-white border-red-500" : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-transparent"}
                          onClick={() => openChat(filteredBenoliga)}
                        >
                          <MessageSquare className="w-4 h-4 mr-1.5" /> Chat
                        </Button>
                      </div>
                      <div className="flex items-center gap-1 pt-1 border-t border-sky-200/60 dark:border-sky-800/40">
                        <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors" onClick={() => inviteToLeague(filteredBenoliga)}>
                          {copiedLeagueId === filteredBenoliga.id
                            ? <><Check className="w-3.5 h-3.5 text-green-500" /><span className="text-green-600 dark:text-green-400">{t('leagues.copied')}</span></>
                            : <><Share2 className="w-3.5 h-3.5" />{t('leagues.invite')}</>}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant={selectedLeague?.id === filteredBenoliga.id ? "default" : "outline"}
                        size="sm"
                        className={selectedLeague?.id !== filteredBenoliga.id ? 'border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 bg-white dark:bg-transparent' : ''}
                        onClick={() => setSelectedLeague(selectedLeague?.id === filteredBenoliga.id ? null : filteredBenoliga)}
                      >
                        {selectedLeague?.id === filteredBenoliga.id ? t('leagues.hideRanking') : t('leagues.viewRanking')}
                      </Button>
                      <Button size="sm" className="flex-1 font-bold" disabled={joiningLeagueId === filteredBenoliga.id} onClick={async () => { setJoiningLeagueId(filteredBenoliga.id); try { await joinLeague(filteredBenoliga.id); await sendWelcomeMessage(filteredBenoliga.id); } finally { setJoiningLeagueId(null); } }}>
                        {joiningLeagueId === filteredBenoliga.id ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uniéndose...</> : <><LogIn className="w-4 h-4 mr-2" /> {t('leagues.joinChallenge', 'Unirse al Desafío')}</>}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              {selectedLeague?.id === filteredBenoliga.id && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-4">
                  {filteredBenoliga.members.includes(user.uid) && <LeagueActivity leagueId={filteredBenoliga.id} />}
                  <Leaderboard
                    title={`${t('leagues.ranking')}: ${filteredBenoliga.name}`}
                    players={players.filter(p => filteredBenoliga.members.includes(p.uid))}
                    currentUser={user}
                    onUserClick={(u) => setSelectedUser({ uid: u.uid, name: u.name })}
                    loading={loading}
                    onRemoveUser={isAdmin || filteredBenoliga.createdBy === user.uid ? (u) => setUserToRemoveFromLeague({ leagueId: filteredBenoliga.id, userId: u.uid, userName: u.name }) : undefined}
                  />
                  <LeagueStats members={players.filter(p => filteredBenoliga.members.includes(p.uid))} />
                  {isAdmin && orphanedMemberIds.length > 0 && <GhostMemberBanner count={orphanedMemberIds.length} repairing={repairingGhosts} result={repairResult} onRepair={repairGhostMembers} />}
                </div>
              )}
            </div>
          )}

          {/* Other Leagues */}
          {filteredOtherLeagues.map((league: any) => {
            const isSelected = selectedLeague?.id === league.id;
            const isMember = league.members.includes(user.uid);
            const hasUnread = unreadLeagues.has(league.id);
            const headerBg = isMember
              ? league.isPublic ? 'from-blue-600 to-blue-500' : 'from-indigo-600 to-purple-600'
              : 'from-gray-500 to-gray-400 dark:from-gray-600 dark:to-gray-500';

            return (
              <div key={league.id} className={`${isSelected ? 'col-span-full' : ''} space-y-4`}>
                <div className={`rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}>
                  {/* Header band */}
                  <div className={`px-4 py-3.5 bg-gradient-to-r ${headerBg}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-white text-base leading-snug">{league.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-white/80 flex items-center gap-1">
                            {league.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                            {league.isPublic ? t('leagues.public') : t('leagues.private')}
                          </span>
                          <span className="text-xs text-white/80 flex items-center gap-1">
                            <Users className="w-3 h-3" /> {league.members.length} {league.members.length === 1 ? 'jugador' : 'jugadores'}
                          </span>
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setLeagueToDelete(league); }}
                          className="text-white/60 hover:text-white p-1 rounded-full hover:bg-white/20 transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="bg-white dark:bg-gray-800 px-3 py-3 space-y-2">
                    <div className="flex gap-2">
                      <Button
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className={`flex-1 ${!isSelected ? 'border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20' : ''}`}
                        onClick={() => setSelectedLeague(isSelected ? null : league)}
                      >
                        {isSelected ? t('leagues.hideRanking') : t('leagues.viewRanking')}
                      </Button>
                      {isMember && (
                        <Button
                          size="sm"
                          variant={hasUnread ? "default" : "outline"}
                          className={hasUnread ? "bg-red-500 hover:bg-red-600 text-white border-red-500" : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"}
                          onClick={() => openChat(league)}
                        >
                          <MessageSquare className="w-4 h-4 mr-1.5" /> Chat
                        </Button>
                      )}
                    </div>
                    {isMember ? (
                      <div className="flex items-center gap-1 pt-1.5 border-t border-gray-100 dark:border-gray-700/60">
                        <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors" onClick={() => inviteToLeague(league)}>
                          {copiedLeagueId === league.id
                            ? <><Check className="w-3.5 h-3.5 text-green-500" /><span className="text-green-600 dark:text-green-400">{t('leagues.copied')}</span></>
                            : <><Share2 className="w-3.5 h-3.5" />{t('leagues.invite')}</>}
                        </button>
                        <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" onClick={() => inviteViaWhatsApp(league)}>
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          WhatsApp
                        </button>
                        <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-auto" onClick={() => setLeagueToLeave(league)}>
                          <LogOut className="w-3.5 h-3.5" />{t('leagues.leave')}
                        </button>
                      </div>
                    ) : (
                      league.isPublic ? (
                        <Button size="sm" className="w-full" disabled={joiningLeagueId === league.id} onClick={async () => { setJoiningLeagueId(league.id); try { await joinLeague(league.id); await sendWelcomeMessage(league.id); } finally { setJoiningLeagueId(null); } }}>
                          {joiningLeagueId === league.id ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uniéndose...</> : <><LogIn className="w-4 h-4 mr-2" /> {t('leagues.joinLeague')}</>}
                        </Button>
                      ) : (
                        <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5 px-0.5 py-1.5">
                          <Lock className="w-3.5 h-3.5" /> {t('leagues.requiresInvite')}
                        </p>
                      )
                    )}
                  </div>
                </div>
                {isSelected && (
                  <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-4">
                    {isMember && <LeagueActivity leagueId={league.id} />}
                    <Leaderboard
                      title={`${t('leagues.ranking')}: ${league.name}`}
                      players={players.filter(p => league.members.includes(p.uid))}
                      currentUser={user}
                      onUserClick={(u) => setSelectedUser({ uid: u.uid, name: u.name })}
                      loading={loading}
                      onRemoveUser={isAdmin || league.createdBy === user.uid ? (u) => setUserToRemoveFromLeague({ leagueId: league.id, userId: u.uid, userName: u.name }) : undefined}
                    />
                    <LeagueStats members={players.filter(p => league.members.includes(p.uid))} />
                    {isAdmin && orphanedMemberIds.length > 0 && <GhostMemberBanner count={orphanedMemberIds.length} repairing={repairingGhosts} result={repairResult} onRepair={repairGhostMembers} />}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {hasMoreLeagues && !leagueSearchLower && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              disabled={loadingMore}
              onClick={async () => {
                setLoadingMore(true);
                try { await loadMoreLeagues(); } finally { setLoadingMore(false); }
              }}
            >
              {loadingMore ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cargando...</> : 'Cargar más torneos'}
            </Button>
          </div>
        )}

        {leagues.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed dark:border-gray-700">
            {t('leagues.noLeagues')}
          </div>
        )}

        {leagues.length > 0 && leagueSearchLower && !filteredBenoliga && filteredOtherLeagues.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed dark:border-gray-700">
            {t('leagues.noSearchResults', 'No se encontraron torneos con "{{query}}"', { query: leagueSearch })}
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
            <h3 id="dialog-invite-title" className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{t('leagues.inviteTitle', '¡Invitación a Liga!')}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{t('leagues.inviteText', '{{inviter}} te invita a unirte a "{{league}}".', { inviter: pendingInvitation.inviter, league: pendingInvitation.league.name })}</p>
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
