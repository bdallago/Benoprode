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

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 py-2">
        <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/5" />
        <div className="h-44 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-36 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="h-36 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
        <div className="h-36 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
