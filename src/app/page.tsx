"use client";

import { useAuth } from "../components/Providers";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Welcome from "../views/Welcome";
import Login from "../views/Login";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If there is a league invite in the URL, redirect to leagues ONLY if user is logged in
    if (user && typeof window !== "undefined") {
      const search = window.location.search;
      const hash = window.location.hash;
      if (search.includes('league=') || hash.includes('league=')) {
        router.push("/leagues" + search + hash);
      }
    }
  }, [router, user]);

  if (loading) return <div className="min-h-[80vh] flex items-center justify-center"><div className="animate-pulse flex flex-col items-center gap-4"><div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700"></div><div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div></div></div>;

  if (user) {
    return <Welcome />;
  }

  return <Login />;
}
