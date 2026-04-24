'use client';
import { useAuth } from "../../components/Providers";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import News from "../../views/News";

export default function NewsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <News />;
}
