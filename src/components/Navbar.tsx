import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { User, signOut } from "firebase/auth";
import { auth } from "../firebase";
import { Button } from "./ui/button";
import { Trophy, LogOut, Settings, PenSquare, BookOpen, Users, Home, Moon, Sun, User as UserIcon } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useTheme } from "./ThemeProvider";
import { useEffect, useState } from "react";

export function Navbar({ user, isAdmin }: { user: User | null; isAdmin?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
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
        className="text-white shadow-md z-50 mb-6 transition-colors duration-200 bg-cover relative"
        style={{ backgroundImage: 'url("/navbar.jpeg?v=2")', backgroundPosition: 'left center' }}
      >
        <div className="absolute inset-0 dark:bg-gray-950/80"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex items-center justify-between h-16">
            {/* Invisible clickable logo area */}
            <Link href="/" className="flex items-center gap-2 font-bold text-xl md:w-1/4 h-12 w-48" aria-label="Inicio">
            </Link>
            
            <div className="hidden md:flex items-center justify-center gap-1 lg:gap-2 xl:gap-3 flex-1 px-1">
              <Link href="/" className={getLinkStyle("/", "bg-red-500 border-red-700", "bg-red-600")}>
                <Home className="h-4 w-4 shrink-0" /> <span>{t('navbar.dashboard')}</span>
              </Link>
              <Link href="/instructions" className={getLinkStyle("/instructions", "bg-blue-500 border-blue-700", "bg-blue-600")}>
                <BookOpen className="h-4 w-4 shrink-0" /> <span>Reglas</span>
              </Link>
              <Link href="/predictions" className={getLinkStyle("/predictions", "bg-green-500 border-green-700", "bg-green-600")}>
                <PenSquare className="h-4 w-4 shrink-0" /> <span>{t('navbar.predictions')}</span>
              </Link>
              <Link href="/dashboard" className={getLinkStyle("/dashboard", "bg-orange-500 border-orange-700", "bg-orange-600")}>
                <Trophy className="h-4 w-4 shrink-0" /> <span>Ranking</span>
              </Link>
              <Link href="/leagues" className={getLinkStyle("/leagues", "bg-purple-500 border-purple-700", "bg-purple-600")}>
                <Users className="h-4 w-4 shrink-0" /> <span>Torneos</span>
              </Link>
              <Link href="/profile" className={getLinkStyle("/profile", "bg-indigo-500 border-indigo-700", "bg-indigo-600")}>
                <UserIcon className="h-4 w-4 shrink-0" /> <span>Mi Perfil</span>
              </Link>
              {isAdmin && (
                <Link href="/admin" className={getLinkStyle("/admin", "bg-gray-500 border-gray-700", "bg-gray-600")}>
                  <Settings className="h-4 w-4 shrink-0" /> <span>{t('navbar.admin')}</span>
                </Link>
              )}
            </div>
              
            <div className="flex items-center justify-end gap-3 md:w-1/4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleTheme} 
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 hidden sm:flex items-center justify-center h-9 w-9 p-0"
                title="Cambiar tema"
              >
                {mounted && (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
              </Button>
              {user && (
                <>
                  <Link href="/profile" className="flex items-center gap-2 hover:bg-white/10 p-1.5 rounded-md transition-colors">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-blue-400" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center">
                        {user.displayName?.charAt(0) || "U"}
                      </div>
                    )}
                  </Link>
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-blue-800 dark:hover:bg-gray-800 hover:text-white px-2">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      
      {/* Mobile nav (Bottom) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center items-center p-1 bg-blue-950 dark:bg-gray-900 border-t border-blue-800 dark:border-gray-800 transition-colors duration-200 pb-safe gap-0.5 h-16">
        <Link href="/" className={getMobileLinkStyle("/", "bg-red-500 border-red-700", "bg-red-600")}>
          <Home className="h-4 w-4 mb-0.5" /> <span className="text-[9px] leading-tight">Inicio</span>
        </Link>
        <Link href="/instructions" className={getMobileLinkStyle("/instructions", "bg-blue-500 border-blue-700", "bg-blue-600")}>
          <BookOpen className="h-4 w-4 mb-0.5" /> <span className="text-[9px] leading-tight">Reglas</span>
        </Link>
        <Link href="/predictions" className={getMobileLinkStyle("/predictions", "bg-green-500 border-green-700", "bg-green-600")}>
          <PenSquare className="h-4 w-4 mb-0.5" /> <span className="text-[9px] leading-tight">Prode</span>
        </Link>
        <Link href="/dashboard" className={getMobileLinkStyle("/dashboard", "bg-orange-500 border-orange-700", "bg-orange-600")}>
          <Trophy className="h-4 w-4 mb-0.5" /> <span className="text-[9px] leading-tight">Ranking</span>
        </Link>
        <Link href="/leagues" className={getMobileLinkStyle("/leagues", "bg-purple-500 border-purple-700", "bg-purple-600")}>
          <Users className="h-4 w-4 mb-0.5" /> <span className="text-[9px] leading-tight">Torneos</span>
        </Link>
        <Link href="/profile" className={getMobileLinkStyle("/profile", "bg-indigo-500 border-indigo-700", "bg-indigo-600")}>
          <UserIcon className="h-4 w-4 mb-0.5" /> <span className="text-[9px] leading-tight">Perfil</span>
        </Link>
        {isAdmin && (
          <Link href="/admin" className={getMobileLinkStyle("/admin", "bg-gray-500 border-gray-700", "bg-gray-600")}>
            <Settings className="h-4 w-4 mb-0.5" /> <span className="text-[9px] leading-tight">Admin</span>
          </Link>
        )}
      </div>
    </>
  );
}
