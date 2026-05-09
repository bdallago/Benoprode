'use client';

import React from 'react';
import { Trophy, Swords } from 'lucide-react';
import Link from 'next/link';

interface Member {
  uid: string;
  displayName: string;
  photoURL: string;
  totalPoints: number;
}

interface BracketSlotProps {
  member: Member | null;
  isWinner: boolean;
  seed: number;
}

function BracketSlot({ member, isWinner, seed }: BracketSlotProps) {
  const initials = member ? member.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
  return (
    <Link
      href={member ? `/profile/${member.uid}` : '#'}
      className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
        isWinner
          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 shadow-sm'
          : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
      } ${member ? 'hover:border-blue-400 dark:hover:border-blue-500' : 'opacity-40 cursor-default pointer-events-none'}`}
    >
      <div className="shrink-0 text-[10px] text-gray-400 font-bold w-4 text-center">#{seed}</div>
      {member?.photoURL ? (
        <img src={member.photoURL} alt={member.displayName} className="w-7 h-7 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
      ) : (
        <div className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center shrink-0">{initials}</div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{member?.displayName.split(' ')[0] ?? '—'}</div>
        <div className="text-[10px] text-gray-500 dark:text-gray-400">{member?.totalPoints ?? 0}pts</div>
      </div>
      {isWinner && <Trophy className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
    </Link>
  );
}

export function LeagueBracket({ members }: { members: Member[] }) {
  if (members.length < 2) return null;

  const sorted = [...members].sort((a, b) => b.totalPoints - a.totalPoints);
  const [s1, s2, s3, s4] = [sorted[0], sorted[1], sorted[2] ?? null, sorted[3] ?? null];

  if (members.length < 4) {
    // 2-3 members: just show top 2 in a final
    const winner = s1.totalPoints >= s2.totalPoints ? s1 : s2;
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 animate-in fade-in duration-300">
        <div className="flex items-center gap-2 mb-4">
          <Swords className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Bracket de la liga</h3>
          <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500">Basado en puntos actuales</span>
        </div>
        <div className="space-y-1 max-w-[220px] mx-auto">
          <p className="text-[10px] text-gray-400 text-center mb-2 uppercase font-bold">Final</p>
          <BracketSlot member={s1} isWinner={s1.uid === winner.uid} seed={1} />
          <BracketSlot member={s2} isWinner={s2.uid === winner.uid} seed={2} />
        </div>
      </div>
    );
  }

  // 4+ members: semi-finals → final
  // Seed 1 vs Seed 4, Seed 2 vs Seed 3
  const semi1Winner = (s1?.totalPoints ?? 0) >= (s4?.totalPoints ?? 0) ? s1 : s4;
  const semi2Winner = (s2?.totalPoints ?? 0) >= (s3?.totalPoints ?? 0) ? s2 : s3;
  const finalist1 = semi1Winner;
  const finalist2 = semi2Winner;
  const finalWinner = (finalist1?.totalPoints ?? 0) >= (finalist2?.totalPoints ?? 0) ? finalist1 : finalist2;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 mb-4">
        <Swords className="w-4 h-4 text-orange-500" />
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Bracket de la liga</h3>
        <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500">Basado en puntos actuales</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
        {/* Left semi */}
        <div className="space-y-1">
          <p className="text-[10px] text-gray-400 text-center mb-1.5 uppercase font-bold">Semif. 1</p>
          <BracketSlot member={s1} isWinner={semi1Winner?.uid === s1?.uid} seed={1} />
          <BracketSlot member={s4} isWinner={semi1Winner?.uid === s4?.uid} seed={4} />
        </div>

        {/* Final */}
        <div className="flex flex-col items-center gap-1 px-1">
          <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Final</p>
          <BracketSlot member={finalist1} isWinner={finalWinner?.uid === finalist1?.uid} seed={finalist1?.uid === s1?.uid ? 1 : 2} />
          <BracketSlot member={finalist2} isWinner={finalWinner?.uid === finalist2?.uid} seed={finalist2?.uid === s2?.uid ? 2 : 3} />
        </div>

        {/* Right semi */}
        <div className="space-y-1">
          <p className="text-[10px] text-gray-400 text-center mb-1.5 uppercase font-bold">Semif. 2</p>
          <BracketSlot member={s2} isWinner={semi2Winner?.uid === s2?.uid} seed={2} />
          <BracketSlot member={s3} isWinner={semi2Winner?.uid === s3?.uid} seed={3} />
        </div>
      </div>
    </div>
  );
}
