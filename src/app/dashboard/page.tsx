import { Suspense } from "react";
import { getAdminDb } from "../../lib/firebase-admin";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import Dashboard from "../../views/Dashboard";

// Componente que hace el fetch pesado de forma aislada
async function LeaderboardData() {
  const db = getAdminDb();
  if (!db) return <Dashboard initialLeaderboardData={[]} initialTotalCount={0} />;

  try {
    const topDoc = await db.collection("system_stats").doc("leaderboard_top_1000").get();
    const data = topDoc.exists ? topDoc.data() : null;
    const players = data?.players || [];
    const totalCount = data?.totalCount || players.length;

    return <Dashboard initialLeaderboardData={players} initialTotalCount={totalCount} />;
  } catch (e) {
    console.error("Error pre-loading leaderboard", e);
    return <Dashboard initialLeaderboardData={[]} initialTotalCount={0} />;
  }
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<Dashboard initialLeaderboardData={[]} />}>
        <LeaderboardData />
      </Suspense>
    </ProtectedRoute>
  );
}
