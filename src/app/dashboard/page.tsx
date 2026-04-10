"use client";

import { ProtectedRoute } from "../../components/ProtectedRoute";
import Dashboard from "../../views/Dashboard";
import { useAuth } from "../../components/Providers";

export default function DashboardPage() {
  const { user } = useAuth();
  
  return (
    <ProtectedRoute>
      {user && <Dashboard user={user} />}
    </ProtectedRoute>
  );
}
