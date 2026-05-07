"use client";

import { ProtectedRoute } from "../../components/ProtectedRoute";
import Predictions from "../../views/Predictions";
import { useAuth } from "../../components/Providers";
import { Suspense } from "react";

export default function PredictionsPage() {
  const { user } = useAuth();
  
  return (
    <ProtectedRoute>
      {user && (
        <Suspense fallback={null}>
          <Predictions user={user} />
        </Suspense>
      )}
    </ProtectedRoute>
  );
}
