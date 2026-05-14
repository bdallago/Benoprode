import { useState, useEffect, useRef, Fragment } from "react";
import {
  doc, getDoc, setDoc, deleteDoc,
  collection, getDocs, query, where,
  limit, startAfter, writeBatch,
  QueryConstraint, DocumentSnapshot,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Trash2, Users, Unlock, ShieldCheck, AlertTriangle, CheckCircle2, Loader2, Share2, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: string;
  totalPoints: number;
}

interface Props {
  onMessage: (msg: { type: "success" | "error"; text: string } | null) => void;
}

const DEADLINE_GROUP_STAGE = new Date("2026-06-11T00:00:00-03:00").getTime();

export function AdminUsers({ onMessage }: Props) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [lastUserDoc, setLastUserDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMoreUsers, setHasMoreUsers] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ uid: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const searchIsFirstRender = useRef(true);

  // Integrity check state
  type GhostUser = { uid: string; displayName: string; email: string; createdAt: string };
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [integrityDone, setIntegrityDone] = useState(false);
  const [ghostUsers, setGhostUsers] = useState<GhostUser[]>([]);
  const [totalInAuth, setTotalInAuth] = useState(0);
  const [repairingAll, setRepairingAll] = useState(false);
  const [repairDone, setRepairDone] = useState<{ repaired: number; notFoundInAuth: number } | null>(null);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillDone, setBackfillDone] = useState<{ updated: number; skipped: number } | null>(null);

  // Referral audit state
  type ReferredUser = { uid: string; name: string; email: string };
  type ReferralRow = {
    uid: string; displayName: string; email: string | null; exists: boolean;
    storedCount: number; actualCount: number;
    referredUsers: ReferredUser[];
    status: "ok" | "mismatch" | "referrer_deleted";
    fixed?: boolean;
  };
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralData, setReferralData] = useState<{
    totalReferred: number; totalReferrers: number; mismatchCount: number; fixed: boolean; results: ReferralRow[];
  } | null>(null);
  const [referralFixing, setReferralFixing] = useState(false);
  const [expandedReferrer, setExpandedReferrer] = useState<string | null>(null);
  const [reassignInputs, setReassignInputs] = useState<Record<string, string>>({});
  const [reassigning, setReassigning] = useState<Record<string, boolean>>({});
  const [reassignResults, setReassignResults] = useState<Record<string, string>>({});

  const loadUsers = async (search: string, mode: "reset" | "append") => {
    if (mode === "append") setLoadingMore(true);
    try {
      let snap;
      if (search.trim()) {
        const normalizedSearch = search.trim().toLowerCase();
        const field = normalizedSearch.includes("@") ? "email" : "displayNameLower";
        const q = query(
          collection(db, "users"),
          where(field, ">=", normalizedSearch),
          where(field, "<=", normalizedSearch + ""),
          limit(50)
        );
        snap = await getDocs(q);
        setLastUserDoc(null);
        setHasMoreUsers(false);
      } else {
        const constraints: QueryConstraint[] = [];
        if (mode === "append" && lastUserDoc) constraints.push(startAfter(lastUserDoc));
        constraints.push(limit(50));
        snap = await getDocs(query(collection(db, "users"), ...constraints));
        setLastUserDoc(snap.docs[snap.docs.length - 1] ?? null);
        setHasMoreUsers(snap.docs.length === 50);
      }
      const newUsers = snap.docs.map((d) => ({ ...d.data(), uid: d.id } as UserProfile));
      if (mode === "append") {
        setUsers((prev) => [...prev, ...newUsers]);
      } else {
        setUsers(newUsers);
      }
    } finally {
      if (mode === "append") setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadUsers("", "reset").finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (searchIsFirstRender.current) {
      searchIsFirstRender.current = false;
      return;
    }
    const timeout = setTimeout(() => loadUsers(userSearch, "reset"), 300);
    return () => clearTimeout(timeout);
  }, [userSearch]);

  const unfixPredictions = async (uid: string, name: string) => {
    try {
      const predRef = doc(db, "predictions", uid);
      const predSnap = await getDoc(predRef);
      if (predSnap.exists()) {
        await setDoc(predRef, { isLocked: false }, { merge: true });
        onMessage({ type: "success", text: t("admin.messages.unfixSuccess", { name }) });
      } else {
        onMessage({ type: "error", text: t("admin.messages.unfixError", { name }) });
      }
    } catch (error) {
      console.error("Error unfixing predictions:", error);
      onMessage({ type: "error", text: t("admin.messages.unfixErrorGeneral") });
    } finally {
      setTimeout(() => onMessage(null), 5000);
    }
  };

  const deleteUser = async (uid: string, name: string) => {
    try {
      const batch = writeBatch(db);

      batch.delete(doc(db, "users", uid));
      batch.delete(doc(db, "predictions", uid));

      const userLeaguesQuery = query(collection(db, "leagues"), where("members", "array-contains", uid));
      const leaguesSnap = await getDocs(userLeaguesQuery);
      leaguesSnap.docs.forEach((d) => {
        const leagueData = d.data();
        if (leagueData.members?.includes(uid)) {
          if (leagueData.members.length === 1) {
            batch.delete(doc(db, "leagues", d.id));
          } else {
            batch.update(doc(db, "leagues", d.id), {
              members: leagueData.members.filter((m: string) => m !== uid),
            });
          }
        }
      });

      const [snapF1, snapF2, snapFR1, snapFR2, snapN, snapD1, snapD2] = await Promise.all([
        getDocs(query(collection(db, "friendships"), where("user1Id", "==", uid))),
        getDocs(query(collection(db, "friendships"), where("user2Id", "==", uid))),
        getDocs(query(collection(db, "friendRequests"), where("fromUserId", "==", uid))),
        getDocs(query(collection(db, "friendRequests"), where("toUserId", "==", uid))),
        getDocs(query(collection(db, "notifications"), where("userId", "==", uid))),
        getDocs(query(collection(db, "duels_v2"), where("challengerId", "==", uid))),
        getDocs(query(collection(db, "duels_v2"), where("challengedId", "==", uid))),
      ]);

      [snapF1, snapF2, snapFR1, snapFR2, snapN, snapD1, snapD2].forEach((snap) =>
        snap.forEach((d) => batch.delete(d.ref))
      );

      await batch.commit();

      setUsers((prev) => prev.filter((u) => u.uid !== uid));
      onMessage({ type: "success", text: t("admin.messages.deleteUserSuccess", { name }) });
    } catch (error) {
      console.error("Error deleting user:", error);
      onMessage({ type: "error", text: t("admin.messages.deleteUserError") });
    } finally {
      setTimeout(() => onMessage(null), 5000);
    }
  };

  const getToken = () => auth.currentUser?.getIdToken() ?? Promise.resolve(null);

  const checkIntegrity = async () => {
    setIntegrityLoading(true);
    setIntegrityDone(false);
    setGhostUsers([]);
    setRepairDone(null);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/admin/find-ghost-users", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTotalInAuth(data.totalInAuth ?? 0);
      setGhostUsers(data.ghosts ?? []);
      setIntegrityDone(true);
    } catch (e) {
      console.error("Error checking integrity:", e);
      onMessage({ type: "error", text: "Error al verificar integridad." });
    } finally {
      setIntegrityLoading(false);
    }
  };

  const repairAllGhosts = async () => {
    if (!ghostUsers.length || repairingAll) return;
    setRepairingAll(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/admin/repair-ghost-users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uids: ghostUsers.map((g) => g.uid) }),
      });
      const data = await res.json();
      setRepairDone({ repaired: data.repaired?.length ?? 0, notFoundInAuth: data.notFoundInAuth?.length ?? 0 });
      setGhostUsers([]);
    } catch (e) {
      console.error("Error repairing ghosts:", e);
      onMessage({ type: "error", text: "Error al reparar perfiles." });
    } finally {
      setRepairingAll(false);
    }
  };

  const runBackfillDisplayNameLower = async () => {
    setBackfillLoading(true);
    setBackfillDone(null);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/admin/backfill-displayname-lower", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBackfillDone({ updated: data.updated ?? 0, skipped: data.skipped ?? 0 });
    } catch (e) {
      console.error("Backfill error:", e);
      onMessage({ type: "error", text: "Error al ejecutar backfill." });
    } finally {
      setBackfillLoading(false);
    }
  };

  const reassignGhostReferrer = async (ghostUid: string) => {
    const realUid = reassignInputs[ghostUid]?.trim();
    if (!realUid) return;
    setReassigning((prev) => ({ ...prev, [ghostUid]: true }));
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/admin/fix-ghost-referrer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ghostUid, realUid }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReassignResults((prev) => ({ ...prev, [ghostUid]: `Error: ${data.error}` }));
      } else {
        setReassignResults((prev) => ({
          ...prev,
          [ghostUid]: `✅ ${data.referredCount} referido${data.referredCount !== 1 ? "s" : ""} reasignados a ${data.realUserName}. referralsCount: ${data.oldReferralsCount} → ${data.newReferralsCount}`,
        }));
        // Re-audit to refresh the table
        await auditReferrals();
      }
    } catch (e) {
      console.error("Error reassigning ghost referrer:", e);
      setReassignResults((prev) => ({ ...prev, [ghostUid]: "Error al reasignar." }));
    } finally {
      setReassigning((prev) => ({ ...prev, [ghostUid]: false }));
    }
  };

  const auditReferrals = async () => {
    setReferralLoading(true);
    setReferralData(null);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/admin/referral-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setReferralData(data);
    } catch (e) {
      console.error("Error running referral audit:", e);
      onMessage({ type: "error", text: "Error al auditar referidos." });
    } finally {
      setReferralLoading(false);
    }
  };

  const fixReferralDiscrepancies = async () => {
    if (!referralData || referralFixing) return;
    setReferralFixing(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/admin/referral-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fix: true }),
      });
      const data = await res.json();
      setReferralData(data);
      onMessage({ type: "success", text: `${data.mismatchCount === 0 ? "Sin" : data.results.filter((r: ReferralRow) => r.fixed).length} correcciones aplicadas.` });
    } catch (e) {
      console.error("Error fixing referral discrepancies:", e);
      onMessage({ type: "error", text: "Error al corregir discrepancias." });
    } finally {
      setReferralFixing(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
    </div>
  );

  return (
    <div className="space-y-6 pt-4 pb-12">
      <h2 className="text-2xl font-bold text-red-700 border-b border-red-200 pb-2 flex items-center gap-2">
        <Users className="w-6 h-6" /> {t("admin.users.title")}
      </h2>
      <p className="text-sm text-gray-600 mb-4">{t("admin.users.description")}</p>

      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre o email (prefijo)..."
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300 dark:bg-gray-800 dark:text-gray-100"
        />
        {userSearch && (
          <button
            onClick={() => setUserSearch("")}
            className="text-xs text-gray-400 hover:text-gray-600 whitespace-nowrap"
          >
            Limpiar
          </button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3">{t("admin.users.table.name")}</th>
                  <th className="px-6 py-3">{t("admin.users.table.email")}</th>
                  <th className="px-6 py-3">{t("admin.users.table.role")}</th>
                  <th className="px-6 py-3">{t("admin.users.table.points")}</th>
                  <th className="px-6 py-3 text-right">{t("admin.users.table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.uid}
                    className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100 flex items-center gap-3">
                      {u.photoURL ? (
                        <img
                          src={u.photoURL}
                          alt={u.displayName}
                          className="w-8 h-8 rounded-full"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          {u.displayName?.charAt(0) || "U"}
                        </div>
                      )}
                      {u.displayName}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-200">{u.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          u.role === "admin"
                            ? "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300"
                            : "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold">{u.totalPoints}</td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      {Date.now() < DEADLINE_GROUP_STAGE && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unfixPredictions(u.uid, u.displayName)}
                          className="flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                          title={t("admin.users.unfixTooltip")}
                        >
                          <Unlock className="w-4 h-4" /> {t("admin.users.unfixBtn")}
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setConfirmDelete({ uid: u.uid, name: u.displayName })}
                        disabled={u.role === "admin"}
                        className="flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" /> {t("admin.users.deleteBtn")}
                      </Button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      {t("admin.users.noUsers")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {!userSearch && hasMoreUsers && (
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            onClick={() => loadUsers("", "append")}
            disabled={loadingMore}
            className="flex items-center gap-2 border-red-200 text-red-700 hover:bg-red-50"
          >
            {loadingMore ? "Cargando..." : "Cargar más usuarios"}
          </Button>
        </div>
      )}

      {/* Integrity check section */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-500" /> Integridad de perfiles
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Compara todos los usuarios de Firebase Auth contra Firestore y detecta quiénes no tienen perfil creado.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkIntegrity}
            disabled={integrityLoading}
            className="shrink-0 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400"
          >
            {integrityLoading
              ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Verificando...</>
              : "Verificar ahora"}
          </Button>
        </div>

        {integrityDone && !repairDone && (
          ghostUsers.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Todo OK — {totalInAuth} usuarios en Auth, todos tienen perfil en Firestore.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>{ghostUsers.length}</strong> usuario{ghostUsers.length !== 1 ? "s" : ""} sin perfil
                    {" "}de {totalInAuth} en Auth.
                  </span>
                </div>
                <Button
                  size="sm"
                  disabled={repairingAll}
                  onClick={repairAllGhosts}
                  className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {repairingAll
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Reparando...</>
                    : "Reparar todos"}
                </Button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-2">Nombre (Auth)</th>
                      <th className="px-4 py-2">Email</th>
                      <th className="px-4 py-2">Registrado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ghostUsers.map((g) => (
                      <tr key={g.uid} className="border-t border-gray-100 dark:border-gray-700">
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{g.displayName}</td>
                        <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{g.email}</td>
                        <td className="px-4 py-2 text-gray-400">{g.createdAt ? new Date(g.createdAt).toLocaleDateString("es-AR") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

        {repairDone && (
          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-3">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Reparación completa: <strong>{repairDone.repaired}</strong> perfil{repairDone.repaired !== 1 ? "es" : ""} creado{repairDone.repaired !== 1 ? "s" : ""}.
            {repairDone.notFoundInAuth > 0 && ` ${repairDone.notFoundInAuth} UID${repairDone.notFoundInAuth !== 1 ? "s" : ""} no exist${repairDone.notFoundInAuth !== 1 ? "en" : "e"} en Auth (cuenta eliminada).`}
          </div>
        )}

        {/* Backfill displayNameLower */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Backfill búsqueda por nombre</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Escribe <code>displayNameLower</code> en todos los perfiles existentes para que la búsqueda sea case-insensitive.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {backfillDone && (
              <span className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {backfillDone.updated} actualizados, {backfillDone.skipped} ya tenían el campo.
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={runBackfillDisplayNameLower}
              disabled={backfillLoading}
              className="shrink-0 border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400"
            >
              {backfillLoading ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Procesando...</> : "Ejecutar backfill"}
            </Button>
          </div>
        </div>
      </div>

      {/* Referral audit section */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-emerald-500" /> Auditoría de Referidos
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Verifica que el contador <code>referralsCount</code> coincida con los usuarios que efectivamente entraron via referido.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={auditReferrals}
            disabled={referralLoading}
            className="shrink-0 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400"
          >
            {referralLoading
              ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Auditando...</>
              : "Auditar ahora"}
          </Button>
        </div>

        {referralData && (() => {
          const ghostReferrers = referralData.results.filter((r) => r.status === "referrer_deleted");
          const hasIssues = referralData.mismatchCount > 0 || ghostReferrers.length > 0;
          return (
          <div className="space-y-3">
            {/* Summary bar */}
            <div className={`flex items-center justify-between gap-3 rounded-lg px-4 py-3 border ${
              hasIssues
                ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
            }`}>
              <div className={`flex items-center gap-2 text-sm ${
                hasIssues ? "text-amber-800 dark:text-amber-300" : "text-green-700 dark:text-green-400"
              }`}>
                {hasIssues
                  ? <AlertTriangle className="w-4 h-4 shrink-0" />
                  : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>
                  <strong>{referralData.totalReferred}</strong> usuario{referralData.totalReferred !== 1 ? "s" : ""} referidos
                  {" "}por <strong>{referralData.totalReferrers}</strong> persona{referralData.totalReferrers !== 1 ? "s" : ""}.
                  {referralData.mismatchCount > 0 && <> <strong>{referralData.mismatchCount}</strong> contador{referralData.mismatchCount !== 1 ? "es" : ""} incorrecto{referralData.mismatchCount !== 1 ? "s" : ""}.</>}
                  {ghostReferrers.length > 0 && <> <strong>{ghostReferrers.length}</strong> referidor{ghostReferrers.length !== 1 ? "es" : ""} sin perfil — usá "Integridad de perfiles → Reparar" primero.</>}
                  {!hasIssues && " Todos los contadores coinciden."}
                </span>
              </div>
              {referralData.mismatchCount > 0 && !referralData.fixed && (
                <Button
                  size="sm"
                  disabled={referralFixing}
                  onClick={fixReferralDiscrepancies}
                  className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {referralFixing
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Corrigiendo...</>
                    : "Corregir todo"}
                </Button>
              )}
              {referralData.fixed && referralData.mismatchCount === 0 && (
                <span className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Corregido
                </span>
              )}
            </div>

            {/* Referral table */}
            {referralData.results.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-2">Referidor</th>
                      <th className="px-4 py-2 text-center">Referidos reales</th>
                      <th className="px-4 py-2 text-center">Contador guardado</th>
                      <th className="px-4 py-2 text-center">Estado</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {referralData.results.map((row) => (
                      <Fragment key={row.uid}>
                        <tr
                          className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                          onClick={() => setExpandedReferrer(expandedReferrer === row.uid ? null : row.uid)}
                        >
                          <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                            {row.displayName}
                            {row.email && <div className="text-gray-400 font-normal">{row.email}</div>}
                          </td>
                          <td className="px-4 py-2 text-center font-bold text-gray-800 dark:text-gray-200">
                            {row.actualCount}
                          </td>
                          <td className="px-4 py-2 text-center text-gray-600 dark:text-gray-400">
                            {row.storedCount}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {row.status === "ok" && <span className="text-green-600 dark:text-green-400">✅</span>}
                            {row.status === "mismatch" && (
                              <span className="text-amber-600 dark:text-amber-400 font-bold">
                                {row.fixed ? "✅ Corregido" : "⚠️"}
                              </span>
                            )}
                            {row.status === "referrer_deleted" && <span className="text-red-400 font-semibold">Sin perfil</span>}
                          </td>
                          <td className="px-4 py-2 text-gray-400">
                            {expandedReferrer === row.uid
                              ? <ChevronUp className="w-3.5 h-3.5" />
                              : <ChevronDown className="w-3.5 h-3.5" />}
                          </td>
                        </tr>
                        {expandedReferrer === row.uid && (
                          <tr className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40">
                            <td colSpan={5} className="px-6 py-3 space-y-3">
                              <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                                  Usuarios referidos por <span className="text-gray-700 dark:text-gray-200">{row.displayName}</span>:
                                </p>
                                <ul className="space-y-1">
                                  {row.referredUsers.map((u) => (
                                    <li key={u.uid} className="text-xs text-gray-700 dark:text-gray-300">
                                      {u.name} {u.email && <span className="text-gray-400">— {u.email}</span>}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              {row.status === "referrer_deleted" && (
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                                  <p className="text-xs font-semibold text-red-500 dark:text-red-400 mb-2">
                                    UID fantasma: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-gray-700 dark:text-gray-300">{row.uid}</code>
                                    <span className="ml-2 font-normal text-gray-400">(no existe en Auth ni Firestore)</span>
                                  </p>
                                  {reassignResults[row.uid] ? (
                                    <p className="text-xs text-green-700 dark:text-green-400">{reassignResults[row.uid]}</p>
                                  ) : (
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <input
                                        type="text"
                                        placeholder="UID real del usuario actual..."
                                        value={reassignInputs[row.uid] ?? ""}
                                        onChange={(e) => setReassignInputs((prev) => ({ ...prev, [row.uid]: e.target.value }))}
                                        className="flex-1 min-w-48 px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                      />
                                      <Button
                                        size="sm"
                                        disabled={!reassignInputs[row.uid]?.trim() || reassigning[row.uid]}
                                        onClick={() => reassignGhostReferrer(row.uid)}
                                        className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                                      >
                                        {reassigning[row.uid]
                                          ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Reasignando...</>
                                          : "Reasignar referidos"}
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
        })()}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl transition-colors duration-200">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {t("admin.modals.deleteUser.title")}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {t("admin.modals.deleteUser.desc", { name: confirmDelete.name })}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                {t("admin.modals.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  deleteUser(confirmDelete.uid, confirmDelete.name);
                  setConfirmDelete(null);
                }}
              >
                {t("admin.modals.deleteUser.confirm")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
