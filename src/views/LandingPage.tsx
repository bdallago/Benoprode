import { Trophy, Users, PenSquare, ArrowRight, Globe, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { useTranslation } from 'react-i18next';
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";

export default function LandingPage() {
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    // Catch any successful redirect sign-ins
    getRedirectResult(auth).then((result) => {
      if (result?.user) {
        router.push("/");
      }
    }).catch((error) => {
      console.error("Redirect login error:", error);
      alert(`Error de autenticación: ${error.message}`);
    });
  }, [router]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/");
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      // Fallback for browsers that block popups (Brave, Instagram, etc)
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || error.message?.includes('cross-origin')) {
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectError: any) {
          alert(`${t('login.error')}\nDetalle: ${redirectError.message}`);
        }
      } else {
        alert(`${t('login.error')}\nDetalle: ${error.message || 'Error desconocido. Inténtalo desde otro navegador como Chrome.'}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 transition-colors duration-200">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16 text-center">
        <div className="mb-8 overflow-hidden rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800">
          {/* Mobile Header */}
          <Image 
            src="/portada-telefono.jpeg" 
            alt="El Prode de Beno Mobile" 
            width={1080}
            height={1920}
            priority
            className="w-full h-auto block sm:hidden shrink-0"
          />
          {/* Desktop Header */}
          <Image 
            src="/portada-escritorio.jpeg" 
            alt="El Prode de Beno Desktop"
            width={1920}
            height={1080}
            priority 
            className="w-full h-auto hidden sm:block shrink-0"
          />
        </div>
        
        <p className="mt-4 text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-10">
          {t('landing.subtitle')}
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button 
            onClick={handleLogin} 
            size="lg" 
            className="text-lg h-14 px-8 font-bold text-white transition-all duration-100 ease-in-out shadow-md bg-blue-500 border-b-[4px] border-blue-700 hover:brightness-110 hover:-translate-y-0.5 active:border-b-0 active:translate-y-[4px] flex items-center gap-2 rounded-xl"
          >
            <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {t('landing.loginWithGoogle')}
          </Button>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white dark:bg-gray-900 py-20 border-y border-gray-100 dark:border-gray-800 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('landing.howItWorks')}</h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-200">{t('landing.howItWorksDesc')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            <div className="bg-blue-50 dark:bg-gray-800/50 p-8 rounded-2xl border border-blue-100 dark:border-gray-700 text-center">
              <div className="bg-blue-100 dark:bg-blue-900/40 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <PenSquare className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">{t('landing.feature1Title')}</h3>
              <p className="text-gray-600 dark:text-gray-200">
                {t('landing.feature1Desc')}
              </p>
            </div>

            <div className="bg-green-50 dark:bg-gray-800/50 p-8 rounded-2xl border border-green-100 dark:border-gray-700 text-center">
              <div className="bg-green-100 dark:bg-green-900/40 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">{t('landing.feature2Title')}</h3>
              <p className="text-gray-600 dark:text-gray-200">
                {t('landing.feature2Desc')}
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-gray-800/50 p-8 rounded-2xl border border-purple-100 dark:border-gray-700 text-center">
              <div className="bg-purple-100 dark:bg-purple-900/40 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">{t('landing.feature3Title')}</h3>
              <p className="text-gray-600 dark:text-gray-200">
                {t('landing.feature3Desc')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Social Proof / Footer CTA */}
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">{t('landing.readyToPlay')}</h2>
        <Button 
          onClick={handleLogin} 
          size="lg" 
          className="text-lg h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
        >
          {t('landing.playNow', '¡Empezá a jugar ahora!')} <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
        
        <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-200 flex flex-col items-center gap-2">
          <div className="flex flex-col sm:flex-row gap-4 mb-2">
            <a href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{t('terms.privacy', 'Política de Privacidad')}</a>
            <span className="hidden sm:inline">•</span>
            <a href="/terms" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{t('terms.title', 'Términos y Condiciones')}</a>
          </div>
        </div>
      </div>
    </div>
  );
}
