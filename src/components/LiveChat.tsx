import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, limit, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Button } from './ui/button';
import { Send, AlertTriangle } from 'lucide-react';
import { TeamFlag } from './Fixture';

const BAD_WORDS = ['insulto1', 'insulto2', 'racismo1', 'racismo2']; // Placeholder list

export function LiveChat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isBanned, setIsBanned] = useState(false);
  const [warnings, setWarnings] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock live match data
  const liveMatch = {
    teamA: 'México',
    teamB: 'Sudáfrica',
    scoreA: 1,
    scoreB: 1,
    minute: 65,
    events: [
      { type: 'goal', team: 'A', player: 'Chicharito', minute: 12 },
      { type: 'goal', team: 'B', player: 'Tshabalala', minute: 55 },
      { type: 'red_card', team: 'A', player: 'Marquez', minute: 60 }
    ]
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

    const q = query(
      collection(db, 'liveChat'),
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
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, []);

  const containsBadWords = (text: string) => {
    const lowerText = text.toLowerCase();
    return BAD_WORDS.some(word => lowerText.includes(word));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !auth.currentUser || isBanned) return;

    if (containsBadWords(newMessage)) {
      const newWarnings = warnings + 1;
      setWarnings(newWarnings);
      setShowWarning(true);
      
      const userRef = doc(db, 'users', auth.currentUser.uid);
      if (newWarnings >= 2) {
        setIsBanned(true);
        await updateDoc(userRef, { chatWarnings: newWarnings, isChatBanned: true });
      } else {
        await updateDoc(userRef, { chatWarnings: newWarnings });
      }
      
      setTimeout(() => setShowWarning(false), 5000);
      return;
    }

    try {
      await addDoc(collection(db, 'liveChat'), {
        text: newMessage.trim(),
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Usuario',
        createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Scoreboard */}
      <div className="bg-blue-900 text-white p-4 flex flex-col items-center justify-center relative">
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-600 px-2 py-0.5 rounded text-xs font-bold animate-pulse">
          <span className="w-2 h-2 bg-white rounded-full"></span> EN VIVO
        </div>
        <div className="text-sm font-medium text-blue-200 mb-2">{liveMatch.minute}'</div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <TeamFlag teamName={liveMatch.teamA} />
            <span className="font-bold text-sm">{liveMatch.teamA}</span>
          </div>
          <div className="text-3xl font-black font-mono bg-blue-950 px-4 py-1 rounded-lg border border-blue-800">
            {liveMatch.scoreA} - {liveMatch.scoreB}
          </div>
          <div className="flex flex-col items-center gap-1">
            <TeamFlag teamName={liveMatch.teamB} />
            <span className="font-bold text-sm">{liveMatch.teamB}</span>
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
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            No hay mensajes aún. ¡Sé el primero en comentar!
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className="text-sm">
              <span className="font-bold text-blue-700 dark:text-blue-400 mr-2">{msg.userName}:</span>
              <span className="text-gray-800 dark:text-gray-200">{msg.text}</span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Warning Message */}
      {showWarning && (
        <div className="bg-red-100 dark:bg-red-900/30 border-t border-red-200 dark:border-red-800 p-2 flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Tu mensaje contiene lenguaje inapropiado. Advertencia {warnings}/2.</span>
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
        {isBanned ? (
          <div className="text-center text-red-600 dark:text-red-400 text-sm font-medium p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
            Has sido baneado del chat por violar las reglas de convivencia.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1 text-sm p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength={200}
            />
            <Button 
              type="submit" 
              disabled={!newMessage.trim()}
              className="px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
