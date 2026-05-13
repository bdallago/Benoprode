import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, limit, doc, getDoc, updateDoc, where, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Button } from './ui/button';
import { Send, AlertTriangle, MessageCircle, X } from 'lucide-react';
import { TeamFlag } from './Fixture';
import { useTranslation } from 'react-i18next';
import { checkBadWords } from '../lib/badwords';
import matchesData from '../lib/matches.json';

import { CHAT_OPEN_TIMESTAMP } from '../lib/config';

const RATE_LIMIT_MS = 5000;
const MATCH_DURATION_MS = 120 * 60 * 1000;

function getCurrentOrNextMatch() {
  const now = Date.now();
  let current: (typeof matchesData)[0] | null = null;
  let next: (typeof matchesData)[0] | null = null;

  for (const match of matchesData) {
    const start = new Date(match.date).getTime();
    const end = start + MATCH_DURATION_MS;
    if (now >= start && now <= end) { current = match; break; }
    if (!next && start > now) next = match;
  }
  return { current, next };
}

function formatMatchDate(isoDate: string) {
  const d = new Date(isoDate);
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' });
}

export function LiveChat({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isBanned, setIsBanned] = useState(false);
  const [warnings, setWarnings] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(0);
  const [typingUsers, setTypingUsers] = useState<{ id: string; userName: string }[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { current: liveMatch, next: nextMatch } = getCurrentOrNextMatch();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    const checkBanStatus = async () => {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setIsBanned(data.isChatBanned || false);
        setWarnings(data.chatWarnings || 0);
      }
    };
    checkBanStatus();

    const oneHourAgo = new Date(Date.now() - 3600000);
    const q = query(
      collection(db, 'liveChat'),
      where('createdAt', '>=', oneHourAgo),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() })).reverse();
      setMessages(msgs);
      setTimeout(() => {
        const container = messagesEndRef.current?.parentElement;
        if (container) container.scrollTop = container.scrollHeight;
      }, 50);
    });

    return () => unsubscribe();
  }, [user]);

  // Subscribe to live typing indicators
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      collection(db, 'liveTyping'),
      (snap) => {
        const now = Date.now();
        setTypingUsers(
          snap.docs
            .filter(d => d.id !== user.uid && now - new Date(d.data().updatedAt).getTime() < 5000)
            .map(d => ({ id: d.id, userName: d.data().userName as string }))
        );
      },
      () => {}
    );
    return () => unsub();
  }, [user]);

  // Delete own typing doc on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (user) deleteDoc(doc(db, 'liveTyping', user.uid)).catch(() => {});
    };
  }, [user]);

  const chatIsOpen = Date.now() >= CHAT_OPEN_TIMESTAMP;
  const cooldownRemaining = Math.max(0, RATE_LIMIT_MS - (Date.now() - lastSentAt));
  const canSend = chatIsOpen && !isBanned && !!user && newMessage.trim().length > 0 && cooldownRemaining === 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!user || isBanned || !chatIsOpen) return;
    setDoc(doc(db, 'liveTyping', user.uid), {
      userName: user.displayName || 'Usuario',
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      deleteDoc(doc(db, 'liveTyping', user.uid)).catch(() => {});
    }, 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend || !user) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    deleteDoc(doc(db, 'liveTyping', user.uid)).catch(() => {});
    const messageText = newMessage.trim();
    setNewMessage('');

    if (checkBadWords(messageText)) {
      const newWarnings = warnings + 1;
      setWarnings(newWarnings);
      setShowWarning(true);
      const userRef = doc(db, 'users', user.uid);
      if (newWarnings >= 2) {
        setIsBanned(true);
        updateDoc(userRef, { chatWarnings: newWarnings, isChatBanned: true });
      } else {
        updateDoc(userRef, { chatWarnings: newWarnings });
      }
      setTimeout(() => setShowWarning(false), 5000);
      return;
    }

    setLastSentAt(Date.now());
    try {
      await addDoc(collection(db, 'liveChat'), {
        text: messageText,
        userId: user.uid,
        userName: user.displayName || 'Usuario',
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatTime = (dateObj: any) => {
    if (!dateObj) return '';
    try {
      const date = dateObj.toDate ? dateObj.toDate() : new Date(dateObj);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-blue-900 text-white p-4 flex flex-col items-center justify-center relative gap-2">
        <div className="absolute top-2 right-2 flex items-center gap-2">
          {liveMatch ? (
            <div className="flex items-center gap-1 bg-red-600 px-2 py-0.5 rounded text-xs font-bold animate-pulse">
              <span className="w-2 h-2 bg-white rounded-full inline-block" /> {t('liveChat.live')}
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-gray-600/80 px-2 py-0.5 rounded text-xs font-semibold">
              <span className="w-2 h-2 bg-gray-400 rounded-full inline-block" /> OFF
            </div>
          )}
          {onClose && (
            <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors" title="Cerrar">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {liveMatch ? (
          <>
            <div className="text-xs font-medium text-blue-200">{t('liveChat.matchInProgress', 'Partido en curso')}</div>
            <div className="flex justify-center items-center w-full px-2">
              <div className="flex flex-col items-center flex-1 min-w-0">
                <TeamFlag teamName={liveMatch.teamA} />
                <span className="font-bold text-xs sm:text-sm mt-1 text-center truncate w-full">{liveMatch.teamA}</span>
              </div>
              <div className="px-4 shrink-0 text-blue-300 font-bold text-sm">vs</div>
              <div className="flex flex-col items-center flex-1 min-w-0">
                <TeamFlag teamName={liveMatch.teamB} />
                <span className="font-bold text-xs sm:text-sm mt-1 text-center truncate w-full">{liveMatch.teamB}</span>
              </div>
            </div>
          </>
        ) : nextMatch ? (
          <>
            <div className="text-xs font-medium text-blue-200">{t('liveChat.nextMatch', 'Próximo partido')}</div>
            <div className="flex justify-center items-center w-full px-2">
              <div className="flex flex-col items-center flex-1 min-w-0">
                <TeamFlag teamName={nextMatch.teamA} />
                <span className="font-bold text-xs sm:text-sm mt-1 text-center truncate w-full">{nextMatch.teamA}</span>
              </div>
              <div className="px-3 shrink-0 flex flex-col items-center">
                <span className="text-blue-300 font-bold text-sm">vs</span>
                <span className="text-[10px] text-blue-300 mt-0.5">{formatMatchDate(nextMatch.date)}</span>
              </div>
              <div className="flex flex-col items-center flex-1 min-w-0">
                <TeamFlag teamName={nextMatch.teamB} />
                <span className="font-bold text-xs sm:text-sm mt-1 text-center truncate w-full">{nextMatch.teamB}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 py-1">
            <MessageCircle className="w-5 h-5 text-blue-300" />
            <span className="text-sm font-bold">Chat en vivo — Copa Mundial 2026</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900/50">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm p-4 text-center">
            {t('liveChat.noMessages')}
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className="text-sm flex flex-col mb-1">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="font-bold text-blue-700 dark:text-blue-400">{msg.userName}</span>
                {msg.createdAt && <span className="text-[10px] text-gray-400">{formatTime(msg.createdAt)}</span>}
              </div>
              <span className="text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg rounded-tl-none border border-gray-100 dark:border-gray-700 inline-block w-fit max-w-[90%] shadow-sm">
                {msg.text}
              </span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Warning */}
      {showWarning && (
        <div className="bg-red-100 dark:bg-red-900/30 border-t border-red-200 dark:border-red-800 p-2 flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{t('liveChat.warning', 'Lenguaje inapropiado. Advertencia')} {warnings}/2.</span>
        </div>
      )}

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex gap-0.5 items-end">
            {[0, 150, 300].map(delay => (
              <span key={delay} className="w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
            ))}
          </div>
          <span>
            {typingUsers.map(u => u.userName).join(', ')}
            {typingUsers.length === 1 ? ' está escribiendo...' : ' están escribiendo...'}
          </span>
        </div>
      )}

      {/* Input */}
      <div className="p-3 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
        {!chatIsOpen ? (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-1">
            El chat se abre el 11 de junio con el primer partido ⚽
          </p>
        ) : !user ? (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-1">
            {t('liveChat.loginRequired', 'Iniciá sesión para participar en el chat')}
          </p>
        ) : isBanned ? (
          <p className="text-center text-sm text-red-500 py-1">
            {t('liveChat.banned', 'Tu acceso al chat fue suspendido.')}
          </p>
        ) : (
          <form className="flex gap-2" onSubmit={handleSubmit}>
            <input
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              maxLength={500}
              placeholder={t('liveChat.placeholder')}
              className="flex-1 text-sm p-2 border border-gray-300 rounded-md dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-200 focus:ring-2 focus:ring-blue-400 outline-none"
            />
            <Button
              type="submit"
              disabled={!canSend}
              className="px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
