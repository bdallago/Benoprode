import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { User } from 'firebase/auth';
import { doc, getDoc, getDocs, collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Trophy, Users, Swords, UserPlus, Check, X, Clock, BookOpen } from 'lucide-react';
import { getUserLevel, getUserBadges, BADGES } from '../lib/gamification';
import matchesData from '../lib/matches.json';
import { UserPredictionsModal } from '../components/UserPredictionsModal';

interface ProfileProps {
  user: User;
  profileId?: string; // If provided, viewing someone else's profile
}

export default function Profile({ user, profileId }: ProfileProps) {
  const isOwnProfile = !profileId || profileId === user.uid;
  const targetUserId = profileId || user.uid;

  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'friends' | 'duels'>('stats');

  // Friendship state
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'friends'>('none');
  const [friendRequestId, setFriendRequestId] = useState<string | null>(null);
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [pendingRequestsList, setPendingRequestsList] = useState<any[]>([]);
  const [duelsList, setDuelsList] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>({});
  
  // Duel modal state
  const [isPredictionsModalOpen, setIsPredictionsModalOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', targetUserId));
        if (userDoc.exists()) {
          setProfileData(userDoc.data());
          setUserStats((prev: any) => ({ ...prev, ...userDoc.data() }));
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    
    const unsubscribeLeagues = onSnapshot(collection(db, "leagues"), (snapshot) => {
      const leagues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const userLeagues = leagues.filter((l: any) => l.members?.includes(targetUserId) || l.createdBy === targetUserId);
      
      setUserStats((prev: any) => ({
        ...prev,
        inBenoliga: userLeagues.some((l: any) => l.name.toLowerCase().includes('benoliga') || l.id === 'benoliga'),
        inPrivateLeague: userLeagues.length > 0
      }));
    });
    
    return () => {
      unsubscribeLeagues();
    };
  }, [targetUserId]);

  useEffect(() => {
    // Fetch friends list
    const qFriends1 = query(collection(db, 'friendships'), where('user1Id', '==', targetUserId));
    const qFriends2 = query(collection(db, 'friendships'), where('user2Id', '==', targetUserId));

    const handleFriendsSnap = async (snap1: any, snap2: any) => {
      const friendIds = new Set<string>();
      snap1.docs.forEach((d: any) => friendIds.add(d.data().user2Id));
      snap2.docs.forEach((d: any) => friendIds.add(d.data().user1Id));

      const friendsData: any[] = [];
      for (const fid of Array.from(friendIds)) {
        const fDoc = await getDoc(doc(db, 'users', fid));
        if (fDoc.exists()) {
          friendsData.push({ id: fid, ...fDoc.data() });
        }
      }
      setFriendsList(friendsData);
    };

    const unsubF1 = onSnapshot(qFriends1, (snap1) => {
      getDocs(qFriends2).then(snap2 => handleFriendsSnap(snap1, snap2));
    });
    const unsubF2 = onSnapshot(qFriends2, (snap2) => {
      getDocs(qFriends1).then(snap1 => handleFriendsSnap(snap1, snap2));
    });

    // Fetch duels
    const qDuels1 = query(collection(db, 'duels_v2'), where('challengerId', '==', targetUserId));
    const qDuels2 = query(collection(db, 'duels_v2'), where('challengedId', '==', targetUserId));

    const handleDuelsSnap = (snap1: any, snap2: any) => {
      const allDuels = new Map();
      snap1.docs.forEach((d: any) => allDuels.set(d.id, { id: d.id, ...d.data() }));
      snap2.docs.forEach((d: any) => allDuels.set(d.id, { id: d.id, ...d.data() }));
      setDuelsList(Array.from(allDuels.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    };

    const unsubD1 = onSnapshot(qDuels1, (snap1) => {
      getDocs(qDuels2).then(snap2 => handleDuelsSnap(snap1, snap2));
    });
    const unsubD2 = onSnapshot(qDuels2, (snap2) => {
      getDocs(qDuels1).then(snap1 => handleDuelsSnap(snap1, snap2));
    });

    let unsubReqs: any = () => {};
    if (isOwnProfile) {
      const qReqs = query(collection(db, 'friendRequests'), where('toUserId', '==', user.uid), where('status', '==', 'pending'));
      unsubReqs = onSnapshot(qReqs, async (snap) => {
        const reqsData: any[] = [];
        for (const d of snap.docs) {
          const fromId = d.data().fromUserId;
          const uDoc = await getDoc(doc(db, 'users', fromId));
          if (uDoc.exists()) {
            reqsData.push({ id: d.id, fromUserId: fromId, ...uDoc.data() });
          }
        }
        setPendingRequestsList(reqsData);
      });
    }

    return () => {
      unsubF1();
      unsubF2();
      unsubD1();
      unsubD2();
      unsubReqs();
    };
  }, [targetUserId, isOwnProfile, user]);

  useEffect(() => {
    if (isOwnProfile) return;

    // Check friendship status
    const q1 = query(
      collection(db, 'friendRequests'),
      where('fromUserId', '==', user.uid),
      where('toUserId', '==', targetUserId)
    );
    const q2 = query(
      collection(db, 'friendRequests'),
      where('fromUserId', '==', targetUserId),
      where('toUserId', '==', user.uid)
    );
    const q3 = query(
      collection(db, 'friendships'),
      where('user1Id', 'in', [user.uid, targetUserId])
    );

    const unsub1 = onSnapshot(q1, (snap) => {
      if (!snap.empty) {
        const req = snap.docs[0];
        if (req.data().status === 'pending') {
          setFriendStatus('pending_sent');
          setFriendRequestId(req.id);
        }
      }
    });

    const unsub2 = onSnapshot(q2, (snap) => {
      if (!snap.empty) {
        const req = snap.docs[0];
        if (req.data().status === 'pending') {
          setFriendStatus('pending_received');
          setFriendRequestId(req.id);
        }
      }
    });

    const unsub3 = onSnapshot(q3, (snap) => {
      const friendship = snap.docs.find(d => 
        (d.data().user1Id === user.uid && d.data().user2Id === targetUserId) ||
        (d.data().user1Id === targetUserId && d.data().user2Id === user.uid)
      );
      if (friendship) {
        setFriendStatus('friends');
        setFriendshipId(friendship.id);
      }
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [user.uid, targetUserId, isOwnProfile]);

  const handleSendFriendRequest = async () => {
    try {
      await addDoc(collection(db, 'friendRequests'), {
        fromUserId: user.uid,
        toUserId: targetUserId,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error sending friend request:", error);
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!friendRequestId) return;
    try {
      await updateDoc(doc(db, 'friendRequests', friendRequestId), {
        status: 'accepted'
      });
      await addDoc(collection(db, 'friendships'), {
        user1Id: user.uid,
        user2Id: targetUserId,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto p-8 animate-pulse">Cargando perfil...</div>;
  }

  if (!profileData) {
    return <div className="max-w-4xl mx-auto p-8 text-center">Usuario no encontrado</div>;
  }

  const level = getUserLevel(profileData.totalPoints || 0);
  const badgeIds = profileData.earnedBadges || [];
  const badges = badgeIds.map((id: string) => BADGES.find(b => b.id === id)).filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card className="overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
        <CardContent className="relative pt-0 pb-6 px-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12 sm:-mt-16 mb-4">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-gray-800 bg-white dark:bg-gray-700 overflow-hidden flex-shrink-0">
              {profileData.photoURL ? (
                <img src={profileData.photoURL} alt={profileData.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-blue-600 dark:text-blue-400">
                  {profileData.displayName?.charAt(0) || "U"}
                </div>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{profileData.displayName}</h1>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${level.bg} ${level.color}`}>
                  {level.name}
                </span>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {profileData.totalPoints || 0} pts
                </span>
              </div>
            </div>
            {!isOwnProfile && (
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                {friendStatus === 'none' && (
                  <Button onClick={handleSendFriendRequest} className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" /> Enviar Solicitud de Amistad
                  </Button>
                )}
                {friendStatus === 'pending_sent' && (
                  <Button disabled variant="outline" className="border-gray-300 text-gray-600 bg-gray-50 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Solicitud Enviada
                  </Button>
                )}
                {friendStatus === 'pending_received' && (
                  <Button onClick={handleAcceptFriendRequest} variant="success" className="flex items-center gap-2">
                    <Check className="w-4 h-4" /> Aceptar Solicitud de Amistad
                  </Button>
                )}
                {friendStatus === 'friends' && (
                  <>
                    <Button variant="outline" disabled className="text-green-700 border-green-200 bg-green-50 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 font-bold flex items-center gap-2">
                      <Users className="w-4 h-4" /> Son Amigos
                    </Button>
                    <Button onClick={() => setIsPredictionsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-bold flex items-center gap-2">
                      <Swords className="w-4 h-4" /> Ver sus predicciones y Retar
                    </Button>
                  </>
                )}
              </div>
            )}
            
            {/* Si es su perfil, mostrar botón directo a ver predicciones propias compartibles */}
            {isOwnProfile && (
               <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <Button onClick={() => setIsPredictionsModalOpen(true)} variant="outline" className="font-bold flex items-center gap-2 shadow-sm border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30">
                    <BookOpen className="w-4 h-4" /> Ver predicciones
                  </Button>
               </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex border-b dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-xl sticky top-2 z-10 shadow-sm mt-4">
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-4 text-sm font-bold border-b-[3px] transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 ${activeTab === 'stats' ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
        >
          Resumen
        </button>
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 py-4 text-sm font-bold border-b-[3px] transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 ${activeTab === 'friends' ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
        >
          <div className="flex items-center justify-center gap-2">
            Amigos
            {isOwnProfile && pendingRequestsList.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-bounce">{pendingRequestsList.length}</span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('duels')}
          className={`flex-1 py-4 text-sm font-bold border-b-[3px] transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 ${activeTab === 'duels' ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
        >
          Duelos
        </button>
      </div>

      {/* Tab Content */}
      <div className="py-4">
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
               <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col justify-center text-center">
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-bold mb-1">POSICIÓN GLOBAL</div>
                  <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2"># -</div>
                  <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">Ir a la tabla general</Link>
               </div>
            </div>

            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Medallero
            </h3>
            {badges.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {badges.map((badge: any) => (
                  <div key={badge.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center text-center gap-2 hover:shadow-md transition-shadow">
                    <span className="text-4xl hover:scale-110 transition-transform">{badge.icon}</span>
                    <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{badge.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">Aún no hay medallas para mostrar.</p>
            )}
          </div>
        )}

        {activeTab === 'friends' && (
          <div className="space-y-8">
            {isOwnProfile && pendingRequestsList.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Solicitudes Entrantes</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pendingRequestsList.map(req => (
                    <div key={req.id} className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-between gap-4">
                      <Link href={`/profile/${req.fromUserId}`} className="flex items-center gap-3 flex-1 hover:opacity-80">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center overflow-hidden shrink-0">
                          {req.photoURL ? (
                            <img src={req.photoURL} alt={req.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-blue-600 dark:text-blue-400 font-bold">{req.displayName?.charAt(0) || 'U'}</span>
                          )}
                        </div>
                        <span className="font-bold text-gray-900 dark:text-gray-100">{req.displayName}</span>
                      </Link>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white p-2"
                          onClick={() => {
                            // Accept request inline
                            updateDoc(doc(db, 'friendRequests', req.id), { status: 'accepted' });
                            addDoc(collection(db, 'friendships'), { user1Id: user!.uid, user2Id: req.fromUserId, createdAt: new Date().toISOString() });
                          }}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50 p-2"
                          onClick={() => {
                            // Reject request inline
                            updateDoc(doc(db, 'friendRequests', req.id), { status: 'rejected' });
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Lista de Amigos</h3>
              {friendsList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {friendsList.map(friend => (
                    <Link key={friend.id} href={`/profile/${friend.id}`} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center gap-4 hover:border-blue-500 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center overflow-hidden shrink-0">
                        {friend.photoURL ? (
                          <img src={friend.photoURL} alt={friend.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-blue-600 dark:text-blue-400 font-bold text-lg">{friend.displayName?.charAt(0) || 'U'}</span>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-gray-100">{friend.displayName}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{friend.totalPoints || 0} pts</div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Aún no hay amigos en esta lista.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'duels' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Historial de Duelos</h3>
            
            {duelsList.length > 0 && (
              <div className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex-1 text-center border-r border-gray-200 dark:border-gray-600">
                  <div className="text-sm text-gray-500">Duelos Ganados</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {duelsList.reduce((acc, d) => acc + (d.winnerId === targetUserId ? (d.duelType === 'group_complete' ? 3 : 1) : 0), 0)}
                  </div>
                </div>
                <div className="flex-1 text-center border-r border-gray-200 dark:border-gray-600">
                  <div className="text-sm text-gray-500">Duelos Perdidos</div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {duelsList.filter(d => d.winnerId && d.winnerId !== targetUserId).length}
                  </div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-sm text-gray-500">Puntos Extra (3 = 1 pt)</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {Math.floor(duelsList.reduce((acc, d) => acc + (d.winnerId === targetUserId ? (d.duelType === 'group_complete' ? 3 : 1) : 0), 0) / 3)}
                  </div>
                </div>
              </div>
            )}

            {duelsList.length > 0 ? (
              <div className="space-y-4 mt-4">
                {duelsList.map(duel => {
                  const isChallenger = duel.challengerId === targetUserId;
                  const otherUserName = isChallenger ? duel.challengedName : duel.challengerName;
                  const isWinner = duel.winnerId === targetUserId;
                  const isLoser = duel.winnerId && duel.winnerId !== targetUserId;
                  
                  let statusText = 'En curso';
                  let statusClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
                  
                  if (duel.status === 'pending') {
                      statusText = 'Pendiente';
                      statusClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
                  } else if (duel.status === 'rejected') {
                      statusText = 'Rechazado';
                      statusClass = 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
                  } else if (duel.status === 'accepted') {
                      statusText = 'Aceptado (En curso)';
                      statusClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
                  } else if (duel.status === 'completed') {
                     if (isWinner) {
                        statusText = 'Ganador';
                        statusClass = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
                     } else if (isLoser) {
                        statusText = 'Perdedor';
                        statusClass = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
                     } else {
                        statusText = 'Empate';
                        statusClass = 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
                     }
                  }

                  const formatDuelEventName = (matchId: string, duelType: string) => {
                      if (duelType === 'group_complete') {
                          const groupLetter = matchId.replace('group_', '').replace('_complete', '');
                          return `Grupo ${groupLetter} Completo`;
                      }
                      if (duelType === 'group_position') {
                          const parts = matchId.split('_');
                          // check safe parsing
                          if (parts.length >= 4) return `Puesto ${parts[3]} - Grupo ${parts[1]}`;
                      }
                      if (duelType === 'match_exact' || duelType === 'match_winner') {
                          const matchInfo = matchesData.find((m: any) => m.id === matchId);
                          if (matchInfo) {
                             return `${matchInfo.teamA} vs ${matchInfo.teamB}`;
                          }
                      }
                      if (duelType === 'special') return `Pregunta Especial`;
                      if (duelType === 'knockout') return `Fase Eliminatoria`;
                      return matchId;
                  };
                  
                  const eventName = formatDuelEventName(duel.matchId, duel.duelType);
                  const typeLabel = duel.duelType === 'match_exact' ? 'Resultado Exacto' : (duel.duelType === 'match_winner' ? 'Ganador/Empate' : '');

                  return (
                    <div key={duel.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
                          <Swords className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 dark:text-gray-100">
                            Duelo vs {otherUserName || 'Usuario'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Evento: {eventName} {typeLabel ? `(${typeLabel})` : ''}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${statusClass}`}>
                          {statusText}
                        </span>
                        
                        {isOwnProfile && duel.challengedId === targetUserId && duel.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="success" onClick={() => updateDoc(doc(db, 'duels_v2', duel.id), { status: 'accepted' })}>Aceptar</Button>
                            <Button size="sm" variant="destructive" onClick={() => updateDoc(doc(db, 'duels_v2', duel.id), { status: 'rejected' })}>Rechazar</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
                <Swords className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No hay duelos registrados.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {isPredictionsModalOpen && profileData && (
        <UserPredictionsModal 
          userId={targetUserId} 
          userName={profileData.displayName} 
          userPoints={profileData.totalPoints || 0}
          onClose={() => setIsPredictionsModalOpen(false)} 
        />
      )}

    </div>
  );
}
