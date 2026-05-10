import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { User, signOut } from "firebase/auth";
import { auth } from "../firebase";
import { Button } from "./ui/button";
import { Trophy, LogOut, Settings, PenSquare, BookOpen, Users, Home, Moon, Sun, User as UserIcon, Palette, Search } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useTheme } from "./ThemeProvider";
import { useEffect, useState } from "react";

import { NotificationCenter } from "./NotificationCenter";
import { SettingsModal } from "./SettingsModal";

export function Navbar({ user, isAdmin }: { user: User | null; isAdmin?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    for (const key of Object.keys(localStorage)) {
      if (
        key.startsWith('lastRead_') ||
        key.startsWith('lastReadComments_') ||
        key === 'lastReadLiveChat' ||
        key === 'hasSeenCommentsTooltip'
      ) {
        localStorage.removeItem(key);
      }
    }
    await signOut(auth);
    router.push("/");
  };

  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
    } else if (theme === 'light') {
      setTheme('dark');
    } else {
      // If system, toggle based on current system preference
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(isSystemDark ? 'light' : 'dark');
    }
  };

  const getLinkStyle = (path: string, colorNormal: string, colorPressed: string) => {
    const isActive = pathname === path;
    const baseStyle = "hidden md:flex items-center justify-center gap-1 px-1 lg:px-2 py-2 flex-1 max-w-[145px] rounded-xl font-bold text-white transition-all duration-100 ease-in-out text-[11px] lg:text-sm shadow-md whitespace-nowrap";
    if (isActive) {
      return `${baseStyle} ${colorPressed} translate-y-[4px] border-b-0`;
    } else {
      return `${baseStyle} ${colorNormal} border-b-[4px] hover:brightness-110 hover:-translate-y-0.5 active:border-b-0 active:translate-y-[4px]`;
    }
  };

  const getMobileLinkStyle = (path: string, colorNormal: string, colorPressed: string) => {
    const isActive = pathname === path;
    const baseStyle = "flex flex-col items-center justify-center p-2 rounded-xl text-white transition-all duration-100 ease-in-out font-bold shadow-sm flex-1 mx-1 max-w-[4rem]";
    if (isActive) {
      return `${baseStyle} ${colorPressed} translate-y-[4px] border-b-0`;
    } else {
      return `${baseStyle} ${colorNormal} border-b-[4px] hover:brightness-110 active:border-b-0 active:translate-y-[4px]`;
    }
  };

  return (
    <>
      <nav 
        className="text-white shadow-md z-50 mb-6 transition-colors duration-200 bg-cover sticky top-0 bg-center md:bg-left"
        style={{ backgroundImage: 'url("/navbar.jpeg")' }}
      >
        <div className="absolute inset-0 bg-black/10 dark:bg-black/30"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex items-center h-16">
            {/* Left column (desktop): balances the right so center nav is truly centered */}
            <Link href="/" className="hidden md:flex flex-1" aria-label="Inicio">
            </Link>

            <div className="hidden md:flex items-center justify-center gap-1 lg:gap-2 xl:gap-3 shrink-0 px-1">
              <Link href="/inicio" className={getLinkStyle("/inicio", "bg-red-500 border-red-700", "bg-red-600")}>
                <Home className="h-4 w-4 shrink-0" /> <span>{t('navbar.dashboard', 'Inicio')}</span>
              </Link>
              <Link href="/instructions" className={getLinkStyle("/instructions", "bg-blue-500 border-blue-700", "bg-blue-600")}>
                <BookOpen className="h-4 w-4 shrink-0" /> <span>{t('navbar.instructions', 'Reglas')}</span>
              </Link>
              <Link href="/predictions" className={getLinkStyle("/predictions", "bg-green-500 border-green-700", "bg-green-600")}>
                <PenSquare className="h-4 w-4 shrink-0" /> <span>{t('navbar.predictions', 'Prode')}</span>
              </Link>
              <Link href="/dashboard" className={getLinkStyle("/dashboard", "bg-orange-500 border-orange-700", "bg-orange-600")}>
                <Trophy className="h-4 w-4 shrink-0" /> <span>{t('navbar.ranking', 'Ranking')}</span>
              </Link>
              <Link href="/leagues" className={getLinkStyle("/leagues", "bg-purple-500 border-purple-700", "bg-purple-600")}>
                <Users className="h-4 w-4 shrink-0" /> <span>{t('navbar.leagues', 'Torneos')}</span>
              </Link>
              <Link href="/profile" className={getLinkStyle("/profile", "bg-indigo-500 border-indigo-700", "bg-indigo-600")}>
                <UserIcon className="h-4 w-4 shrink-0" /> <span>{t('navbar.profile', 'Mi Perfil')}</span>
              </Link>
              {isAdmin && (
                <Link href="/admin" className={getLinkStyle("/admin", "bg-gray-500 border-gray-700", "bg-gray-600")}>
                  <Settings className="h-4 w-4 shrink-0" /> <span>{t('navbar.admin', 'Admin')}</span>
                </Link>
              )}
            </div>
              
            <div className="flex items-center justify-between w-full md:justify-end gap-2 flex-1 relative">
              {/* Left Side: Theme */}
              <div className="flex items-center justify-start gap-2 md:gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleTheme} 
                  className="shrink-0 bg-amber-500/80 hover:bg-amber-400 dark:bg-indigo-600/80 dark:hover:bg-indigo-500 text-white border-white/40 border-2 shadow-lg hover:scale-105 transition-all flex items-center justify-center h-10 w-10 p-0 rounded-full"
                  title="Cambiar tema"
                >
                  {mounted && (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) ? (
                    <Moon className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Right Side: Search, Notifications & Profile Menu */}
              <div className="flex items-center justify-end gap-2 md:gap-3 ml-auto">
                {user && (
                  <Link href="/profile?tab=friends" passHref className="shrink-0">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-white hover:bg-white/10 h-10 w-10 p-0 rounded-full flex items-center justify-center"
                      title={t('profile.searchFriends', 'Buscar amigos') as string}
                    >
                      <Search className="h-5 w-5" />
                    </Button>
                  </Link>
                )}
                {user && <NotificationCenter user={user} />}
                {user && (
                  <div className="relative">
                    <button 
                      onClick={() => setProfileMenuOpen(!profileMenuOpen)} 
                      className="flex items-center hover:bg-white/10 p-1 rounded-full transition-colors shrink-0"
                    >
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-blue-400 object-cover shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center shrink-0">
                          {user.displayName?.charAt(0) || "U"}
                        </div>
                      )}
                    </button>
                    
                    {profileMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)}></div>
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                          <Link href="/profile" onClick={() => setProfileMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <UserIcon className="w-4 h-4" /> {t('navbar.profile', 'Ir al perfil')}
                          </Link>
                          <button onClick={() => { setProfileMenuOpen(false); setSettingsModalOpen(true); }} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                            <Settings className="w-4 h-4" /> {t('navbar.settings', 'Ajustes')}
                          </button>
                          <button onClick={() => { setProfileMenuOpen(false); handleLogout(); }} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer">
                            <LogOut className="w-4 h-4" /> {t('navbar.logout')}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Mobile nav (Bottom) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center items-center p-1 bg-blue-950 dark:bg-gray-900 border-t border-blue-800 dark:border-gray-800 transition-colors duration-200 pb-safe gap-0.5 h-16">
        <Link href="/inicio" className={getMobileLinkStyle("/inicio", "bg-red-500 border-red-700", "bg-red-600")}>
          <Home className="h-4 w-4 mb-0.5" /> <span className="text-[9px] leading-tight">{t('navbar.dashboard', 'Inicio')}</span>
        </Link>
        <Link href="/instructions" className={getMobileLinkStyle("/instructions", "bg-blue-500 border-blue-700", "bg-blue-600")}>
          <BookOpen className="h-4 w-4 mb-0.5" /> <span className="text-[9px] leading-tight">{t('navbar.instructions', 'Reglas')}</span>
        </Link>
        <Link href="/predictions" className={getMobileLinkStyle("/predictions", "bg-green-500 border-green-700", "bg-green-600")}>
          <PenSquare className="h-4 w-4 mb-0.5" /> <span className="text-[9px] leading-tight">{t('navbar.predictions', 'Prode')}</span>
        </Link>
        <Link href="/dashboard" className={getMobileLinkStyle("/dashboard", "bg-orange-500 border-orange-700", "bg-orange-600")}>
          <Trophy className="h-4 w-4 mb-0.5" /> <span className="text-[9px] leading-tight">{t('navbar.ranking', 'Ranking')}</span>
        </Link>
        <Link href="/leagues" className={getMobileLinkStyle("/leagues", "bg-purple-500 border-purple-700", "bg-purple-600")}>
          <Users className="h-4 w-4 mb-0.5" /> <span className="text-[9px] leading-tight">{t('navbar.leagues', 'Torneos')}</span>
        </Link>
        <Link href="/profile" className={getMobileLinkStyle("/profile", "bg-indigo-500 border-indigo-700", "bg-indigo-600")}>
          <UserIcon className="h-4 w-4 mb-0.5" /> <span className="text-[9px] leading-tight">{t('navbar.profileShort', 'Perfil')}</span>
        </Link>
        {isAdmin && (
          <Link href="/admin" className={getMobileLinkStyle("/admin", "bg-gray-500 border-gray-700", "bg-gray-600")}>
            <Settings className="h-4 w-4 mb-0.5" /> <span className="text-[9px] leading-tight">{t('navbar.admin', 'Admin')}</span>
          </Link>
        )}
      </div>

      <SettingsModal 
        isOpen={settingsModalOpen} 
        onClose={() => setSettingsModalOpen(false)} 
      />
    </>
  );
}
