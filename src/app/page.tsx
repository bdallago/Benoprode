"use client";

import { useAuth } from "../components/Providers";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LandingPage from "../views/LandingPage";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const refId = searchParams.get('ref');
      if (refId) {
        localStorage.setItem('referralId', refId);
      }

      // If there is a league invite in the URL, redirect to leagues ONLY if user is logged in
      if (user) {
        const hash = window.location.hash;
        const leagueId = searchParams.get('league');
        if (leagueId && /^[a-zA-Z0-9_-]{1,128}$/.test(leagueId)) {
          router.push(`/leagues?league=${encodeURIComponent(leagueId)}`);
        } else if (hash.includes('league=')) {
          // Legacy hash-based invite links → convert to query params
          const hashLeagueId = new URLSearchParams(hash.replace('#', '')).get('league');
          if (hashLeagueId && /^[a-zA-Z0-9_-]{1,128}$/.test(hashLeagueId)) {
            router.push(`/leagues?league=${encodeURIComponent(hashLeagueId)}`);
          } else {
            router.push("/inicio");
          }
        } else {
           router.push("/inicio");
        }
      }
    }
  }, [router, user]);

  if (loading) return <div className="min-h-[80vh] flex items-center justify-center"><div className="animate-pulse flex flex-col items-center gap-4"><div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700"></div><div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div></div></div>;

  if (user) {
    return <div className="min-h-[80vh] flex items-center justify-center"><div className="animate-pulse flex flex-col items-center gap-4"><div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700"></div><div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div></div></div>;
  }

  return <LandingPage />;
}

