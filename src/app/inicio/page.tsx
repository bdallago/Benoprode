"use client";

import { ProtectedRoute } from "../../components/ProtectedRoute";
import Welcome from "../../views/Welcome";

export default function InicioPage() {
  return (
    <ProtectedRoute>
      <Welcome />
    </ProtectedRoute>
  );
}
