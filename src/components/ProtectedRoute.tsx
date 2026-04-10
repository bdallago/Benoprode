"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./Providers";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      if (typeof window !== "undefined") {
        const search = window.location.search;
        const hash = window.location.hash;
        router.push("/" + search + hash);
      } else {
        router.push("/");
      }
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return null;
  }

  return <>{children}</>;
}
