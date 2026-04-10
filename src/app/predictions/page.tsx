"use client";

import { ProtectedRoute } from "../../components/ProtectedRoute";
import Predictions from "../../views/Predictions";
import { useAuth } from "../../components/Providers";

export default function PredictionsPage() {
  const { user } = useAuth();
  
  return (
    <ProtectedRoute>
      {user && <Predictions user={user} />}
    </ProtectedRoute>
  );
}
