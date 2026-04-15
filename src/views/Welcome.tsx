import React, { useState, useEffect } from "react";
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

function SquareClock({ type }: { type: 'worldcup' | 'predictions' }) {
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

  if (!mounted) return <div className="w-32 h-32 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl flex-shrink-0"></div>;

  const isTimeUp = timeLeft <= 0;

  const formatTime = (ms: number) => {
    if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days: Math.floor(ms / (1000 * 60 * 60 * 24)),
      hours: Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((ms % (1000 * 60)) / 1000)
    };
  };

  const time = formatTime(timeLeft);

  if (isTimeUp && type === 'predictions') {
    return (
      <div className="w-32 h-32 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-300 rounded-xl shadow-sm flex flex-col items-center justify-center gap-2 border border-red-200 dark:border-red-800 flex-shrink-0">
        <Lock className="w-8 h-8 text-red-600 dark:text-red-400" />
        <span className="text-xs font-bold text-center px-2">{t('countdown.timeUp')}</span>
      </div>
    );
  }

  if (isTimeUp && type === 'worldcup') {
    return null;
  }

  const title = type === 'worldcup' ? "Para el Mundial" : "Para Fijar";
  const colorClass = type === 'worldcup' ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-600 dark:border-indigo-500 text-indigo-900 dark:text-indigo-300" : "bg-blue-50 dark:bg-blue-900/20 border-blue-600 dark:border-blue-500 text-blue-900 dark:text-blue-300";

  return (
    <div className={`w-32 h-32 rounded-xl shadow-sm flex flex-col items-center justify-center border-4 flex-shrink-0 ${colorClass}`}>
      <span className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-80 text-center px-1">{title}</span>
      <div className="flex gap-1 text-center">
        <div className="flex flex-col">
          <span className="text-xl font-bold font-mono leading-none">{time.days}</span>
          <span className="text-[9px] uppercase">Días</span>
        </div>
        <span className="text-xl font-bold font-mono leading-none">:</span>
        <div className="flex flex-col">
          <span className="text-xl font-bold font-mono leading-none">{time.hours.toString().padStart(2, '0')}</span>
          <span className="text-[9px] uppercase">Hrs</span>
        </div>
      </div>
      <div className="flex gap-1 text-center mt-1">
        <div className="flex flex-col">
          <span className="text-xl font-bold font-mono leading-none">{time.minutes.toString().padStart(2, '0')}</span>
          <span className="text-[9px] uppercase">Min</span>
        </div>
        <span className="text-xl font-bold font-mono leading-none">:</span>
        <div className="flex flex-col">
          <span className="text-xl font-bold font-mono leading-none">{time.seconds.toString().padStart(2, '0')}</span>
          <span className="text-[9px] uppercase">Seg</span>
        </div>
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
    matches: 0
  });

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
        if (data.matches) {
          for (const match of matchesData) {
            const m = data.matches[match.id];
            if (m && m.outcome && m.outcome !== "") {
              matchesCount++;
            }
          }
        }

        setProgress({
          groups: groupsCount,
          specials: specialsCount,
          matches: matchesCount
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setReportFiles(prev => [...prev, ...newFiles]);
    }
    // Reset input so the same file can be selected again if needed
    e.target.value = '';
  };

  const removeFile = (indexToRemove: number) => {
    setReportFiles(prev => prev.filter((_, index) => index !== indexToRemove));
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
      <div id="tutorial-welcome" className="flex flex-col items-center justify-center gap-6 bg-blue-50 dark:bg-blue-900/20 p-8 rounded-2xl shadow-md border-4 border-blue-200 dark:border-blue-800 text-center transition-colors duration-200">
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-8">
          <SquareClock type="worldcup" />
          <div className="flex-1 flex flex-col items-center justify-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-1">
              Bienvenido a
            </h1>
            <h2 className="text-5xl md:text-6xl font-black text-gray-900 dark:text-gray-100 tracking-tight mb-4">
              El Prode de Beno
            </h2>
            <p className="text-blue-800 dark:text-blue-300 font-medium text-lg md:text-xl bg-white/50 dark:bg-gray-800/50 px-4 py-2 rounded-full">
              Pronostico deportivo del Mundial de fútbol 2026
            </p>
          </div>
          <SquareClock type="predictions" />
        </div>
        
        <div className="w-full mt-4 bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 text-left">Progreso de tus Predicciones</h3>
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-gray-600 dark:text-gray-400">Fase de Grupos</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{progress.groups} / 12</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${(progress.groups / 12) * 100}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-gray-600 dark:text-gray-400">Preguntas Especiales</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{progress.specials} / 10</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${(progress.specials / 10) * 100}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-gray-600 dark:text-gray-400">Partidos Individuales</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{progress.matches} / 48</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div className="bg-emerald-600 h-2 rounded-full transition-all duration-500" style={{ width: `${(progress.matches / 48) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>
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

      <Card className="hover:shadow-md transition-shadow border-t-4 border-t-sky-500 bg-sky-50/50 dark:bg-sky-900/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center gap-2 text-sky-900 dark:text-sky-400">
            <Users className="w-5 h-5" /> Invitar Amigos
          </CardTitle>
        </CardHeader>
        <CardContent className="text-gray-700 dark:text-gray-300">
          <p className="mb-4">
            ¡Invitá a tus amigos a jugar al Prode de Beno y desbloquea la medalla de "Sociable"!
          </p>
          <div className="flex gap-2">
            <input 
              type="text" 
              readOnly 
              value={`https://www.elprodedebeno.com.ar/?ref=${auth.currentUser?.uid}`} 
              className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <Button 
              onClick={() => {
                navigator.clipboard.writeText(`https://www.elprodedebeno.com.ar/?ref=${auth.currentUser?.uid}`);
                alert("Link copiado al portapapeles");
              }}
              className="bg-sky-600 hover:bg-sky-700 text-white"
            >
              Copiar Link
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
          <Button onClick={() => setIsReportModalOpen(true)} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white">
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
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
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
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3">{t('welcome.allowedFormats')}</p>
                  
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
                              <p className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => removeFile(index)}
                            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors shrink-0"
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
                  <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white py-6 text-lg">
                    {isSubmitting ? t('welcome.submitting') : t('welcome.submit')}
                  </Button>
                </div>
              </form>
            )}
            
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 text-center transition-colors duration-200">
              <p className="text-sm text-gray-500 dark:text-gray-400">
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
