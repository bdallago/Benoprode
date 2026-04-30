import { Bell, Check, Trash2, Trophy, Users, ShieldAlert, Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, deleteDoc, writeBatch, getDocs, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { User } from "firebase/auth";
import Link from "next/link";
import { Button } from "./ui/button";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { es, enUS } from "date-fns/locale";

interface Notification {
  id: string;
  userId: string;
  type: 'friend_request' | 'league_invite' | 'match_result' | 'badge_earned' | 'ranking_drop' | 'system_alert' | 'duel_invite' | 'duel_accepted';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string; // Optional URL to navigate to when clicked
  fromUserId?: string;
  duelId?: string;
  matchId?: string;
  duelType?: string;
  leagueId?: string;
  badgeId?: string;
}

function getRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return "hace instantes";
  if (diffMins < 60) return `hace ${diffMins} minuto${diffMins === 1 ? '' : 's'}`;
  if (diffHours < 24) return `hace ${diffHours} hora${diffHours === 1 ? '' : 's'}`;
  if (diffDays < 30) return `hace ${diffDays} día${diffDays === 1 ? '' : 's'}`;
  return `hace ${diffMonths} mes${diffMonths === 1 ? '' : 'es'}`;
}

export function NotificationCenter({ user }: { user: User }) {
  const { t, i18n } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Ask for push notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Find newly added notifications in this snapshot
      const newDocs = snapshot.docChanges().filter(change => change.type === 'added').map(change => ({ id: change.doc.id, ...change.doc.data() } as Notification));
      
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(notifs);

      // Web Push Notification Logic (Max 1 per day)
      if (newDocs.length > 0 && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        const lastPushStr = localStorage.getItem("lastPushDate");
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        if (lastPushStr !== today) {
          const notifToPush = newDocs[0];
          try {
            new Notification(notifToPush.title, {
              body: notifToPush.message,
              icon: '/icono.png',
            });
            localStorage.setItem("lastPushDate", today);
          } catch (e) {
            console.error("Browser push notification failed", e);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;
  // Maximum 3 items visible before having to scroll
  // An item with buttons is roughly 85px max
  const maxTrayHeight = 'max-h-[260px]';

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await updateDoc(doc(db, "notifications", id), { read: true });
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, "notifications", n.id), { read: true });
    });
    await batch.commit();
  };

  const handleAcceptLeagueInvite = async (notif: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notif.leagueId) return;
    setProcessingId(notif.id);
    
    try {
      const { getDoc, arrayUnion } = await import('firebase/firestore');
      const leagueRef = doc(db, 'leagues', notif.leagueId);
      const leagueSnap = await getDoc(leagueRef);
      
      if (leagueSnap.exists()) {
        const leagueData = leagueSnap.data();
        if (!leagueData.members.includes(user.uid)) {
          await updateDoc(leagueRef, {
            members: arrayUnion(user.uid)
          });
        }
        
        if (notif.fromUserId) {
          await addDoc(collection(db, "notifications"), {
            userId: notif.fromUserId,
            type: 'system_alert',
            title: 'Invitación Aceptada',
            message: `${user.displayName || "Un usuario"} se unió a tu liga.`,
            read: false,
            createdAt: new Date().toISOString(),
            actionUrl: `/dashboard?tab=leagues`
          });
        }
      }
      
      await markAsRead(notif.id);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleAcceptFriendRequest = async (notif: Notification, e: React.MouseEvent) => {
    if (!notif.fromUserId) return;
    setProcessingId(notif.id);
    
    try {
      // Find the request
      const qReq = query(collection(db, 'friendRequests'), where('fromUserId', '==', notif.fromUserId), where('toUserId', '==', user.uid), where('status', '==', 'pending'));
      const snap = await getDocs(qReq);
      
      const batch = writeBatch(db);
      snap.docs.forEach(d => {
        batch.update(d.ref, { status: 'accepted', updatedAt: new Date().toISOString() });
      });

      // Create friendship record
      const friendshipRef = doc(collection(db, 'friendships'));
      batch.set(friendshipRef, {
        user1Id: user.uid,
        user2Id: notif.fromUserId,
        createdAt: new Date().toISOString()
      });
      
      await batch.commit();

      // Notify the requester
      await addDoc(collection(db, "notifications"), {
        userId: notif.fromUserId,
        type: 'system_alert',
        title: 'Solicitud Aceptada',
        message: `${user.displayName || "Un usuario"} aceptó tu solicitud de amistad.`,
        read: false,
        createdAt: new Date().toISOString(),
        actionUrl: `/profile?tab=friends`
      });

      await markAsRead(notif.id);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRespondDuel = async (notif: Notification, accept: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notif.duelId && !notif.fromUserId) return;
    setProcessingId(notif.id);
    
    try {
      if (notif.duelId) {
        await updateDoc(doc(db, 'duels_v2', notif.duelId), { status: accept ? 'accepted' : 'rejected' });
      } else {
        // Find duel manually if ID wasn't provided directly (fallback)
        const qDuel = query(collection(db, 'duels_v2'), where('challengerId', '==', notif.fromUserId), where('challengedId', '==', user.uid), where('status', '==', 'pending'));
        const snap = await getDocs(qDuel);
        if (!snap.empty) {
          const docRef = snap.docs[0].ref;
          await updateDoc(docRef, { status: accept ? 'accepted' : 'rejected' });
        }
      }

      if (accept) {
        await addDoc(collection(db, "notifications"), {
          userId: notif.fromUserId,
          type: 'duel_accepted',
          title: 'Duelo Aceptado',
          message: `${user.displayName || "Un usuario"} aceptó tu duelo.`,
          read: false,
          createdAt: new Date().toISOString(),
          actionUrl: `/profile?tab=duels`
        });
      }

      await markAsRead(notif.id);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch(type) {
      case 'badge_earned': return <Star className="h-5 w-5 text-yellow-500" />;
      case 'league_invite': return <Users className="h-5 w-5 text-purple-500" />;
      case 'match_result': return <Trophy className="h-5 w-5 text-green-500" />;
      case 'system_alert': return <ShieldAlert className="h-5 w-5 text-red-500" />;
      case 'duel_invite':
      case 'duel_accepted': return <Trophy className="h-5 w-5 text-orange-500" />;
      default: return <Bell className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-full relative transition-colors ${unreadCount > 0 ? 'bg-red-500 hover:bg-red-600 shadow-md' : 'hover:bg-white/10'}`}
      >
        <Bell className="h-5 w-5 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-white rounded-full flex items-center justify-center text-[11px] font-black text-red-600 shadow-md border-2 border-red-500">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setIsOpen(false)}></div>
          <div className="fixed left-4 right-4 top-[72px] sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[400px] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 animate-in slide-in-from-top-2">
            <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Bell className="h-4 w-4" /> {t('notifications.title', 'Notificaciones')}
              </h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  {t('notifications.markAllAsRead', 'Marcar leídas')}
                </button>
              )}
            </div>
            
            <div className={`overflow-y-auto ${maxTrayHeight}`}>
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                  {t('notifications.noNotifications')}
                </div>
              ) : (
                notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    className={`p-4 border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors flex gap-3 relative ${!notif.read ? 'bg-blue-50/20 dark:bg-blue-900/10' : ''}`}
                  >
                    <div className="pt-1 flex-shrink-0">
                      {getIcon(notif.type)}
                    </div>
                    
                    <div className="flex-1 pr-6" onClick={() => !notif.read && markAsRead(notif.id)}>
                      {notif.actionUrl ? (
                        <Link href={notif.actionUrl} className="block" onClick={() => setIsOpen(false)}>
                          <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-0.5">{notif.title}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug">{notif.message}</p>
                        </Link>
                      ) : (
                        <div className="cursor-default">
                          <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-0.5">{notif.title}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug">{notif.message}</p>
                        </div>
                      )}
                      
                      <span className="text-[10px] font-medium text-gray-400 mt-1.5 block">
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: i18n.language === 'es' ? es : enUS })}
                      </span>

                      {/* Action Buttons for specific types */}
                      {!notif.read && notif.type === 'friend_request' && notif.fromUserId && (
                        <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="outline" className="h-7 text-xs bg-white text-blue-600 border-blue-200 hover:bg-blue-50 dark:bg-gray-800 dark:border-gray-600 dark:text-blue-400" onClick={(e) => handleAcceptFriendRequest(notif, e)} disabled={processingId === notif.id}>
                            {t('notifications.acceptRequest')}
                          </Button>
                        </div>
                      )}

                      {!notif.read && notif.type === 'league_invite' && notif.leagueId && (
                        <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="outline" className="h-7 text-xs bg-white text-purple-600 border-purple-200 hover:bg-purple-50 dark:bg-gray-800 dark:border-gray-600 dark:text-purple-400" onClick={(e) => handleAcceptLeagueInvite(notif, e)} disabled={processingId === notif.id}>
                            {t('notifications.joinLeague')}
                          </Button>
                        </div>
                      )}
                      
                      {!notif.read && notif.type === 'duel_invite' && notif.fromUserId && (
                        <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="success" className="h-7 text-xs" onClick={(e) => handleRespondDuel(notif, true, e)} disabled={processingId === notif.id}>
                            {t('notifications.acceptDuel')}
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={(e) => handleRespondDuel(notif, false, e)} disabled={processingId === notif.id}>
                            {t('notifications.reject')}
                          </Button>
                        </div>
                      )}
                      
                    </div>

                    {/* Checkmark to read */}
                    <div className="absolute right-3 top-3">
                      {!notif.read && (
                        <button onClick={(e) => markAsRead(notif.id, e)} className="text-blue-500 hover:text-blue-700 bg-blue-50 rounded-full p-1 border border-blue-100 dark:border-blue-900/30 dark:bg-blue-900/30 dark:text-blue-400">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
