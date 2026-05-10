import { useState, useEffect } from "react";
import { Clock, Lock } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { GROUP_STAGE_DEADLINE as DEADLINE } from '../lib/config';

export function CountdownBanner() {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setMounted(true);
    const initialRemaining = DEADLINE - Date.now();
    setTimeLeft(initialRemaining);
    if (initialRemaining <= 0) setIsLocked(true);

    const interval = setInterval(() => {
      const remaining = DEADLINE - Date.now();
      setTimeLeft(remaining);
      if (remaining <= 0 && !isLocked) {
        setIsLocked(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isLocked]);

  const skeletonBanner = (
    <div className="bg-blue-900 text-transparent p-4 rounded-lg shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 border-l-4 border-blue-400 animate-pulse">
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="w-6 h-6 rounded-full bg-blue-800"></div>
        <div className="space-y-2 w-full sm:w-48">
          <div className="h-5 bg-blue-800 rounded w-3/4"></div>
          <div className="h-4 bg-blue-800 rounded w-1/2"></div>
        </div>
      </div>
      <div className="w-full sm:w-64 h-12 bg-blue-950 px-4 py-2 rounded-md border border-blue-800"></div>
    </div>
  );

  if (!mounted) return skeletonBanner;

  const isTimeUp = timeLeft <= 0;

  const formatTime = (ms: number) => {
    if (ms <= 0) return `00 ${t('countdown.days')} 00h 00m 00s`;
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${days} ${t('countdown.days')} ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  };

  if (isTimeUp) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-300 p-4 rounded-lg shadow-sm flex items-center gap-3 border border-red-200 dark:border-red-800 transition-colors duration-200">
        <Lock className="w-6 h-6 text-red-600 dark:text-red-400" />
        <div>
          <h3 className="font-bold">{t('countdown.timeUp')}</h3>
          <p className="text-sm">{t('countdown.timeUpDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-900 text-white p-4 rounded-lg shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 border-l-4 border-blue-400">
      <div className="flex items-center gap-3">
        <Clock className="w-6 h-6 text-blue-300" />
        <div>
          <h3 className="font-bold text-lg">{t('countdown.timeLeft')}</h3>
          <p className="text-blue-200 text-sm">{t('countdown.deadline')}</p>
        </div>
      </div>
      <div className="text-2xl font-mono font-bold bg-blue-950 px-4 py-2 rounded-md border border-blue-800 text-center">
        {formatTime(timeLeft)}
      </div>
    </div>
  );
}
