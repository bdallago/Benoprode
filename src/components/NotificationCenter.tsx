import { Bell, Check, Trash2, Trophy, Users, ShieldAlert, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { User } from "firebase/auth";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Notification {
  id: string;
  userId: string;
  type: 'friend_request' | 'league_invite' | 'match_result' | 'badge_earned' | 'ranking_drop' | 'system_alert' | 'duel_invite' | 'duel_accepted';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string; // Optional URL to navigate to when clicked
}

export function NotificationCenter({ user }: { user: User }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

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
          // We haven't pushed today. Push the first new notification!
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

  const markAsRead = async (id: string) => {
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

  const deleteNotification = async (id: string) => {
    await deleteDoc(doc(db, "notifications", id));
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
        className="p-2 rounded-full hover:bg-white/10 relative transition-colors"
      >
        <Bell className="h-5 w-5 text-white" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md border border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50">
          <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Bell className="h-4 w-4" /> Notificaciones
            </h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Marcar leídas
              </button>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                No tienes notificaciones
              </div>
            ) : (
              notifications.map(notif => (
                <div 
                  key={notif.id} 
                  className={`p-3 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors flex gap-3 relative ${!notif.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
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
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: es })}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="absolute right-2 top-2 flex flex-col gap-2">
                    {!notif.read && (
                      <button onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }} className="text-blue-500 hover:text-blue-700">
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }} className="text-gray-300 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
