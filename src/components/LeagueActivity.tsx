'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Activity, MessageCircle, UserPlus } from 'lucide-react';

interface ActivityItem {
  id: string;
  text: string;
  userName: string;
  createdAt: string;
  isSystem?: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export function LeagueActivity({ leagueId }: { leagueId: string }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'leagues', leagueId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(6)
    );
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityItem)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [leagueId]);

  if (loading || items.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-blue-500" />
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Actividad reciente</h3>
      </div>
      <div className="space-y-2.5">
        {items.map(item => (
          <div key={item.id} className="flex items-start gap-3 text-sm">
            <div className={`mt-0.5 shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${item.isSystem ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-100 dark:bg-gray-700'}`}>
              {item.isSystem
                ? <UserPlus className="w-3 h-3 text-blue-500" />
                : <MessageCircle className="w-3 h-3 text-gray-400 dark:text-gray-500" />}
            </div>
            <div className="flex-1 min-w-0">
              {item.isSystem ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">{item.text}</p>
              ) : (
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-snug">
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{item.userName}</span>
                  {': '}
                  <span>{item.text.length > 70 ? item.text.slice(0, 70) + '…' : item.text}</span>
                </p>
              )}
            </div>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0 mt-0.5">{timeAgo(item.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
