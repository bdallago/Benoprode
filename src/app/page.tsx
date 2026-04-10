"use client";

import { useAuth } from "../components/Providers";
import Welcome from "../views/Welcome";
import Login from "../views/Login";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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

  if (loading) return null;

  if (user) {
    return <Welcome />;
  }

  return <Login />;
}
