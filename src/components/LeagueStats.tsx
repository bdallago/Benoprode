'use client';

import React from 'react';
import { BarChart2, Crown, Medal, Users } from 'lucide-react';
import Link from 'next/link';

interface Member {
  uid: string;
  displayName: string;
  photoURL: string;
  totalPoints: number;
}

interface Props {
  members: Member[];
}

const PODIUM_COLORS = [
  { bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-300 dark:border-yellow-700', text: 'text-yellow-600 dark:text-yellow-400', icon: <Crown className="w-4 h-4 text-yellow-500" /> },
  { bg: 'bg-gray-100 dark:bg-gray-700/50', border: 'border-gray-300 dark:border-gray-600', text: 'text-gray-500 dark:text-gray-400', icon: <Medal className="w-4 h-4 text-gray-400" /> },
  { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-500 dark:text-orange-400', icon: <Medal className="w-4 h-4 text-orange-500" /> },
];

function Avatar({ photoURL, name }: { photoURL: string; name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (photoURL) {
    return <img src={photoURL} alt={name} className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-gray-800" referrerPolicy="no-referrer" />;
  }
  return (
    <div className="w-10 h-10 rounded-full bg-blue-500 text-white text-sm font-bold flex items-center justify-center border-2 border-white dark:border-gray-800">
      {initials}
    </div>
  );
}

export function LeagueStats({ members }: Props) {
  if (members.length === 0) return null;

  const sorted = [...members].sort((a, b) => b.totalPoints - a.totalPoints);
  const top3 = sorted.slice(0, 3);
  const totalPoints = members.reduce((s, m) => s + (m.totalPoints || 0), 0);
  const avgPoints = Math.round(totalPoints / members.length);
  const leader = sorted[0];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="w-4 h-4 text-blue-500" />
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Estadísticas de la liga</h3>
      </div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-3 mb-5">
        {top3.map((player, i) => {
          const style = PODIUM_COLORS[i];
          const heights = ['h-20', 'h-14', 'h-10'];
          return (
            <Link
              key={player.uid}
              href={`/profile/${player.uid}`}
              className={`flex flex-col items-center gap-1.5 flex-1 max-w-[100px] group`}
            >
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                {player.totalPoints}pts
              </span>
              <Avatar photoURL={player.photoURL} name={player.displayName} />
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate w-full text-center group-hover:text-blue-500 transition-colors">
                {player.displayName.split(' ')[0]}
              </span>
              <div className={`w-full ${heights[i]} ${style.bg} border-t-2 ${style.border} rounded-t-md flex items-start justify-center pt-1`}>
                {style.icon}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Users className="w-3 h-3 text-gray-400" />
          </div>
          <div className="text-lg font-black text-gray-900 dark:text-white">{members.length}</div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Jugadores</div>
        </div>
        <div className="text-center border-x border-gray-100 dark:border-gray-700">
          <div className="text-lg font-black text-gray-900 dark:text-white">{avgPoints}</div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Prom. puntos</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-black text-blue-600 dark:text-blue-400 truncate">
            {leader.displayName.split(' ')[0]}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Líder</div>
        </div>
      </div>
    </div>
  );
}
