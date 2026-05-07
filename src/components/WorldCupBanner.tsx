import { useState, useEffect } from "react";
import { Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";

const WORLD_CUP_START = new Date('2026-06-11T00:00:00').getTime();

export function WorldCupBanner() {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTimeLeft(WORLD_CUP_START - Date.now());
    const interval = setInterval(() => {
      setTimeLeft(WORLD_CUP_START - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  const isTimeUp = timeLeft <= 0;

  const formatTime = (ms: number) => {
    if (ms <= 0) return `00 ${t('worldCupBanner.days')} 00h 00m 00s`;
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${days} ${t('worldCupBanner.days')} ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  };

  if (isTimeUp) {
    return null; // Don't show anything once it started, or maybe show a "¡El Mundial ha comenzado!" banner. For now, hide it.
  }

  return (
    <div className="bg-indigo-900 text-white p-4 rounded-lg shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 border-l-4 border-indigo-400 mb-6">
      <div className="flex items-center gap-3">
        <Trophy className="w-6 h-6 text-indigo-300" />
        <div>
          <h3 className="font-bold text-lg">{t('worldCupBanner.timeLeft')}</h3>
          <p className="text-indigo-200 text-sm">{t('worldCupBanner.startDate')}</p>
        </div>
      </div>
      <div className="text-2xl font-mono font-bold bg-indigo-950 px-4 py-2 rounded-md border border-indigo-800 text-center">
        {formatTime(timeLeft)}
      </div>
    </div>
  );
}
