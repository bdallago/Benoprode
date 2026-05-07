"use client";

import { ProtectedRoute } from "../../components/ProtectedRoute";
import Admin from "../../views/Admin";
import { useAuth } from "../../components/Providers";

export default function AdminPage() {
  const { user } = useAuth();
  
  return (
    <ProtectedRoute>
      {user && <Admin />}
    </ProtectedRoute>
  );
}
