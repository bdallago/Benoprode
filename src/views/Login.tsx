import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { useRouter } from "next/navigation";
import { Button } from "../components/ui/button";
import { Trophy } from "lucide-react";
import { useTranslation } from 'react-i18next';

export default function Login() {
  const router = useRouter();
  const { t } = useTranslation();

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Error signing in with Google", error);
      alert(t('login.error'));
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center transition-colors duration-200">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 dark:bg-blue-900/40 p-4 rounded-full">
            <Trophy className="h-12 w-12 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('login.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          {t('login.subtitle')}
        </p>
        
        <Button onClick={handleLogin} className="w-full flex items-center justify-center gap-2 h-12 text-lg mb-6">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {t('login.button')}
        </Button>

        <div className="text-sm text-gray-500 dark:text-gray-400 flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4">
          <a href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors">
            {t('footer.privacy')}
          </a>
          <span className="hidden sm:inline">•</span>
          <a href="/terms" className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors">
            {t('footer.terms')}
          </a>
        </div>
      </div>
    </div>
  );
}
