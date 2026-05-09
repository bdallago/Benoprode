'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection, query, orderBy, limit, onSnapshot,
  addDoc, getDocs, startAfter, QueryDocumentSnapshot, doc, updateDoc, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { db } from '../firebase';
import { X, Send, Shield } from 'lucide-react';
import { checkBadWords } from '../lib/badwords';

const MESSAGES_PER_PAGE = 50;

interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  photoURL?: string;
  createdAt: string;
  isSystem?: boolean;
  reactions?: Record<string, string[]>;
}

const EMOJI_SET = ['👍', '❤️', '😂', '😮', '🔥', '😢'];

interface Props {
  leagueId: string;
  leagueName: string;
  isPublic: boolean;
  isMember: boolean;
  currentUser: { uid: string; displayName: string | null; photoURL: string | null };
  onClose: () => void;
}

function isSameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

function dateSeparatorLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(date, today)) return 'Hoy';
  if (isSameDay(date, yesterday)) return 'Ayer';
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${date.getDate()} de ${months[date.getMonth()]}`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function Avatar({ photoURL, name }: { photoURL?: string; name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (photoURL) {
    return <img src={photoURL} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="w-8 h-8 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
      {initials}
    </div>
  );
}

export function LeagueChat({ leagueId, leagueName, isPublic, isMember, currentUser, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [badWordWarning, setBadWordWarning] = useState(false);
  const [pickerMsgId, setPickerMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const loadMoreFnRef = useRef<() => Promise<void>>(async () => {});

  // Mark as read on open
  useEffect(() => {
    localStorage.setItem(`lastRead_${leagueId}`, new Date().toISOString());
  }, [leagueId]);

  // Real-time subscription to last 50 messages
  useEffect(() => {
    setLoading(true);
    setLastDoc(null);
    setMessages([]);
    hasMoreRef.current = true;
    setHasMore(true);

    const q = query(
      collection(db, 'leagues', leagueId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(MESSAGES_PER_PAGE)
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs;
      if (docs.length > 0) setLastDoc(docs[docs.length - 1]);
      const newHasMore = docs.length === MESSAGES_PER_PAGE;
      hasMoreRef.current = newHasMore;
      setHasMore(newHasMore);
      const msgs = docs.map(d => ({ id: d.id, ...d.data() } as Message)).reverse();
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 50);
    });

    return () => unsub();
  }, [leagueId]);

  const loadMore = useCallback(async () => {
    if (!lastDoc || loadingMoreRef.current || !hasMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, 'leagues', leagueId, 'messages'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(MESSAGES_PER_PAGE)
      );
      const snap = await getDocs(q);
      const docs = snap.docs;
      const newHasMore = docs.length === MESSAGES_PER_PAGE;
      hasMoreRef.current = newHasMore;
      if (docs.length > 0) setLastDoc(docs[docs.length - 1]);
      setHasMore(newHasMore);
      const older = docs.map(d => ({ id: d.id, ...d.data() } as Message)).reverse();
      const prevScrollHeight = containerRef.current?.scrollHeight ?? 0;
      setMessages(prev => [...older, ...prev]);
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight - prevScrollHeight;
        }
      });
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [lastDoc, leagueId]);

  // Keep ref fresh so IntersectionObserver always calls the latest loadMore
  useEffect(() => { loadMoreFnRef.current = loadMore; }, [loadMore]);

  // Auto-load when user scrolls to top (infinite scroll)
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const container = containerRef.current;
    if (!sentinel || !container) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMoreFnRef.current(); },
      { root: container, threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [leagueId]);

  const sendMessage = useCallback(async () => {
    const text = newMessage.trim();
    if (!text || !isMember) return;

    if (isPublic && checkBadWords(text)) {
      setBadWordWarning(true);
      setTimeout(() => setBadWordWarning(false), 3000);
      return;
    }

    setNewMessage('');

    const msgData = {
      text,
      userId: currentUser.uid,
      userName: currentUser.displayName || 'Jugador',
      photoURL: currentUser.photoURL || null,
      createdAt: new Date().toISOString(),
    };

    await addDoc(collection(db, 'leagues', leagueId, 'messages'), msgData);
    await updateDoc(doc(db, 'leagues', leagueId), {
      lastMessageAt: msgData.createdAt,
      lastMessageUserId: currentUser.uid,
    }).catch((e) => console.warn('lastMessageAt update failed', e));
    localStorage.setItem(`lastRead_${leagueId}`, msgData.createdAt);
  }, [newMessage, isMember, isPublic, currentUser, leagueId]);

  const toggleReaction = useCallback(async (msgId: string, emoji: string) => {
    if (!isMember) return;
    const ref = doc(db, 'leagues', leagueId, 'messages', msgId);
    const msg = messages.find(m => m.id === msgId);
    const hasReacted = msg?.reactions?.[emoji]?.includes(currentUser.uid) ?? false;
    await updateDoc(ref, {
      [`reactions.${emoji}`]: hasReacted ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
    }).catch((e) => console.warn('reaction update failed', e));
    setPickerMsgId(null);
  }, [messages, leagueId, currentUser.uid, isMember]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Build message list with date separators
  const rendered: React.ReactNode[] = [];
  let prevDay = '';
  let prevUserId = '';
  let prevTime = 0;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const day = dateSeparatorLabel(msg.createdAt);
    if (day !== prevDay) {
      rendered.push(
        <div key={`sep-${msg.id}`} className="flex items-center gap-3 my-3">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{day}</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>
      );
      prevDay = day;
    }

    const isOwn = msg.userId === currentUser.uid;
    const msgTime = new Date(msg.createdAt).getTime();
    const grouped = !msg.isSystem && msg.userId === prevUserId && (msgTime - prevTime) < 5 * 60 * 1000;
    prevUserId = msg.isSystem ? '' : msg.userId;
    prevTime = msgTime;

    if (msg.isSystem) {
      rendered.push(
        <div key={msg.id} className="flex items-center justify-center my-2">
          <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
            {msg.text}
          </span>
        </div>
      );
      continue;
    }

    const reactionEntries = Object.entries(msg.reactions || {}).filter(([, uids]) => uids.length > 0);

    if (isOwn) {
      rendered.push(
        <div key={msg.id} className={`flex flex-col items-end ${grouped ? 'mt-0.5' : 'mt-3'} group/msg`}>
          {!grouped && (
            <span className="text-xs text-gray-400 dark:text-gray-500 mr-1 mb-1">{msg.userName}</span>
          )}
          <div className="flex items-end gap-1">
            {/* Reaction picker trigger */}
            <div className="relative">
              <button
                onClick={() => setPickerMsgId(pickerMsgId === msg.id ? null : msg.id)}
                className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 text-xs opacity-0 group-hover/msg:opacity-100 transition-opacity mb-1 px-1"
              >
                +😊
              </button>
              {pickerMsgId === msg.id && (
                <div className="absolute right-0 bottom-7 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-2 py-1 shadow-lg flex gap-1 whitespace-nowrap">
                  {EMOJI_SET.map(emoji => (
                    <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)} className="text-base hover:scale-125 transition-transform">{emoji}</button>
                  ))}
                </div>
              )}
            </div>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">{formatTime(msg.createdAt)}</span>
            <div className="max-w-[75%] bg-blue-500 text-white px-3 py-2 rounded-2xl rounded-br-sm text-sm break-words">
              {msg.text}
            </div>
          </div>
          {reactionEntries.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1 justify-end">
              {reactionEntries.map(([emoji, uids]) => (
                <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                  className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-0.5 transition-colors ${
                    uids.includes(currentUser.uid)
                      ? 'bg-blue-100 border-blue-300 dark:bg-blue-900/40 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                      : 'bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {emoji} <span className="font-medium">{uids.length}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    } else {
      rendered.push(
        <div key={msg.id} className={`flex items-end gap-2 ${grouped ? 'mt-0.5 pl-10' : 'mt-3'} group/msg`}>
          {!grouped && <Avatar photoURL={msg.photoURL} name={msg.userName} />}
          <div className="flex flex-col max-w-[75%]">
            {!grouped && (
              <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">{msg.userName}</span>
            )}
            <div className="flex items-end gap-1">
              <div className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 rounded-2xl rounded-bl-sm text-sm break-words">
                {msg.text}
              </div>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">{formatTime(msg.createdAt)}</span>
              {/* Reaction picker trigger */}
              <div className="relative">
                <button
                  onClick={() => setPickerMsgId(pickerMsgId === msg.id ? null : msg.id)}
                  className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 text-xs opacity-0 group-hover/msg:opacity-100 transition-opacity mb-1 px-1"
                >
                  +😊
                </button>
                {pickerMsgId === msg.id && (
                  <div className="absolute left-0 bottom-7 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-2 py-1 shadow-lg flex gap-1 whitespace-nowrap">
                    {EMOJI_SET.map(emoji => (
                      <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)} className="text-base hover:scale-125 transition-transform">{emoji}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {reactionEntries.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {reactionEntries.map(([emoji, uids]) => (
                  <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                    className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-0.5 transition-colors ${
                      uids.includes(currentUser.uid)
                        ? 'bg-blue-100 border-blue-300 dark:bg-blue-900/40 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {emoji} <span className="font-medium">{uids.length}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl shadow-2xl flex flex-col h-[90vh] sm:h-[600px]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex flex-col">
            <span className="font-bold text-gray-900 dark:text-white text-sm leading-tight">{leagueName}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">Chat de liga</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-0.5">
          <div ref={topSentinelRef} className="h-px" />
          {loadingMore && (
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 gap-2">
              <Shield className="w-10 h-10 opacity-30" />
              <p className="text-sm">Nadie habló todavía. ¡Rompé el hielo!</p>
            </div>
          ) : rendered}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
          {!isMember ? (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-2">
              Unite a la liga para chatear
            </p>
          ) : (
            <>
              {badWordWarning && (
                <p className="text-xs text-red-500 mb-2 text-center">
                  Ese mensaje contiene palabras no permitidas en ligas públicas.
                </p>
              )}
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Escribí un mensaje..."
                  maxLength={500}
                  className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-full px-4 py-2 text-sm outline-none placeholder-gray-400 disabled:opacity-60"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white rounded-full p-2 shrink-0 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
