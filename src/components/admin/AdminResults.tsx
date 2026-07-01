import { useState, useEffect } from "react";
import {
  doc, getDoc, setDoc,
  collection, getDocs, query, orderBy,
  where, limit, startAfter, writeBatch,
  QueryConstraint,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { GROUPS, SPECIAL_QUESTIONS } from "../../data";
import matchesData from "../../lib/matches.json";
import { computePoints } from "../../lib/points-calculation";
import { BRACKET_TREE } from "../../lib/bracket/tree";
import { propagateWinners } from "../../lib/bracket/propagate";
import { buildDisplayBracket } from "../../lib/bracket/displayBracket";
import { buildManualKoSchedule, KO_KICKOFFS } from "../../lib/bracket/manualBracket";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Save, Calculator, AlertCircle, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  onMessage: (msg: { type: "success" | "error"; text: string } | null) => void;
}

type ConfirmAction = { type: "calc" | "reset" };

export function AdminResults({ onMessage }: Props) {
  const { t } = useTranslation();
  const [actualGroups, setActualGroups] = useState<Record<string, string[]>>(GROUPS);
  const [actualSpecials, setActualSpecials] = useState<Record<string, string>>({});
  const [actualKnockouts, setActualKnockouts] = useState<Record<string, any>>({});
  const [actualMatches, setActualMatches] = useState<
    Record<string, { teamA: number | ""; teamB: number | ""; outcome: string }>
  >({});
  const [bracketMatchups, setBracketMatchups] = useState<Record<string, [string, string]>>({});
  const [savingSlot, setSavingSlot] = useState<string | null>(null);
  const [koPicks, setKoPicks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [syncingStats, setSyncingStats] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDoc(doc(db, "results", "actual"))
      .then((snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const sanitizedGroups: Record<string, string[]> = {};
        const savedGroups = data.groups || {};
        for (const [letter, currentTeams] of Object.entries(GROUPS)) {
          const saved = (savedGroups[letter] || []) as string[];
          const valid = saved.filter((t) => currentTeams.includes(t));
          const missing = currentTeams.filter((t) => !valid.includes(t));
          sanitizedGroups[letter] = [...valid, ...missing];
        }
        setActualGroups(sanitizedGroups);
        setActualSpecials(data.specials || {});
        setActualKnockouts(data.knockouts || {});
        setActualMatches(data.matches || {});
        setBracketMatchups(data.bracketMatchups || {});
      })
      .catch((e) => console.warn("AdminResults: failed to fetch results:", e))
      .finally(() => setLoading(false));
  }, []);

  const handleGroupChange = (groupLetter: string, index: number, value: string) => {
    setActualGroups((prev) => {
      const newGroup = [...prev[groupLetter]];
      newGroup[index] = value;
      return { ...prev, [groupLetter]: newGroup };
    });
  };

  const handleSpecialChange = (id: string, value: string) => {
    setActualSpecials((prev) => ({ ...prev, [id]: value }));
  };

  // Dispara el recálculo de puntos en el servidor (autenticado con el ID token del
  // admin logueado). Acopla el Guardar con la actualización de puntos: no espera al cron.
  const triggerRecalc = async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;
    await fetch("/api/cron/recalculate", { headers: { Authorization: `Bearer ${token}` } });
  };

  const saveSpecialAnswer = async (qId: string) => {
    setSavingSlot(`special-${qId}`);
    onMessage(null);
    try {
      await setDoc(doc(db, "results", "actual"),
        { specials: { ...actualSpecials, [qId]: actualSpecials[qId] || "" }, updatedAt: new Date().toISOString() },
        { merge: true });
      onMessage({ type: "success", text: "Respuesta guardada. Recalculando puntos..." });
      await triggerRecalc();
      onMessage({ type: "success", text: "Respuesta guardada. Puntos actualizados." });
    } catch (error) {
      console.error("Error saving special answer:", error);
      onMessage({ type: "error", text: "Error al guardar la respuesta." });
    } finally {
      setSavingSlot(null);
      setTimeout(() => onMessage(null), 5000);
    }
  };

  const saveKnockoutWinner = async (slotId: string, winner: string) => {
    setSavingSlot(slotId);
    onMessage(null);
    try {
      const newKnockouts = { ...actualKnockouts, [slotId]: winner };
      const newMatchups = propagateWinners({ ...bracketMatchups }, newKnockouts as Record<string, string>);
      const koSchedule = buildManualKoSchedule(newMatchups, KO_KICKOFFS);

      await setDoc(doc(db, "results", "actual"), {
        knockouts: newKnockouts,
        bracketMatchups: newMatchups,
        koSchedule,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      setActualKnockouts(newKnockouts);
      setBracketMatchups(newMatchups);
      onMessage({ type: "success", text: `Ganador guardado: ${t(`teams.${winner}`)}. Recalculando puntos...` });
      await triggerRecalc();
      onMessage({ type: "success", text: `Ganador guardado: ${t(`teams.${winner}`)}. Puntos actualizados.` });
    } catch (error) {
      console.error("Error saving knockout winner:", error);
      onMessage({ type: "error", text: "Error al guardar el ganador del cruce." });
    } finally {
      setSavingSlot(null);
      setTimeout(() => onMessage(null), 5000);
    }
  };

  const handleMatchChange = (
    matchId: string,
    field: "teamA" | "teamB" | "outcome",
    value: string | number
  ) => {
    setActualMatches((prev) => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] || { teamA: "", teamB: "", outcome: "" }),
        [field]: value,
      },
    }));
  };

  const saveResults = async () => {
    setSaving(true);
    onMessage(null);
    try {
      await setDoc(
        doc(db, "results", "actual"),
        {
          groups: actualGroups,
          specials: actualSpecials,
          knockouts: actualKnockouts,
          matches: actualMatches,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      onMessage({ type: "success", text: t("admin.messages.saveSuccess") });
      calculatePoints();
    } catch (error) {
      console.error("Error saving results:", error);
      onMessage({ type: "error", text: t("admin.messages.saveError") });
    } finally {
      setSaving(false);
      setTimeout(() => onMessage(null), 5000);
    }
  };

  const calculatePoints = async () => {
    setCalculating(true);
    onMessage(null);
    try {
      // Read finishedGroups from Firestore — only score groups with all 12 matches played.
      const resultsSnap = await getDoc(doc(db, "results", "actual"));
      const resultsData = resultsSnap.exists() ? resultsSnap.data() : {};
      const finishedGroups: string[] = resultsData.finishedGroups || [];
      const rawGroups: Record<string, string[]> = resultsData.groups ?? {};
      const actualG: Record<string, string[]> = {};
      for (const letter of finishedGroups) {
        if (rawGroups[letter]) actualG[letter] = rawGroups[letter];
      }
      const actualS = resultsData.specials || {};
      const actualM = resultsData.matches || {};

      let lastDoc = null;
      let hasMore = true;
      let totalProcessed = 0;

      while (hasMore) {
        const constraints: QueryConstraint[] = [orderBy("__name__"), limit(29)];
        if (lastDoc) constraints.push(startAfter(lastDoc));
        const usersSnapChunk = await getDocs(query(collection(db, "users"), ...constraints));
        if (usersSnapChunk.empty) { hasMore = false; break; }

        lastDoc = usersSnapChunk.docs[usersSnapChunk.docs.length - 1];
        const uidsChunk = usersSnapChunk.docs.map((d) => d.id);

        const pSnap = await getDocs(
          query(collection(db, "predictions"), where("__name__", "in", uidsChunk))
        );
        const predictionsMap = new Map(pSnap.docs.map((d) => [d.id, d.data()]));

        const batch = writeBatch(db);
        for (const userDoc of usersSnapChunk.docs) {
          const pred = predictionsMap.get(userDoc.id);
          const { totalPoints } = computePoints(actualG, actualS, actualM, pred ?? {});
          batch.set(doc(db, "users", userDoc.id), { totalPoints }, { merge: true });
        }
        await batch.commit();
        totalProcessed += usersSnapChunk.size;
        console.log(`Processed ${totalProcessed} users points...`);
      }

      onMessage({ type: "success", text: t("admin.messages.calcSuccess") });
      window.scrollTo(0, 0);
    } catch (error: any) {
      console.error("Error calculating points:", error);
      onMessage({ type: "error", text: error.message || t("admin.messages.calcError") });
      window.scrollTo(0, 0);
    } finally {
      setCalculating(false);
      setTimeout(() => onMessage(null), 5000);
    }
  };

  const resetPoints = async () => {
    setCalculating(true);
    onMessage(null);
    try {
      await setDoc(doc(db, "results", "actual"), {
        groups: {},
        specials: {},
        knockouts: {},
        matches: {},
        standings: {},
        updatedAt: new Date().toISOString(),
      });

      setActualGroups(GROUPS);
      setActualSpecials({});
      setActualKnockouts({});
      setActualMatches({});

      let lastDoc = null;
      let hasMore = true;
      let totalProcessed = 0;

      while (hasMore) {
        const constraints: QueryConstraint[] = [orderBy("__name__"), limit(50)];
        if (lastDoc) constraints.push(startAfter(lastDoc));
        const usersSnapChunk = await getDocs(query(collection(db, "users"), ...constraints));
        if (usersSnapChunk.empty) { hasMore = false; break; }

        lastDoc = usersSnapChunk.docs[usersSnapChunk.docs.length - 1];
        const batch = writeBatch(db);
        usersSnapChunk.docs.forEach((d) =>
          batch.set(doc(db, "users", d.id), {
          totalPoints: 0,
          exactMatchCount: 0,
          correctMatchCount: 0,
          groupsPerfectCount: 0,
        }, { merge: true })
        );
        await batch.commit();
        totalProcessed += usersSnapChunk.size;
        console.log(`Reset points for ${totalProcessed} users...`);
      }

      await setDoc(doc(db, "system_stats", "leaderboard_top_1000"), {
        players: [],
        totalCount: 0,
        updatedAt: new Date().toISOString(),
      });

      onMessage({ type: "success", text: t("admin.messages.resetSuccess") });
      window.scrollTo(0, 0);
    } catch (error: any) {
      console.error("Error resetting points:", error);
      onMessage({ type: "error", text: t("admin.messages.resetError") });
      window.scrollTo(0, 0);
    } finally {
      setCalculating(false);
      setTimeout(() => onMessage(null), 5000);
    }
  };

  const clearLeaderboard = async () => {
    setCalculating(true);
    onMessage(null);
    try {
      await setDoc(doc(db, "system_stats", "leaderboard_top_1000"), {
        players: [],
        totalCount: 0,
        updatedAt: new Date().toISOString(),
      });
      onMessage({ type: "success", text: "Ranking global limpiado correctamente." });
      window.scrollTo(0, 0);
    } catch (error: any) {
      console.error("Error clearing leaderboard:", error);
      onMessage({ type: "error", text: "Error al limpiar el ranking: " + error.message });
      window.scrollTo(0, 0);
    } finally {
      setCalculating(false);
      setTimeout(() => onMessage(null), 5000);
    }
  };

  const stripResultBadges = async () => {
    setCalculating(true);
    onMessage(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/strip-result-badges", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error desconocido");
      onMessage({ type: "success", text: `Medallas de resultados eliminadas. Usuarios procesados: ${data.processed}, modificados: ${data.stripped}` });
      window.scrollTo(0, 0);
    } catch (error: any) {
      console.error("Error stripping badges:", error);
      onMessage({ type: "error", text: "Error al limpiar medallas: " + error.message });
      window.scrollTo(0, 0);
    } finally {
      setCalculating(false);
      setTimeout(() => onMessage(null), 8000);
    }
  };

  const syncMatchStats = async () => {
    setSyncingStats(true);
    try {
      const stats: Record<string, any> = {};
      let lastDoc = null;
      let hasMore = true;

      while (hasMore) {
        const constraints: QueryConstraint[] = [orderBy("__name__"), limit(100)];
        if (lastDoc) constraints.push(startAfter(lastDoc));
        const predictionsSnap = await getDocs(query(collection(db, "predictions"), ...constraints));
        if (predictionsSnap.empty) { hasMore = false; break; }

        lastDoc = predictionsSnap.docs[predictionsSnap.docs.length - 1];
        predictionsSnap.forEach((d) => {
          const data = d.data();
          if (data.matches) {
            Object.entries(data.matches).forEach(([matchId, pred]: [string, any]) => {
              if (pred?.outcome === "A" || pred?.outcome === "B" || pred?.outcome === "DRAW") {
                if (!stats[matchId]) stats[matchId] = { A: 0, B: 0, DRAW: 0, total: 0 };
                stats[matchId][pred.outcome]++;
                stats[matchId].total++;
              }
            });
          }
        });
      }

      await setDoc(doc(db, "statistics", "matches"), stats);
      onMessage({ type: "success", text: "Las estadísticas globales han sido sincronizadas correctamente." });
    } catch (e: any) {
      console.error("Error syncing stats:", e);
      onMessage({ type: "error", text: "Error al sincronizar estadísticas: " + e.message });
    } finally {
      setSyncingStats(false);
      setTimeout(() => onMessage(null), 5000);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <>
      <div className="flex gap-3 w-full flex-wrap mb-6">
        <Button
          variant="outline"
          onClick={saveResults}
          disabled={saving}
          className="flex-1 md:flex-none flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
        >
          <Save className="w-4 h-4" /> Guardar Cambios
        </Button>
        <Button
          onClick={() => setConfirmAction({ type: "calc" })}
          disabled={calculating}
          className="flex-1 md:flex-none flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Calculator className="w-4 h-4" />
          {calculating ? t("admin.results.calculatingBtn") : t("admin.results.calcBtn")}
        </Button>
        <Button
          variant="destructive"
          onClick={() => setConfirmAction({ type: "reset" })}
          disabled={calculating}
          className="flex-1 md:flex-none flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4" /> {t("admin.results.resetBtn")}
        </Button>
        <Button
          variant="outline"
          onClick={clearLeaderboard}
          disabled={calculating}
          className="flex-1 md:flex-none flex items-center gap-2 border-red-300 text-red-700 hover:bg-red-50"
        >
          <AlertCircle className="w-4 h-4" />
          {calculating ? "Limpiando..." : "Limpiar Ranking Global"}
        </Button>
        <Button
          variant="outline"
          onClick={stripResultBadges}
          disabled={calculating}
          className="flex-1 md:flex-none flex items-center gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
        >
          <AlertCircle className="w-4 h-4" />
          {calculating ? "Limpiando..." : "Limpiar Medallas de Resultados"}
        </Button>
        <Button
          variant="outline"
          onClick={syncMatchStats}
          disabled={syncingStats}
          className="flex-1 md:flex-none flex items-center gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
        >
          <CheckCircle2 className="w-4 h-4" />
          {syncingStats ? "Sincronizando..." : "Sincronizar Estadísticas"}
        </Button>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-400 border-b dark:border-gray-700 pb-2">
          {t("admin.results.groupStage")}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-200 mb-4">
          {t("admin.results.groupStageDesc")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(actualGroups)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([groupLetter, teams]) => (
              <Card key={groupLetter} className="overflow-hidden border-t-4 border-t-indigo-600">
                <CardHeader className="bg-gray-50 dark:bg-gray-800/50 py-3 px-4 border-b dark:border-gray-700">
                  <CardTitle className="text-lg">
                    {t("admin.results.group")} {groupLetter}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {[0, 1, 2, 3].map((index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold ${
                          index === 0
                            ? "bg-green-100 text-green-700"
                            : index === 1
                            ? "bg-green-50 text-green-600"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <select
                        className="flex-1 p-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        value={teams[index] || ""}
                        onChange={(e) => handleGroupChange(groupLetter, index, e.target.value)}
                      >
                        <option value="">{t("admin.results.selectTeam")}</option>
                        {GROUPS[groupLetter as keyof typeof GROUPS].map((team) => (
                          <option key={team} value={team}>
                            {t(`teams.${team}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
        </div>
      </div>

      <div className="space-y-6 pt-8 pb-12">
        <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-400 border-b dark:border-gray-700 pb-2">
          {t("admin.results.specialQuestions")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SPECIAL_QUESTIONS.map((q) => (
            <Card key={q.id}>
              <CardContent className="p-5 space-y-3">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t(`specialQuestions.${q.id}`)}
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="Respuesta(s) correcta(s), separadas por coma"
                  value={actualSpecials[q.id] || ""}
                  onChange={(e) => handleSpecialChange(q.id, e.target.value)}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Podés poner más de una respuesta correcta separándolas por coma (ej: Messi, Mbappé).
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => saveSpecialAnswer(q.id)}
                  disabled={savingSlot === `special-${q.id}`}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Guardar respuesta
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-6 pt-8 pb-12 border-t border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-400 border-b dark:border-gray-700 pb-2">
          Partidos Individuales (Resultados Reales)
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {matchesData.slice(0, 16).map((match) => {
            const actual = actualMatches[match.id] || { teamA: "", teamB: "", outcome: "" };
            return (
              <Card key={match.id} className="overflow-visible">
                <CardHeader className="bg-gray-50 dark:bg-gray-700/50 py-2 px-4 border-b dark:border-gray-700 flex flex-row justify-between items-center">
                  <span className="text-sm font-medium">
                    {t(`teams.${match.teamA}`)} vs {t(`teams.${match.teamB}`)}
                  </span>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <input
                      type="number"
                      min="0"
                      max="15"
                      className="w-12 h-10 text-center border rounded-md"
                      value={actual.teamA}
                      onChange={(e) =>
                        handleMatchChange(
                          match.id,
                          "teamA",
                          e.target.value !== "" ? parseInt(e.target.value) : ""
                        )
                      }
                    />
                    <span className="font-bold">-</span>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      className="w-12 h-10 text-center border rounded-md"
                      value={actual.teamB}
                      onChange={(e) =>
                        handleMatchChange(
                          match.id,
                          "teamB",
                          e.target.value !== "" ? parseInt(e.target.value) : ""
                        )
                      }
                    />
                  </div>
                  <div className="flex justify-between gap-2">
                    <Button
                      size="sm"
                      variant={actual.outcome === "A" ? "default" : "outline"}
                      onClick={() => handleMatchChange(match.id, "outcome", "A")}
                      className={`flex-1 ${actual.outcome === "A" ? "bg-green-600 text-white hover:bg-green-700" : ""}`}
                    >
                      Gana A
                    </Button>
                    <Button
                      size="sm"
                      variant={actual.outcome === "DRAW" ? "default" : "outline"}
                      onClick={() => handleMatchChange(match.id, "outcome", "DRAW")}
                      className={`flex-1 ${actual.outcome === "DRAW" ? "bg-amber-500 text-white hover:bg-amber-600" : ""}`}
                    >
                      Empate
                    </Button>
                    <Button
                      size="sm"
                      variant={actual.outcome === "B" ? "default" : "outline"}
                      onClick={() => handleMatchChange(match.id, "outcome", "B")}
                      className={`flex-1 ${actual.outcome === "B" ? "bg-green-600 text-white hover:bg-green-700" : ""}`}
                    >
                      Gana B
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        {matchesData.length > 16 && (
          <p className="text-sm text-gray-500 italic mt-4 text-center">
            Mostrando últimos 16 partidos en la vista rápida.
          </p>
        )}
      </div>

      <div className="space-y-6 pt-8 pb-12 border-t border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-400 border-b dark:border-gray-700 pb-2">
          {t("admin.results.knockoutStage")}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-200 mb-4">
          Elegí el ganador de cada cruce y guardalo. Al guardar se arma la ronda siguiente
          y, en ~1 minuto, el sistema reparte los puntos automáticamente.
        </p>
        {(() => {
          const seedR32: Record<string, [string, string]> = {};
          for (const [id, pair] of Object.entries(bracketMatchups)) {
            if (id.startsWith("R32-")) seedR32[id] = pair;
          }
          const view = buildDisplayBracket(seedR32, {}, actualKnockouts as Record<string, string>);
          const rounds: { round: string; label: string }[] = [
            { round: "R32", label: "16avos" },
            { round: "R16", label: "Octavos" },
            { round: "QF", label: "Cuartos" },
            { round: "SF", label: "Semifinal" },
            { round: "F", label: "Final" },
          ];
          return rounds.map(({ round, label }) => {
            const slots = BRACKET_TREE.filter((s) => s.round === round)
              .map((s) => view[s.id])
              .filter((v) => v.teamA && v.teamB);
            if (slots.length === 0) return null;
            return (
              <div key={round} className="space-y-3">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">{label}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {slots.map((v) => {
                    const winner = actualKnockouts[v.id];
                    const selected = koPicks[v.id] ?? winner;
                    const canSave = selected != null && selected !== winner;
                    return (
                      <Card key={v.id}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex gap-2">
                            {[v.teamA!, v.teamB!].map((team) => (
                              <Button
                                key={team}
                                variant={selected === team ? "default" : "outline"}
                                onClick={() => setKoPicks((prev) => ({ ...prev, [v.id]: team }))}
                                disabled={savingSlot === v.id}
                                className={`flex-1 ${selected === team ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
                              >
                                {t(`teams.${team}`)}
                              </Button>
                            ))}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            {winner ? (
                              <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                                Ganador guardado: {t(`teams.${winner}`)}
                              </p>
                            ) : (
                              <span className="text-xs text-gray-400">Sin guardar</span>
                            )}
                            <Button
                              size="sm"
                              onClick={() => saveKnockoutWinner(v.id, selected!)}
                              disabled={!canSave || savingSlot === v.id}
                              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                              <Save className="w-4 h-4" /> {savingSlot === v.id ? "Guardando..." : "Guardar ganador"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          });
        })()}
      </div>

      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl transition-colors duration-200">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {confirmAction.type === "calc"
                ? t("admin.modals.calc.title")
                : t("admin.modals.reset.title")}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {confirmAction.type === "calc"
                ? t("admin.modals.calc.desc")
                : t("admin.modals.reset.desc")}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmAction(null)}>
                {t("admin.modals.cancel")}
              </Button>
              <Button
                variant={confirmAction.type === "reset" ? "destructive" : "default"}
                className={
                  confirmAction.type === "calc"
                    ? "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white"
                    : ""
                }
                onClick={() => {
                  if (confirmAction.type === "calc") calculatePoints();
                  else resetPoints();
                  setConfirmAction(null);
                }}
              >
                {confirmAction.type === "calc"
                  ? t("admin.modals.calc.confirm")
                  : t("admin.modals.reset.confirm")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
