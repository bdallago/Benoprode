import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Home, Trophy, Users, PenSquare, BookOpen, MessageSquareWarning, X, FileText, Image as ImageIcon, Film, Clock, Lock } from "lucide-react";
import Link from "next/link";
import { Button } from "../components/ui/button";
import { addDoc, collection, doc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "../firebase";
import dynamic from "next/dynamic";
import { useTranslation } from 'react-i18next';
import { GROUPS, SPECIAL_QUESTIONS } from "../data";
import matchesData from "../lib/matches.json";

import { GuidedTour } from "../components/GuidedTour";

const WORLD_CUP_START = new Date('2026-06-11T00:00:00').getTime();
const DEADLINE = new Date('2026-06-08T00:00:00').getTime();

function ClockBanner({ type }: { type: 'worldcup' | 'predictions' }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setMounted(true);
    const targetDate = type === 'worldcup' ? WORLD_CUP_START : DEADLINE;
    setTimeLeft(targetDate - Date.now());
    const interval = setInterval(() => {
      setTimeLeft(targetDate - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [type]);

  if (!mounted) return <div className="w-full h-20 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg mb-4"></div>;

  const isTimeUp = timeLeft <= 0;

  const formatTime = (ms: number) => {
    if (ms <= 0) return `00 Días 00h 00m 00s`;
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${days} Días ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  };

  if (isTimeUp && type === 'predictions') {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-300 p-4 rounded-lg shadow-sm flex items-center gap-3 border border-red-200 dark:border-red-800 mb-4 transition-colors duration-200 w-full">
        <Lock className="w-6 h-6 text-red-600 dark:text-red-400" />
        <div className="text-left">
          <h3 className="font-bold">{t('countdown.timeUp')}</h3>
          <p className="text-sm">{t('countdown.timeUpDesc')}</p>
        </div>
      </div>
    );
  }

  if (isTimeUp && type === 'worldcup') {
    return null;
  }

  // Use explicit translations
  const title = type === 'worldcup' ? t('countdown.worldcupTitle', 'Tiempo restante para el Mundial') : t('countdown.predictionsTitle', 'Tiempo restante para fijar predicciones');
  const desc = type === 'worldcup' ? t('countdown.worldcupDesc', 'El 11 de Junio de 2026 comienza la copa del mundo.') : t('countdown.predictionsDesc', 'El 7 de Junio de 2026 es el último día para fijar elecciones.');

  return (
    <div className="bg-blue-900 text-white p-4 rounded-lg shadow-md flex flex-col items-center justify-center gap-3 border-t-4 border-blue-400 w-full h-full">
      <div className="flex flex-col items-center gap-2 text-center">
        <Clock className="w-6 h-6 text-blue-300" />
        <div>
          <h3 className="font-bold text-lg leading-tight">{title}</h3>
          <p className="text-blue-200 text-xs mt-1">{desc}</p>
        </div>
      </div>
      <div className="text-xl sm:text-2xl font-mono font-bold bg-blue-950 px-4 py-2 rounded-md border border-blue-800 text-center w-full">
        {formatTime(timeLeft)}
      </div>
    </div>
  );
}

export default function Welcome() {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportFiles, setReportFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { t } = useTranslation();

  const [progress, setProgress] = useState({
    groups: 0,
    specials: 0,
    matches: 0,
    matchesByDay: 0
  });

  const matchesByDayMap = React.useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const match of matchesData) {
      const day = match.date.split('T')[0];
      if (!map[day]) map[day] = [];
      map[day].push(match.id);
    }
    return map;
  }, []);

  const totalDays = Object.keys(matchesByDayMap).length;

  const [todayMatches, setTodayMatches] = useState<typeof matchesData>([]);

  useEffect(() => {
    // Current date logic: check if any matches are played today, 
    // Format YYYY-MM-DD
    const today = new Date();
    // Use Argentina's timezone to match the game's context
    const options = { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' } as const;
    const formatter = new Intl.DateTimeFormat('en-CA', options);
    
    try {
      const formattedToday = formatter.format(today); // YYYY-MM-DD format
      const matchesForToday = matchesData.filter(m => {
        if (!m.date) return false;
        return m.date.startsWith(formattedToday);
      });
      setTodayMatches(matchesForToday);
    } catch(e) {
      // Fallback if Intl fails
      const currentIso = today.toISOString().split('T')[0];
      setTodayMatches(matchesData.filter(m => m.date && m.date.startsWith(currentIso)));
    }
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const unsubscribe = onSnapshot(doc(db, "predictions", auth.currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Calculate groups progress
        let groupsCount = 0;
        if (data.groups) {
          for (const group in GROUPS) {
            if (data.groups[group] && data.groups[group].length === 4) {
              groupsCount++;
            }
          }
        }

        // Calculate specials progress
        let specialsCount = 0;
        if (data.specials) {
          for (const q of SPECIAL_QUESTIONS) {
            if (data.specials[q.id] && data.specials[q.id].trim() !== "") {
              specialsCount++;
            }
          }
        }

        // Calculate matches progress
        let matchesCount = 0;
        let daysCompletedCount = 0;
        if (data.matches) {
          for (const match of matchesData) {
            const m = data.matches[match.id];
            if (m && m.outcome && m.outcome !== "") {
              matchesCount++;
            }
          }

          for (const day in matchesByDayMap) {
            const allDayPredicted = matchesByDayMap[day].every(mid => {
              const m = data.matches[mid];
              return m && m.outcome && m.outcome !== "";
            });
            if (allDayPredicted) daysCompletedCount++;
          }
        }

        setProgress({
          groups: groupsCount,
          specials: specialsCount,
          matches: matchesCount,
          matchesByDay: daysCompletedCount
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setReportFiles((prev: any[]) => [...prev, ...newFiles]);
    }
    // Reset input so the same file can be selected again if needed
    e.target.value = '';
  };

  const removeFile = (indexToRemove: number) => {
    setReportFiles((prev: any[]) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const fileUrls: string[] = [];
      
      if (reportFiles.length > 0) {
        for (let i = 0; i < reportFiles.length; i++) {
          const file = reportFiles[i];
          const fileRef = ref(storage, `reports/${Date.now()}_${file.name}`);
          
          // Timeout to prevent hanging
          const uploadPromise = uploadBytes(fileRef, file);
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error(t('welcome.storageError'))), 15000)
          );
          
          await Promise.race([uploadPromise, timeoutPromise]);
          const url = await getDownloadURL(fileRef);
          fileUrls.push(url);
        }
      }

      // Guardamos el reporte en Firestore
      await addDoc(collection(db, "reports"), {
        message: reportText,
        userEmail: auth.currentUser?.email || "",
        userName: auth.currentUser?.displayName || "",
        createdAt: new Date().toISOString(),
        attachments: fileUrls
      });
      
      setSubmitSuccess(true);
      setTimeout(() => {
        setIsReportModalOpen(false);
        setSubmitSuccess(false);
        setReportText("");
        setReportFiles([]);
      }, 3000);
    } catch (error: any) {
      console.error("Error al guardar reporte:", error);
      setSubmitError(error.message || t('welcome.generalError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 relative">
      <GuidedTour />
      <div id="tutorial-welcome" className="flex flex-col items-center justify-center gap-6 text-center transition-colors duration-200">
        <div className="w-full flex flex-col items-center justify-center gap-4">
          <div className="flex-1 flex flex-col items-center justify-center mb-6 w-full"> {/* Increased bottom margin slightly */}
            <div className="w-full max-w-4xl mx-auto overflow-hidden rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800">
              {/* Mobile Header */}
              <img 
                src="/portada-telefono.jpeg" 
                alt="El Prode de Beno Mobile" 
                className="w-full h-auto block sm:hidden shrink-0"
              />
              {/* Desktop Header */}
              <img 
                src="/portada-escritorio.jpeg" 
                alt="El Prode de Beno Desktop" 
                className="w-full h-auto hidden sm:block shrink-0"
              />
            </div>
            
            {/* SEO & Screen readers */}
            <h1 className="sr-only">Bienvenido a El Prode de Beno</h1>
            <p className="sr-only">Pronóstico deportivo del Mundial de fútbol 2026</p>
          </div>
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
            <ClockBanner type="worldcup" />
            <ClockBanner type="predictions" />
          </div>
        </div>
        
        <div className="w-full mt-4 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden group">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-5 text-left border-b border-gray-100 dark:border-gray-700 pb-2">{t('welcome.progressTitle', 'Progreso de tus predicciones')}</h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="w-32 text-sm font-bold text-gray-600 dark:text-gray-200">{t('welcome.groupStage', 'Fase de Grupos')}</span>
              <div className="flex-1 flex gap-1 h-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className={`flex-1 rounded-sm ${i < progress.groups ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
                ))}
              </div>
              <span className="text-sm font-bold w-12 text-right dark:text-gray-100">{progress.groups} / 12</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-32 text-sm font-bold text-gray-600 dark:text-gray-200">{t('welcome.individualMatches', 'Partidos Individuales')}</span>
              
              {/* Desktop Progress (72 tiny bars) */}
              <div className="hidden sm:flex flex-1 gap-[1px] h-3">
                {Array.from({ length: 72 }).map((_, i) => (
                  <div key={i} className={`flex-1 rounded-sm ${i < progress.matches ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
                ))}
              </div>

              {/* Mobile Progress (Days-based) */}
              <div className="flex sm:hidden flex-1 gap-1 h-3">
                {Array.from({ length: totalDays }).map((_, i) => (
                  <div key={i} className={`flex-1 rounded-sm ${i < progress.matchesByDay ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
                ))}
              </div>

              <span className="text-sm font-bold w-12 text-right dark:text-gray-100">{progress.matches} / 72</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-32 text-sm font-bold text-gray-600 dark:text-gray-200">{t('welcome.specialQuestions', 'Preg. Especiales')}</span>
              <div className="flex-1 flex gap-1 h-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className={`flex-1 rounded-sm ${i < progress.specials ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
                ))}
              </div>
              <span className="text-sm font-bold w-12 text-right dark:text-gray-100">{progress.specials} / 10</span>
            </div>
          </div>
        </div>

        {/* Partidos de Hoy */}
        {todayMatches.length > 0 && (
           <div className="w-full mt-4 bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm text-left">
             <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                 <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{t('welcome.todayMatches', 'Hoy Juegan')}</h3>
               </div>
               <div className="text-xs font-bold text-gray-500 dark:text-gray-200 bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
                  {new Date().toLocaleDateString('es-AR', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' })}
               </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
               {todayMatches.map(match => {
                 const dateObj = new Date(match.date);
                 const timeStr = dateObj.toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute:'2-digit' });
                 
                 // Encontrar a qué grupo pertenece el partido
                 const groupEntry = Object.entries(GROUPS).find(([_, teams]) => 
                   teams.includes(match.teamA) && teams.includes(match.teamB)
                 );
                 const groupName = groupEntry ? groupEntry[0] : 'E';

                 return (
                   <div key={match.id} className="relative overflow-hidden flex flex-col justify-between bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow group">
                     {/* Fondo sutil indicando el grupo */}
                     <div className="absolute top-0 right-0 p-2 opacity-10 font-black text-6xl pointer-events-none -mt-4 -mr-2 text-gray-900 dark:text-white">
                        {groupName}
                     </div>

                     <div className="flex items-center justify-between z-10 w-full mb-3">
                        <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-sm">
                           {t('welcome.group', 'GRUPO')} {groupName}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-sm">
                           <Clock className="w-3 h-3" />
                           {timeStr} hs
                        </div>
                     </div>

                     <div className="flex justify-between items-center z-10 w-full">
                       <div className="flex-1 font-bold text-gray-800 dark:text-gray-200 truncate text-base">{match.teamA}</div>
                       <div className="px-3 text-xs font-bold text-gray-400 dark:text-gray-300">VS</div>
                       <div className="flex-1 font-bold text-gray-800 dark:text-gray-200 text-right truncate text-base">{match.teamB}</div>
                     </div>
                   </div>
                 );
               })}
             </div>
           </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/instructions" id="tutorial-instructions" className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border-t-4 border-t-blue-500 hover:shadow-md transition-all group">
          <BookOpen className="w-8 h-8 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-gray-800 dark:text-gray-200">{t('welcome.instructionsTitle')}</span>
        </Link>

        <Link href="/predictions" id="tutorial-predictions" className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border-t-4 border-t-green-500 hover:shadow-md transition-all group">
          <PenSquare className="w-8 h-8 text-green-500 mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-gray-800 dark:text-gray-200">{t('welcome.predictionsTitle')}</span>
        </Link>

        <Link href="/dashboard" id="tutorial-ranking" className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border-t-4 border-t-orange-500 hover:shadow-md transition-all group">
          <Trophy className="w-8 h-8 text-orange-500 mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-gray-800 dark:text-gray-200">{t('welcome.rankingTitle')}</span>
        </Link>

        <Link href="/leagues" id="tutorial-leagues" className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border-t-4 border-t-purple-500 hover:shadow-md transition-all group">
          <Users className="w-8 h-8 text-purple-500 mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-gray-800 dark:text-gray-200">{t('welcome.leaguesTitle')}</span>
        </Link>
      </div>

      <Card className="hover:shadow-md transition-shadow border-t-4 border-t-sky-500 bg-sky-50 dark:bg-sky-950">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center gap-2 text-sky-900 dark:text-sky-400">
            <Users className="w-5 h-5" /> {t('welcome.inviteFriends', 'Invitar Amigos')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-gray-700 dark:text-gray-300">
          <p className="mb-4">
            {t('welcome.inviteFriendsDesc', '¡Invitá a tus amigos a jugar al Prode de Beno y desbloquea la medalla de "Sociable"!')}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input 
              type="text" 
              readOnly 
              value={`https://www.elprodedebeno.com.ar/?ref=${auth.currentUser?.uid}`} 
              className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
            />
            <Button 
              onClick={() => {
                navigator.clipboard.writeText(`https://www.elprodedebeno.com.ar/?ref=${auth.currentUser?.uid}`);
                alert(t('welcome.linkCopied', 'Link copiado al portapapeles'));
              }}
              className="whitespace-nowrap"
            >
              {t('welcome.copyLink', 'Copiar Link')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card id="tutorial-report" className="hover:shadow-md transition-shadow border-t-4 border-t-red-500 bg-red-50/50 dark:bg-red-900/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center gap-2 text-red-900 dark:text-red-400">
            <MessageSquareWarning className="w-5 h-5" /> {t('welcome.reportTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-gray-700 dark:text-gray-300">
          <p className="mb-4">
            {t('welcome.reportDesc')}
          </p>
          <Button onClick={() => setIsReportModalOpen(true)} className="w-full sm:w-auto" variant="destructive">
            {t('welcome.reportBtn')}
          </Button>
        </CardContent>
      </Card>

      {/* Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full shadow-2xl relative transition-colors duration-200">
            <button onClick={() => setIsReportModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('welcome.reportModalTitle')}</h3>
            <p className="text-gray-600 dark:text-gray-200 mb-6 text-sm">
              {t('welcome.reportModalDesc')}
            </p>
            
            {submitSuccess ? (
              <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 p-4 rounded-lg border border-green-200 dark:border-green-800 text-center transition-colors duration-200">
                <p className="font-bold">{t('welcome.reportSuccess')}</p>
                <p className="text-sm mt-1">{t('welcome.reportSuccessDesc')}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="space-y-4">
                {submitError && (
                  <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-3 rounded-lg border border-red-200 dark:border-red-800 text-sm transition-colors duration-200">
                    {submitError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('welcome.yourMessage')}</label>
                  <textarea 
                    required
                    rows={5}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors duration-200"
                    placeholder={t('welcome.placeholder')}
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('welcome.attachFiles')}</label>
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/40 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/60 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors duration-200"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-200 mt-1 mb-3">{t('welcome.allowedFormats')}</p>
                  
                  {reportFiles.length > 0 && (
                    <div className="space-y-2 mt-3 max-h-40 overflow-y-auto pr-2">
                      {reportFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-2 rounded border border-gray-200 dark:border-gray-600 transition-colors duration-200">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className="bg-blue-100 dark:bg-blue-900/40 p-1.5 rounded text-blue-600 dark:text-blue-400 shrink-0">
                              {file.type.startsWith('image/') ? <ImageIcon className="w-4 h-4" /> : 
                               file.type.startsWith('video/') ? <Film className="w-4 h-4" /> : 
                               <FileText className="w-4 h-4" />}
                            </div>
                            <div className="truncate">
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{file.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-200">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => removeFile(index)}
                            className="p-1.5 text-gray-400 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors shrink-0"
                            title={t('welcome.deleteFile')}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="pt-2">
                  <Button type="submit" disabled={isSubmitting} className="w-full py-6 text-lg">
                    {isSubmitting ? t('welcome.submitting') : t('welcome.submit')}
                  </Button>
                </div>
              </form>
            )}
            
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 text-center transition-colors duration-200">
              <p className="text-sm text-gray-500 dark:text-gray-200">
                {t('welcome.orEmail')}<br/>
                <a href="mailto:bdallago01@gmail.com" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">bdallago01@gmail.com</a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
