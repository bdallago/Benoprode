"use client";

import { ProtectedRoute } from "../../components/ProtectedRoute";
import Leagues from "../../views/Leagues";
import { useAuth } from "../../components/Providers";

export default function LeaguesPage() {
  const { user } = useAuth();
  
  return (
    <ProtectedRoute>
      {user && <Leagues user={user} />}
    </ProtectedRoute>
  );
}
