import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { User, signOut } from "firebase/auth";
import { auth } from "../firebase";
import { Button } from "./ui/button";
import { Trophy, LogOut, Settings, PenSquare, BookOpen, Users, Home, Moon, Sun } from "lucide-react";
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

  const getLinkStyle = (path: string, baseClass: string, hoverClass: string, activeClass: string) => {
    const isActive = pathname === path;
    return `hidden md:flex items-center gap-1 px-3 py-2 rounded-md transition-all duration-300 ${isActive ? activeClass : baseClass} ${hoverClass} hover:shadow-md text-white`;
  };

  const getMobileLinkStyle = (path: string, baseClass: string, activeClass: string) => {
    const isActive = pathname === path;
    return `flex flex-col items-center text-xs p-2 rounded-md transition-colors ${isActive ? activeClass : baseClass} text-white`;
  };

  return (
    <>
      <nav className="bg-blue-900 dark:bg-gray-950 text-white shadow-md z-50 mb-6 transition-colors duration-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl md:w-1/4">
              <Trophy className="h-6 w-6 text-white" />
              <span className="inline">{t('login.title')}</span>
            </Link>
            
            <div className="hidden md:flex items-center justify-center gap-4 flex-1">
              <Link href="/" className={getLinkStyle("/", "bg-slate-600 dark:bg-slate-700", "hover:bg-slate-500 dark:hover:bg-slate-600", "bg-slate-400 dark:bg-slate-500 ring-2 ring-white/50") + " w-36 justify-center text-center"}>
                <Home className="h-4 w-4 shrink-0" /> <span className="truncate">{t('navbar.dashboard')}</span>
              </Link>
              <Link href="/instructions" className={getLinkStyle("/instructions", "bg-blue-600 dark:bg-blue-800", "hover:bg-blue-500 dark:hover:bg-blue-700", "bg-blue-400 dark:bg-blue-600 ring-2 ring-white/50") + " w-36 justify-center text-center"}>
                <BookOpen className="h-4 w-4 shrink-0" /> <span className="truncate">{t('navbar.instructions')}</span>
              </Link>
              <Link href="/predictions" className={getLinkStyle("/predictions", "bg-green-600 dark:bg-green-800", "hover:bg-green-500 dark:hover:bg-green-700", "bg-green-400 dark:bg-green-600 ring-2 ring-white/50") + " w-36 justify-center text-center"}>
                <PenSquare className="h-4 w-4 shrink-0" /> <span className="truncate">{t('navbar.predictions')}</span>
              </Link>
              <Link href="/dashboard" className={getLinkStyle("/dashboard", "bg-orange-600 dark:bg-orange-800", "hover:bg-orange-500 dark:hover:bg-orange-700", "bg-orange-400 dark:bg-orange-600 ring-2 ring-white/50") + " w-36 justify-center text-center"}>
                <Trophy className="h-4 w-4 shrink-0" /> <span className="truncate">Ranking</span>
              </Link>
              <Link href="/leagues" className={getLinkStyle("/leagues", "bg-purple-600 dark:bg-purple-800", "hover:bg-purple-500 dark:hover:bg-purple-700", "bg-purple-400 dark:bg-purple-600 ring-2 ring-white/50") + " w-36 justify-center text-center"}>
                <Users className="h-4 w-4 shrink-0" /> <span className="truncate">{t('navbar.leagues')}</span>
              </Link>
              {isAdmin && (
                <Link href="/admin" className={getLinkStyle("/admin", "bg-gray-600 dark:bg-gray-800", "hover:bg-gray-500 dark:hover:bg-gray-700", "bg-gray-400 dark:bg-gray-600 ring-2 ring-white/50") + " w-36 justify-center text-center"}>
                  <Settings className="h-4 w-4 shrink-0" /> <span className="truncate">{t('navbar.admin')}</span>
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-around p-2 bg-blue-950 dark:bg-gray-900 border-t border-blue-800 dark:border-gray-800 transition-colors duration-200 pb-safe">
        <Link href="/" className={getMobileLinkStyle("/", "bg-slate-700 dark:bg-slate-800", "bg-slate-500 dark:bg-slate-600 ring-1 ring-white/50")}>
          <Home className="h-5 w-5 mb-1" /> <span className="text-[10px] leading-tight">Inicio</span>
        </Link>
        <Link href="/instructions" className={getMobileLinkStyle("/instructions", "bg-blue-700 dark:bg-blue-900", "bg-blue-500 dark:bg-blue-700 ring-1 ring-white/50")}>
          <BookOpen className="h-5 w-5 mb-1" /> <span className="text-[10px] leading-tight">Reglas</span>
        </Link>
        <Link href="/predictions" className={getMobileLinkStyle("/predictions", "bg-green-700 dark:bg-green-900", "bg-green-500 dark:bg-green-700 ring-1 ring-white/50")}>
          <PenSquare className="h-5 w-5 mb-1" /> <span className="text-[10px] leading-tight">Prode</span>
        </Link>
        <Link href="/dashboard" className={getMobileLinkStyle("/dashboard", "bg-orange-700 dark:bg-orange-900", "bg-orange-500 dark:bg-orange-700 ring-1 ring-white/50")}>
          <Trophy className="h-5 w-5 mb-1" /> <span className="text-[10px] leading-tight">Ranking</span>
        </Link>
        <Link href="/leagues" className={getMobileLinkStyle("/leagues", "bg-purple-700 dark:bg-purple-900", "bg-purple-500 dark:bg-purple-700 ring-1 ring-white/50")}>
          <Users className="h-5 w-5 mb-1" /> <span className="text-[10px] leading-tight">Torneos</span>
        </Link>
        {isAdmin && (
          <Link href="/admin" className={getMobileLinkStyle("/admin", "bg-gray-700 dark:bg-gray-900", "bg-gray-500 dark:bg-gray-700 ring-1 ring-white/50")}>
            <Settings className="h-5 w-5 mb-1" /> <span className="text-[10px] leading-tight">Admin</span>
          </Link>
        )}
        <button onClick={toggleTheme} className="flex flex-col items-center justify-center text-[10px] leading-tight p-2 rounded-md transition-colors bg-gray-700 dark:bg-gray-800 text-white w-12 h-12">
          {mounted && (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </button>
      </div>
    </>
  );
}
