"use client";

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../components/Providers';
import Profile from '../../../views/Profile';

export default function OtherUserProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const profileId = params.id as string;

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return <Profile user={user} profileId={profileId} />;
}
