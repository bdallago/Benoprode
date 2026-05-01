import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, limit, doc, getDoc, updateDoc, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Button } from './ui/button';
import { Send, AlertTriangle } from 'lucide-react';
import { TeamFlag } from './Fixture';
import { useTranslation } from 'react-i18next';

import { checkBadWords } from '../lib/badwords';

export function LiveChat() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isBanned, setIsBanned] = useState(false);
  const [warnings, setWarnings] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock live match data (Match 1: Mexico vs South Africa)
  const liveMatch = {
    teamA: 'México',
    teamB: 'Sudáfrica',
    scoreA: 0,
    scoreB: 0,
    minute: 0,
    events: [] as { type: string, team: string, player: string, minute: number }[]
  };

  useEffect(() => {
    if (!auth.currentUser) return;

    // Check ban status
    const checkBanStatus = async () => {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setIsBanned(data.isChatBanned || false);
        setWarnings(data.chatWarnings || 0);
      }
    };
    checkBanStatus();

    // Calculate 1 hour ago
    const oneHourAgoDate = new Date(Date.now() - 3600000);

    const q = query(
      collection(db, 'liveChat'),
      where('createdAt', '>=', oneHourAgoDate),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).reverse();
      setMessages(msgs);
      setTimeout(() => {
        const chatContainer = messagesEndRef.current?.parentElement;
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 100);
    });

    return () => unsubscribe();
  }, []);

  const containsBadWords = (text: string) => {
    return checkBadWords(text);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !auth.currentUser || isBanned) return;

    const messageText = newMessage.trim();
    setNewMessage(''); // Clear immediately so it feels instant

    if (containsBadWords(messageText)) {
      const newWarnings = warnings + 1;
      setWarnings(newWarnings);
      setShowWarning(true);
      
      const userRef = doc(db, 'users', auth.currentUser.uid);
      if (newWarnings >= 2) {
        setIsBanned(true);
        updateDoc(userRef, { chatWarnings: newWarnings, isChatBanned: true });
      } else {
        updateDoc(userRef, { chatWarnings: newWarnings });
      }
      
      setTimeout(() => setShowWarning(false), 5000);
      return;
    }

    try {
      // Create local timestamp locally until serverTimestamp overrides it if we wanted pessimistic UI
      await addDoc(collection(db, 'liveChat'), {
        text: messageText,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Usuario',
        createdAt: new Date() // Use actual client Date to make sorting and filtering easier across multiple queries since serverTimestamp is null immediately
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatTime = (dateObj: any) => {
    if (!dateObj) return '';
    try {
      // Handle Firebase Timestamp or JS Date
      const date = dateObj.toDate ? dateObj.toDate() : new Date(dateObj);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Scoreboard */}
      <div className="bg-blue-900 text-white p-4 flex flex-col items-center justify-center relative">
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-600 px-2 py-0.5 rounded text-xs font-bold animate-pulse">
          <span className="w-2 h-2 bg-white rounded-full"></span> {t('liveChat.live')}
        </div>
        <div className="text-sm font-medium text-blue-200 mb-2">{liveMatch.minute}'</div>
        <div className="flex justify-center items-center w-full px-2">
          <div className="flex flex-col items-center flex-1 min-w-0">
            <TeamFlag teamName={liveMatch.teamA} />
            <span className="font-bold text-xs sm:text-sm mt-1 text-center truncate w-full">{liveMatch.teamA}</span>
          </div>
          <div className="px-4 shrink-0">
            <div className="text-2xl sm:text-3xl font-black font-mono bg-blue-950 px-3 sm:px-4 py-1 rounded-lg border border-blue-800 shadow-inner">
              {liveMatch.scoreA} - {liveMatch.scoreB}
            </div>
          </div>
          <div className="flex flex-col items-center flex-1 min-w-0">
            <TeamFlag teamName={liveMatch.teamB} />
            <span className="font-bold text-xs sm:text-sm mt-1 text-center truncate w-full">{liveMatch.teamB}</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-blue-200 flex flex-wrap justify-center gap-3">
          {liveMatch.events.map((ev, idx) => (
            <div key={idx} className="flex items-center gap-1">
              {ev.type === 'goal' && <span>⚽</span>}
              {ev.type === 'red_card' && <span className="w-2 h-3 bg-red-500 rounded-sm"></span>}
              <span>{ev.player} ({ev.minute}')</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-gray-50 dark:bg-gray-900/50">
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

      {/* Warning Message */}
      {showWarning && (
        <div className="bg-red-100 dark:bg-red-900/30 border-t border-red-200 dark:border-red-800 p-2 flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{t('liveChat.warning', 'Tu mensaje contiene lenguaje inapropiado. Advertencia')} {warnings}/2.</span>
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
        <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
          <input
            type="text"
            disabled
            placeholder={t('liveChat.placeholder')}
            className="flex-1 text-sm p-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-200 focus:ring-0 outline-none"
          />
          <Button 
            disabled
            className="px-4 bg-gray-400 cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
