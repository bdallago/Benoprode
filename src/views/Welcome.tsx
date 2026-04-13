import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Home, Trophy, Users, PenSquare, BookOpen, MessageSquareWarning, X, FileText, Image as ImageIcon, Film } from "lucide-react";
import Link from "next/link";
import { Button } from "../components/ui/button";
import { addDoc, collection } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "../firebase";
import dynamic from "next/dynamic";
import { useTranslation } from 'react-i18next';

const WorldCupBanner = dynamic(() => import("../components/WorldCupBanner").then(mod => mod.WorldCupBanner), {
  loading: () => <div className="h-32 w-full bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl"></div>
});

const CountdownBanner = dynamic(() => import("../components/CountdownBanner").then(mod => mod.CountdownBanner), {
  loading: () => <div className="h-24 w-full bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl"></div>
});

export default function Welcome() {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportFiles, setReportFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { t } = useTranslation();

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
      <WorldCupBanner />
      <CountdownBanner />
      <div id="tutorial-welcome" className="flex flex-col items-center justify-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 text-center transition-colors duration-200">
        <div className="w-full">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
            {t('welcome.title')}<br />"{t('welcome.appTitle')}"
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-4 text-lg text-justify">
            {t('welcome.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card id="tutorial-instructions" className="hover:shadow-md transition-shadow border-t-4 border-t-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center gap-2 text-blue-900 dark:text-blue-400">
              <BookOpen className="w-5 h-5" /> {t('welcome.instructionsTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-gray-600 dark:text-gray-300">
            <p className="mb-4">
              {t('welcome.instructionsDesc')}
            </p>
            <Link href="/instructions">
              <Button variant="outline" className="w-full">{t('welcome.readRules')}</Button>
            </Link>
          </CardContent>
        </Card>

        <Card id="tutorial-predictions" className="hover:shadow-md transition-shadow border-t-4 border-t-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center gap-2 text-green-900 dark:text-green-400">
              <PenSquare className="w-5 h-5" /> {t('welcome.predictionsTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-gray-600 dark:text-gray-300">
            <p className="mb-4">
              {t('welcome.predictionsDesc')}
            </p>
            <Link href="/predictions">
              <Button variant="outline" className="w-full">{t('welcome.makePredictions')}</Button>
            </Link>
          </CardContent>
        </Card>

        <Card id="tutorial-leagues" className="hover:shadow-md transition-shadow border-t-4 border-t-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center gap-2 text-purple-900 dark:text-purple-400">
              <Users className="w-5 h-5" /> {t('welcome.leaguesTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-gray-600 dark:text-gray-300">
            <p className="mb-4">
              {t('welcome.leaguesDesc')}
            </p>
            <Link href="/leagues">
              <Button variant="outline" className="w-full">{t('welcome.viewLeagues')}</Button>
            </Link>
          </CardContent>
        </Card>

        <Card id="tutorial-ranking" className="hover:shadow-md transition-shadow border-t-4 border-t-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center gap-2 text-orange-900 dark:text-orange-400">
              <Trophy className="w-5 h-5" /> {t('welcome.rankingTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-gray-600 dark:text-gray-300">
            <p className="mb-4">
              {t('welcome.rankingDesc')}
            </p>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">{t('welcome.viewRanking')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="hover:shadow-md transition-shadow border-t-4 border-t-red-500 bg-red-50/50 dark:bg-red-900/10">
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
