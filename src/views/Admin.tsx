import { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, writeBatch, query, orderBy, where, limit, startAfter, QueryConstraint, DocumentSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";
import { GROUPS, SPECIAL_QUESTIONS, KNOCKOUT_STAGES, ALL_TEAMS } from "../data";
import matchesData from "../lib/matches.json";
import { computePoints, sanitizeGroups } from "../lib/points-calculation";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Save, Calculator, AlertCircle, CheckCircle2, Trash2, Users, MessageSquareWarning, Paperclip, Unlock } from "lucide-react";
import { CountdownBanner } from "../components/CountdownBanner";
import { useTranslation } from 'react-i18next';

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: string;
  totalPoints: number;
}

interface Report {
  id: string;
  message: string;
  userEmail: string;
  userName: string;
  createdAt: string;
  attachments?: string[];
}

export default function Admin() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{type: 'calc' | 'delete' | 'reset', uid?: string, name?: string} | null>(null);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  // State for actual results
  const [actualGroups, setActualGroups] = useState<Record<string, string[]>>(GROUPS);
  const [actualSpecials, setActualSpecials] = useState<Record<string, string>>({});
  const [actualKnockouts, setActualKnockouts] = useState<Record<string, string[]>>({});
  const [actualMatches, setActualMatches] = useState<Record<string, { teamA: number | '', teamB: number | '', outcome: string }>>({});
  
  // State for users
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [lastUserDoc, setLastUserDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMoreUsers, setHasMoreUsers] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const searchIsFirstRender = useRef(true);

  // State for reports
  const [reports, setReports] = useState<Report[]>([]);
  const [activeTab, setActiveTab] = useState<'results' | 'users' | 'reports' | 'analytics'>('results');
  const [syncingStats, setSyncingStats] = useState(false);

  const loadUsers = async (search: string, mode: 'reset' | 'append') => {
    if (mode === 'append') setLoadingMore(true);
    try {
      let snap;
      if (search.trim()) {
        const field = search.includes('@') ? 'email' : 'displayName';
        const q = query(
          collection(db, 'users'),
          where(field, '>=', search),
          where(field, '<=', search + ''),
          limit(50)
        );
        snap = await getDocs(q);
        setLastUserDoc(null);
        setHasMoreUsers(false);
      } else {
        const constraints: QueryConstraint[] = [];
        if (mode === 'append' && lastUserDoc) constraints.push(startAfter(lastUserDoc));
        constraints.push(limit(50));
        snap = await getDocs(query(collection(db, 'users'), ...constraints));
        setLastUserDoc(snap.docs[snap.docs.length - 1] ?? null);
        setHasMoreUsers(snap.docs.length === 50);
      }
      const newUsers = snap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile));
      if (mode === 'append') {
        setUsers(prev => [...prev, ...newUsers]);
      } else {
        setUsers(newUsers);
      }
    } finally {
      if (mode === 'append') setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (searchIsFirstRender.current) {
      searchIsFirstRender.current = false;
      return;
    }
    const timeout = setTimeout(() => loadUsers(userSearch, 'reset'), 300);
    return () => clearTimeout(timeout);
  }, [userSearch]);

  const syncMatchStats = async () => {
    setSyncingStats(true);
    try {
      const stats: Record<string, any> = {};
      let lastDoc = null;
      let hasMore = true;

      while (hasMore) {
        // Query predictions in chunks of 100
        const constraints: QueryConstraint[] = [orderBy("__name__"), limit(100)];
        if (lastDoc) constraints.push(startAfter(lastDoc));
        const q = query(collection(db, "predictions"), ...constraints);

        const predictionsSnap = await getDocs(q);
        
        if (predictionsSnap.empty) {
          hasMore = false;
          break;
        }

        lastDoc = predictionsSnap.docs[predictionsSnap.docs.length - 1];

        predictionsSnap.forEach((doc: any) => {
          const data = doc.data();
          if (data.matches) {
            Object.entries(data.matches).forEach(([matchId, pred]: [string, any]) => {
              if (pred && (pred.outcome === 'A' || pred.outcome === 'B' || pred.outcome === 'DRAW')) {
                if (!stats[matchId]) {
                  stats[matchId] = { A: 0, B: 0, DRAW: 0, total: 0 };
                }
                stats[matchId][pred.outcome]++;
                stats[matchId].total++;
              }
            });
          }
        });
      }
      
      await setDoc(doc(db, "statistics", "matches"), stats);
      setMessage({ type: 'success', text: "Las estadísticas globales han sido sincronizadas correctamente." });
    } catch (e: any) {
      console.error("Error syncing stats:", e);
      setMessage({ type: 'error', text: "Error al sincronizar estadísticas: " + e.message });
    } finally {
      setSyncingStats(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    newUsers7d: 0,
    returningUsersAtLeastOnce: 0,
    returningUsersMultiple: 0,
    activeToday: 0,
    wau: 0,
    mau: 0,
    dormant14d: 0,
    totalLeagues: 0,
    privateLeagues: 0,
    publicLeagues: 0,
    duelsCreated: 0,
    duelsAccepted: 0,
    usersGroupStage: 0,
    usersSpecialQuestions: 0,
    completePredictions: 0,
    organicUsers: 0,
    referredUsers: 0
  });
  const [analyticsUpdatedAt, setAnalyticsUpdatedAt] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Admin: Starting fetchData...");
        // Fetch results
        console.log("Admin: Fetching results/actual...");
        const docRef = doc(db, "results", "actual");
        const docSnap = await getDoc(docRef);
        console.log("Admin: Fetched results/actual.");

        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Sanitize groups to ensure they match current GROUPS
          const sanitizedGroups: Record<string, string[]> = {};
          const savedGroups = data.groups || {};
          
          for (const [groupLetter, currentTeams] of Object.entries(GROUPS)) {
            const savedTeams = savedGroups[groupLetter] || [];
            const validSavedTeams = (savedTeams as string[]).filter(t => currentTeams.includes(t));
            const missingTeams = currentTeams.filter(t => !validSavedTeams.includes(t));
            sanitizedGroups[groupLetter] = [...validSavedTeams, ...missingTeams];
          }
          
          setActualGroups(sanitizedGroups);
          setActualSpecials(data.specials || {});
          setActualKnockouts(data.knockouts || {});
          setActualMatches(data.matches || {});
        } else {
          setActualGroups(GROUPS);
        }

        // Fetch users via shared loadUsers
        await loadUsers('', 'reset');
        
        // Read pre-calculated analytics from single document
        console.log("Admin: Fetching estadisticas_globales...");
        const statsSnap = await getDoc(doc(db, "estadisticas_globales", "actual"));
        if (statsSnap.exists()) {
          const s = statsSnap.data();
          setAnalytics({
            totalUsers:              s.usuarios?.total         ?? 0,
            newUsers7d:              s.usuarios?.nuevos7d      ?? 0,
            returningUsersAtLeastOnce: s.usuarios?.regresaron1vez    ?? 0,
            returningUsersMultiple:  s.usuarios?.regresaronVarias   ?? 0,
            activeToday:             s.usuarios?.activosHoy    ?? 0,
            wau:                     s.usuarios?.activosSemana ?? 0,
            mau:                     s.usuarios?.activosMes    ?? 0,
            dormant14d:              s.usuarios?.inactivos14d  ?? 0,
            totalLeagues:            s.torneos?.total          ?? 0,
            privateLeagues:          s.torneos?.privadas       ?? 0,
            publicLeagues:           s.torneos?.publicas       ?? 0,
            duelsCreated:            s.duelos?.creados         ?? 0,
            duelsAccepted:           s.duelos?.aceptados       ?? 0,
            usersGroupStage:         s.participacion?.conPrediccion ?? 0,
            usersSpecialQuestions:   s.participacion?.conEspeciales ?? 0,
            completePredictions:     s.participacion?.prodeCompleto ?? 0,
            organicUsers:            s.usuarios?.organicos     ?? 0,
            referredUsers:           s.usuarios?.referidos     ?? 0,
          });
          setAnalyticsUpdatedAt(s.actualizadoEn ?? null);
        }
        
        // Fetch reports
        console.log("Admin: Fetching reports...");
        const reportsQuery = query(collection(db, "reports"), orderBy("createdAt", "desc"));
        const reportsSnap = await getDocs(reportsQuery);
        console.log("Admin: Fetched reports.");
        const reportsData = reportsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Report));
        setReports(reportsData);
        
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        console.log("Admin: fetchData complete.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const recalcularEstadisticas = async () => {
    setRecalculating(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("No autenticado");
      const res = await fetch("/api/admin/recalcular-estadisticas", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      // Re-read the updated document
      const statsSnap = await getDoc(doc(db, "estadisticas_globales", "actual"));
      if (statsSnap.exists()) {
        const s = statsSnap.data();
        setAnalytics({
          totalUsers:              s.usuarios?.total         ?? 0,
          newUsers7d:              s.usuarios?.nuevos7d      ?? 0,
          returningUsersAtLeastOnce: s.usuarios?.regresaron1vez    ?? 0,
          returningUsersMultiple:  s.usuarios?.regresaronVarias   ?? 0,
          activeToday:             s.usuarios?.activosHoy    ?? 0,
          wau:                     s.usuarios?.activosSemana ?? 0,
          mau:                     s.usuarios?.activosMes    ?? 0,
          dormant14d:              s.usuarios?.inactivos14d  ?? 0,
          totalLeagues:            s.torneos?.total          ?? 0,
          privateLeagues:          s.torneos?.privadas       ?? 0,
          publicLeagues:           s.torneos?.publicas       ?? 0,
          duelsCreated:            s.duelos?.creados         ?? 0,
          duelsAccepted:           s.duelos?.aceptados       ?? 0,
          usersGroupStage:         s.participacion?.conPrediccion ?? 0,
          usersSpecialQuestions:   s.participacion?.conEspeciales ?? 0,
          completePredictions:     s.participacion?.prodeCompleto ?? 0,
          organicUsers:            s.usuarios?.organicos     ?? 0,
          referredUsers:           s.usuarios?.referidos     ?? 0,
        });
        setAnalyticsUpdatedAt(s.actualizadoEn ?? null);
      }
      setMessage({ type: 'success', text: `Estadísticas recalculadas. Actualizado: ${new Date(data.actualizadoEn).toLocaleString()}` });
    } catch (err: any) {
      setMessage({ type: 'error', text: `Error al recalcular: ${err.message}` });
    } finally {
      setRecalculating(false);
    }
  };

  const handleGroupChange = (groupLetter: string, index: number, value: string) => {
    setActualGroups((prev: any) => {
      const newGroup = [...prev[groupLetter]];
      newGroup[index] = value;
      return { ...prev, [groupLetter]: newGroup };
    });
  };

  const handleSpecialChange = (id: string, value: string) => {
    setActualSpecials((prev: any) => ({ ...prev, [id]: value }));
  };

  const handleMatchChange = (matchId: string, field: 'teamA' | 'teamB' | 'outcome', value: any) => {
    setActualMatches((prev: any) => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] || { teamA: '', teamB: '', outcome: '' }),
        [field]: value
      }
    }));
  };

  const saveResults = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const docRef = doc(db, "results", "actual");
      await setDoc(docRef, {
        groups: actualGroups,
        specials: actualSpecials,
        knockouts: actualKnockouts, // Keep this so it passes firestore rules
        matches: actualMatches,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setMessage({ type: 'success', text: t('admin.messages.saveSuccess') });
      
      // Simular comportamiento de Cloud Function (onWrite) para calcular puntos
      // en tiempo real apenas llega un resultado nuevo de manera manual o automática
      calculatePoints(); 

    } catch (error) {
      console.error("Error saving results:", error);
      setMessage({ type: 'error', text: t('admin.messages.saveError') });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const calculatePoints = async () => {
    setCalculating(true);
    setMessage(null);

    try {
      // 1. Fetch actual results
      const resultsRef = doc(db, "results", "actual");
      const resultsSnap = await getDoc(resultsRef);
      if (!resultsSnap.exists()) {
        throw new Error(t('admin.messages.noResults'));
      }
      const actualData = resultsSnap.data();
      
      const actualG = sanitizeGroups(actualData.groups ?? {});
      const actualS = actualData.specials || {};
      const actualK = actualData.knockouts || {};
      const actualM = actualData.matches || {};

      let lastDoc = null;
      let hasMore = true;
      let totalProcessed = 0;

      while (hasMore) {
        // Query users in chunks of 50
        const constraints: QueryConstraint[] = [orderBy("__name__"), limit(50)];
        if (lastDoc) constraints.push(startAfter(lastDoc));
        const q = query(collection(db, "users"), ...constraints);

        const usersSnapChunk = await getDocs(q);
        if (usersSnapChunk.empty) {
          hasMore = false;
          break;
        }

        lastDoc = usersSnapChunk.docs[usersSnapChunk.docs.length - 1];

        // Get those 50 users' uids
        const uidsChunk = usersSnapChunk.docs.map(d => d.id);

        // Fetch their predictions
        const pQuery = query(collection(db, "predictions"), where("__name__", "in", uidsChunk));
        const pSnap = await getDocs(pQuery);
        
        const predictionsMap = new Map();
        pSnap.docs.forEach(d => predictionsMap.set(d.id, d.data()));

        const batch = writeBatch(db);

        for (const userDoc of usersSnapChunk.docs) {
          const uid = userDoc.id;
          const pred = predictionsMap.get(uid);
          const { totalPoints } = computePoints(actualG, actualS, actualM, pred ?? {});

          // Update user document
          batch.set(doc(db, "users", uid), { totalPoints }, { merge: true });
        }

        await batch.commit();
        totalProcessed += usersSnapChunk.size;
        console.log(`Processed ${totalProcessed} users points...`);
      }

      setMessage({ type: 'success', text: t('admin.messages.calcSuccess') });
      window.scrollTo(0, 0);

      // Refresh just the visible users
      await loadUsers('', 'reset');

    } catch (error: any) {
      console.error("Error calculating points:", error);
      setMessage({ type: 'error', text: error.message || t('admin.messages.calcError') });
      window.scrollTo(0, 0);
    } finally {
      setCalculating(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const resetPoints = async () => {
    setCalculating(true);
    setMessage(null);

    try {
      // 1. Clear actual results in Firestore
      const resultsRef = doc(db, "results", "actual");
      await setDoc(resultsRef, {
        groups: {},
        specials: {},
        knockouts: {},
        matches: {},
        standings: {},
        updatedAt: new Date().toISOString()
      });

      // 2. Reset local state
      setActualGroups(GROUPS);
      setActualSpecials({});
      setActualKnockouts({});
      setActualMatches({});

      // 3. Reset points for all users in chunks
      let lastDoc = null;
      let hasMore = true;
      let totalProcessed = 0;

      while (hasMore) {
        // Query users in chunks of 50
        const constraints: QueryConstraint[] = [orderBy("__name__"), limit(50)];
        if (lastDoc) constraints.push(startAfter(lastDoc));
        const q = query(collection(db, "users"), ...constraints);

        const usersSnapChunk = await getDocs(q);
        if (usersSnapChunk.empty) {
          hasMore = false;
          break;
        }

        lastDoc = usersSnapChunk.docs[usersSnapChunk.docs.length - 1];
        const batch = writeBatch(db);

        usersSnapChunk.docs.forEach((d: any) => {
          batch.set(doc(db, "users", d.id), { totalPoints: 0 }, { merge: true });
        });

        await batch.commit();
        totalProcessed += usersSnapChunk.size;
        console.log(`Reset points for ${totalProcessed} users...`);
      }

      // Re-fetch only 50 users to update the UI
      await loadUsers('', 'reset');

      setMessage({ type: 'success', text: t('admin.messages.resetSuccess') });
      window.scrollTo(0, 0);
    } catch (error: any) {
      console.error("Error resetting points and results:", error);
      setMessage({ type: 'error', text: t('admin.messages.resetError') });
      window.scrollTo(0, 0);
    } finally {
      setCalculating(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };


  const deleteUser = async (uid: string, name: string) => {
    try {
      const batch = writeBatch(db);
      
      // Delete user profile
      const userRef = doc(db, "users", uid);
      batch.delete(userRef);
      
      // Delete user predictions
      const predRef = doc(db, "predictions", uid);
      batch.delete(predRef);
      
      // 1. Remove user from all leagues
      const userLeaguesQuery = query(collection(db, "leagues"), where("members", "array-contains", uid));
      const leaguesSnap = await getDocs(userLeaguesQuery);
      leaguesSnap.docs.forEach((d: any) => {
        const leagueData = d.data();
        if (leagueData.members && leagueData.members.includes(uid)) {
          if (leagueData.members.length === 1) {
            batch.delete(doc(db, "leagues", d.id));
          } else {
            const updatedMembers = leagueData.members.filter((m: string) => m !== uid);
            batch.update(doc(db, "leagues", d.id), { members: updatedMembers });
          }
        }
      });
      
      // 2. Delete Friendships involving the user
      const qF1 = query(collection(db, "friendships"), where("user1Id", "==", uid));
      const snapF1 = await getDocs(qF1);
      snapF1.forEach((d: any) => batch.delete(d.ref));
      
      const qF2 = query(collection(db, "friendships"), where("user2Id", "==", uid));
      const snapF2 = await getDocs(qF2);
      snapF2.forEach((d: any) => batch.delete(d.ref));
      
      // 3. Delete Friend Requests involving the user
      const qFR1 = query(collection(db, "friendRequests"), where("fromUserId", "==", uid));
      const snapFR1 = await getDocs(qFR1);
      snapFR1.forEach((d: any) => batch.delete(d.ref));
      
      const qFR2 = query(collection(db, "friendRequests"), where("toUserId", "==", uid));
      const snapFR2 = await getDocs(qFR2);
      snapFR2.forEach((d: any) => batch.delete(d.ref));
      
      // 4. Delete Notifications for the user
      const qN = query(collection(db, "notifications"), where("userId", "==", uid));
      const snapN = await getDocs(qN);
      snapN.forEach((d: any) => batch.delete(d.ref));
      
      // 5. Delete Duels involving the user
      const qD1 = query(collection(db, "duels_v2"), where("challengerId", "==", uid));
      const snapD1 = await getDocs(qD1);
      snapD1.forEach((d: any) => batch.delete(d.ref));
      
      const qD2 = query(collection(db, "duels_v2"), where("challengedId", "==", uid));
      const snapD2 = await getDocs(qD2);
      snapD2.forEach((d: any) => batch.delete(d.ref));
      
      await batch.commit();
      
      // Update local state
      setUsers(users.filter(u => u.uid !== uid));
      setMessage({ type: 'success', text: t('admin.messages.deleteUserSuccess', { name }) });
    } catch (error) {
      console.error("Error deleting user:", error);
      setMessage({ type: 'error', text: t('admin.messages.deleteUserError') });
    } finally {
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const deleteReport = async (id: string) => {
    try {
      await deleteDoc(doc(db, "reports", id));
      setReports(reports.filter(r => r.id !== id));
      setMessage({ type: 'success', text: t('admin.messages.deleteReportSuccess') });
    } catch (error) {
      console.error("Error deleting report:", error);
      setMessage({ type: 'error', text: t('admin.messages.deleteReportError') });
    } finally {
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const unfixPredictions = async (uid: string, name: string) => {
    try {
      const predRef = doc(db, "predictions", uid);
      const predSnap = await getDoc(predRef);
      if (predSnap.exists()) {
        await setDoc(predRef, { isLocked: false }, { merge: true });
        setMessage({ type: 'success', text: t('admin.messages.unfixSuccess', { name }) });
      } else {
        setMessage({ type: 'error', text: t('admin.messages.unfixError', { name }) });
      }
    } catch (error) {
      console.error("Error unfixing predictions:", error);
      setMessage({ type: 'error', text: t('admin.messages.unfixErrorGeneral') });
    } finally {
      setTimeout(() => setMessage(null), 5000);
    }
  };

  if (loading) {
    return <div className="text-center py-10">{t('admin.loading')}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <CountdownBanner />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('admin.title')}</h1>
          <p className="text-gray-500 dark:text-gray-200 mt-1">{t('admin.subtitle')}</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <Button 
            variant={activeTab === 'results' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('results')}
            className={activeTab === 'results' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            {t('admin.tabs.results')}
          </Button>
          <Button 
            variant={activeTab === 'users' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('users')}
            className={activeTab === 'users' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            {t('admin.tabs.users')}
          </Button>
          <Button 
            variant={activeTab === 'reports' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('reports')}
            className={activeTab === 'reports' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            {t('admin.tabs.reports')}
          </Button>
          <Button 
            variant={activeTab === 'analytics' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('analytics')}
            className={activeTab === 'analytics' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            {t('admin.tabs.analytics')}
          </Button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-md flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6 pt-4 pb-12">
          <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
            <h2 className="text-2xl font-bold text-indigo-700 flex items-center gap-2">
              <Calculator className="w-6 h-6" /> {t('admin.analytics.title')}
            </h2>
            <div className="flex items-center gap-3">
              {analyticsUpdatedAt && (
                <span className="text-xs text-gray-400">
                  Actualizado: {new Date(analyticsUpdatedAt).toLocaleString()}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={recalcularEstadisticas}
                disabled={recalculating}
                className="flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              >
                <Calculator className="w-4 h-4" />
                {recalculating ? 'Calculando...' : 'Recalcular'}
              </Button>
            </div>
          </div>
          {!analyticsUpdatedAt && (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              No hay datos calculados aún. Pulsá "Recalcular" para generar las estadísticas.
            </p>
          )}
          <p className="text-sm text-gray-600 mb-4">{t('admin.analytics.description')}</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <Card className="flex flex-col justify-center">
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-sm font-medium text-gray-500">Usuarios Totales</CardTitle>
              </CardHeader>
              <CardContent className="text-center flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{analytics.totalUsers}</div>
              </CardContent>
            </Card>
            <Card className="flex flex-col justify-center">
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-sm font-medium text-gray-500">Usuarios Nuevos</CardTitle>
              </CardHeader>
              <CardContent className="text-center flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{analytics.newUsers7d}</div>
                <p className="text-xs text-gray-500 mt-1">Registrados últimos 7d</p>
              </CardContent>
            </Card>
            <Card className="flex flex-col justify-center">
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-sm font-medium text-gray-500">Regresaron 1+ veces</CardTitle>
              </CardHeader>
              <CardContent className="text-center flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{analytics.returningUsersAtLeastOnce}</div>
                <p className="text-xs text-gray-500 mt-1">Regresaron tras registro</p>
              </CardContent>
            </Card>
            <Card className="flex flex-col justify-center">
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-sm font-medium text-gray-500">Regresos Múltiples</CardTitle>
              </CardHeader>
              <CardContent className="text-center flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{analytics.returningUsersMultiple}</div>
                <p className="text-xs text-gray-500 mt-1">Más de 2 sesiones</p>
              </CardContent>
            </Card>
            <Card className="flex flex-col justify-center">
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-sm font-medium text-gray-500">Activos Hoy</CardTitle>
              </CardHeader>
              <CardContent className="text-center flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{analytics.activeToday}</div>
                <p className="text-xs text-gray-500 mt-1">Últimas 24h</p>
              </CardContent>
            </Card>
            <Card className="flex flex-col justify-center">
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-sm font-medium text-gray-500">Activos 7 Días</CardTitle>
              </CardHeader>
              <CardContent className="text-center flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{analytics.wau}</div>
                <p className="text-xs text-gray-500 mt-1">Últimos 7 días</p>
              </CardContent>
            </Card>
            <Card className="flex flex-col justify-center">
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-sm font-medium text-gray-500">Activos 30 Días</CardTitle>
              </CardHeader>
              <CardContent className="text-center flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{analytics.mau}</div>
                <p className="text-xs text-gray-500 mt-1">Últimos 30 días</p>
              </CardContent>
            </Card>
            <Card className="flex flex-col justify-center">
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-sm font-medium text-gray-500">Usuarios Inactivos</CardTitle>
              </CardHeader>
              <CardContent className="text-center flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{analytics.dormant14d}</div>
                <p className="text-xs text-gray-500 mt-1">Sin login en 14d+</p>
              </CardContent>
            </Card>
          </div>

          <h3 className="text-xl font-bold text-indigo-700 mt-8 mb-4 border-b border-indigo-100 pb-2 flex items-center gap-2">Adquisición y Viralidad</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <Card className="flex flex-col justify-center">
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-sm font-medium text-gray-500">Ingresos Orgánicos</CardTitle>
              </CardHeader>
              <CardContent className="text-center flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{analytics.organicUsers}</div>
                <p className="text-xs text-gray-500 mt-1">Link limpio</p>
              </CardContent>
            </Card>
            <Card className="flex flex-col justify-center">
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-sm font-medium text-gray-500">Ingresos por Invitación</CardTitle>
              </CardHeader>
              <CardContent className="text-center flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{analytics.referredUsers}</div>
                <p className="text-xs text-gray-500 mt-1">Links de referidos</p>
              </CardContent>
            </Card>
            <Card className="flex flex-col justify-center">
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-sm font-medium text-gray-500">Tasa de Viralidad</CardTitle>
              </CardHeader>
              <CardContent className="text-center flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                  {analytics.totalUsers > 0 ? ((analytics.referredUsers / analytics.totalUsers) * 100).toFixed(1) : 0}%
                </div>
                <p className="text-xs text-gray-500 mt-1">Usuarios invitados</p>
              </CardContent>
            </Card>
          </div>

          <h3 className="text-xl font-bold text-indigo-700 mt-8 mb-4 border-b border-indigo-100 pb-2 flex items-center gap-2">Participación y Torneos</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <Card className="flex flex-col justify-center">
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-sm font-medium text-gray-500">Ligas (Torneos)</CardTitle>
              </CardHeader>
              <CardContent className="text-center flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{analytics.totalLeagues}</div>
              </CardContent>
            </Card>
            <Card className="flex flex-col justify-center">
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-sm font-medium text-gray-500">Ligas Privadas</CardTitle>
              </CardHeader>
              <CardContent className="text-center flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{analytics.privateLeagues}</div>
              </CardContent>
            </Card>
            <Card className="flex flex-col justify-center">
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-sm font-medium text-gray-500">Ligas Públicas</CardTitle>
              </CardHeader>
              <CardContent className="text-center flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{analytics.publicLeagues}</div>
              </CardContent>
            </Card>
            <Card className="flex flex-col justify-center">
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-sm font-medium text-gray-500">Predicción Iniciada</CardTitle>
              </CardHeader>
              <CardContent className="text-center flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{analytics.usersGroupStage}</div>
                <p className="text-xs text-gray-500 mt-1">Guardó o fijó predicciones</p>
              </CardContent>
            </Card>
            <Card className="flex flex-col justify-center">
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-sm font-medium text-gray-500">Preguntas Especiales</CardTitle>
              </CardHeader>
              <CardContent className="text-center flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{analytics.usersSpecialQuestions}</div>
                <p className="text-xs text-gray-500 mt-1">Guardó al menos 1</p>
              </CardContent>
            </Card>
            <Card className="flex flex-col justify-center">
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-sm font-medium text-gray-500">Prode Completo</CardTitle>
              </CardHeader>
              <CardContent className="text-center flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{analytics.completePredictions}</div>
                <p className="text-xs text-gray-500 mt-1">Grupos y especiales listos</p>
              </CardContent>
            </Card>
            <Card className="flex flex-col justify-center">
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-sm font-medium text-gray-500">Duelos Creados</CardTitle>
              </CardHeader>
              <CardContent className="text-center flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{analytics.duelsCreated}</div>
              </CardContent>
            </Card>
            <Card className="flex flex-col justify-center">
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-sm font-medium text-gray-500">Duelos Aceptados</CardTitle>
              </CardHeader>
              <CardContent className="text-center flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{analytics.duelsAccepted}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'results' && (
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
              onClick={() => setConfirmAction({ type: 'calc' })}
              disabled={calculating}
              className="flex-1 md:flex-none flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Calculator className="w-4 h-4" /> {calculating ? t('admin.results.calculatingBtn') : t('admin.results.calcBtn')}
            </Button>
            <Button 
              variant="destructive"
              onClick={() => setConfirmAction({ type: 'reset' })}
              disabled={calculating}
              className="flex-1 md:flex-none flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4" /> {t('admin.results.resetBtn')}
            </Button>
            <Button 
              variant="outline"
              onClick={syncMatchStats}
              disabled={syncingStats}
              className="flex-1 md:flex-none flex items-center gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <CheckCircle2 className="w-4 h-4" /> {syncingStats ? "Sincronizando..." : "Sincronizar Estadísticas"}
            </Button>
          </div>

          <div className="space-y-6">
        <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-400 border-b dark:border-gray-700 pb-2">{t('admin.results.groupStage')}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-200 mb-4">{t('admin.results.groupStageDesc')}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(actualGroups)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([groupLetter, teams]) => (
            <Card key={groupLetter} className="overflow-hidden border-t-4 border-t-indigo-600">
              <CardHeader className="bg-gray-50 dark:bg-gray-800/50 py-3 px-4 border-b dark:border-gray-700">
                <CardTitle className="text-lg">{t('admin.results.group')} {groupLetter}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold ${
                      index === 0 ? 'bg-green-100 text-green-700' : 
                      index === 1 ? 'bg-green-50 text-green-600' : 
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {index + 1}
                    </div>
                    <select
                      className="flex-1 p-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      value={teams[index] || ""}
                      onChange={(e) => handleGroupChange(groupLetter, index, e.target.value)}
                    >
                      <option value="">{t('admin.results.selectTeam')}</option>
                      {GROUPS[groupLetter as keyof typeof GROUPS].map(team => (
                        <option key={team} value={team}>{t(`teams.${team}`)}</option>
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
        <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-400 border-b dark:border-gray-700 pb-2">{t('admin.results.specialQuestions')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SPECIAL_QUESTIONS.map((q) => (
            <Card key={q.id}>
              <CardContent className="p-5">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t(`specialQuestions.${q.id}`)}
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder={t('admin.results.officialAnswer')}
                  value={actualSpecials[q.id] || ""}
                  onChange={(e) => handleSpecialChange(q.id, e.target.value)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-6 pt-8 pb-12 border-t border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-400 border-b dark:border-gray-700 pb-2">Partidos Individuales (Resultados Reales)</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {matchesData.slice(0, 16).map((match) => {
             const actual = actualMatches[match.id] || { teamA: '', teamB: '', outcome: '' };
             return (
              <Card key={match.id} className="overflow-visible">
                <CardHeader className="bg-gray-50 dark:bg-gray-700/50 py-2 px-4 border-b dark:border-gray-700 flex flex-row justify-between items-center">
                  <span className="text-sm font-medium">{t(`teams.${match.teamA}`)} vs {t(`teams.${match.teamB}`)}</span>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        min="0" max="15" 
                        className="w-12 h-10 text-center border rounded-md" 
                        value={actual.teamA} 
                        onChange={(e) => handleMatchChange(match.id, 'teamA', e.target.value !== '' ? parseInt(e.target.value) : '')} 
                      />
                    </div>
                    <span className="font-bold">-</span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        min="0" max="15" 
                        className="w-12 h-10 text-center border rounded-md" 
                        value={actual.teamB} 
                        onChange={(e) => handleMatchChange(match.id, 'teamB', e.target.value !== '' ? parseInt(e.target.value) : '')} 
                      />
                    </div>
                  </div>
                  <div className="flex justify-between gap-2">
                    <Button 
                      size="sm" variant={actual.outcome === 'A' ? 'default' : 'outline'} 
                      onClick={() => handleMatchChange(match.id, 'outcome', 'A')}
                      className={`flex-1 ${actual.outcome === 'A' ? 'bg-green-600 text-white hover:bg-green-700' : ''}`}>Gana A</Button>
                    <Button 
                      size="sm" variant={actual.outcome === 'DRAW' ? 'default' : 'outline'} 
                      onClick={() => handleMatchChange(match.id, 'outcome', 'DRAW')}
                      className={`flex-1 ${actual.outcome === 'DRAW' ? 'bg-amber-500 text-white hover:bg-amber-600' : ''}`}>Empate</Button>
                    <Button 
                      size="sm" variant={actual.outcome === 'B' ? 'default' : 'outline'} 
                      onClick={() => handleMatchChange(match.id, 'outcome', 'B')}
                      className={`flex-1 ${actual.outcome === 'B' ? 'bg-green-600 text-white hover:bg-green-700' : ''}`}>Gana B</Button>
                  </div>
                </CardContent>
              </Card>
             );
          })}
        </div>
        {matchesData.length > 16 && (
          <p className="text-sm text-gray-500 italic mt-4 text-center">Mostrando últimos 16 partidos en la vista rápida.</p>
        )}
      </div>

      <div className="space-y-6 pt-8 pb-12 border-t border-gray-200 dark:border-gray-700 opacity-50">
        <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-400 border-b dark:border-gray-700 pb-2">{t('admin.results.knockoutStage')}</h2>
        <div className="bg-gray-100 dark:bg-gray-800/50 p-8 rounded-lg text-center border-2 border-dashed border-gray-300 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-200 font-medium">{t('admin.results.tbd')}</p>
          <p className="text-sm text-gray-500 dark:text-gray-300 mt-2">{t('admin.results.tbdDesc')}</p>
        </div>
      </div>
      </>
      )}

      {activeTab === 'users' && (
      <div className="space-y-6 pt-4 pb-12">
        <h2 className="text-2xl font-bold text-red-700 border-b border-red-200 pb-2 flex items-center gap-2">
          <Users className="w-6 h-6" /> {t('admin.users.title')}
        </h2>
        <p className="text-sm text-gray-600 mb-4">{t('admin.users.description')}</p>

        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            placeholder="Buscar por nombre o email (prefijo)..."
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            className="w-full md:w-96 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300 dark:bg-gray-800 dark:text-gray-100"
          />
          {userSearch && (
            <button
              onClick={() => setUserSearch('')}
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
                    <th className="px-6 py-3">{t('admin.users.table.name')}</th>
                    <th className="px-6 py-3">{t('admin.users.table.email')}</th>
                    <th className="px-6 py-3">{t('admin.users.table.role')}</th>
                    <th className="px-6 py-3">{t('admin.users.table.points')}</th>
                    <th className="px-6 py-3 text-right">{t('admin.users.table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.uid} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100 flex items-center gap-3">
                        {u.photoURL ? (
                          <img src={u.photoURL} alt={u.displayName} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            {u.displayName?.charAt(0) || "U"}
                          </div>
                        )}
                        {u.displayName}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-200">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold">{u.totalPoints}</td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        {Date.now() < new Date('2026-06-08T00:00:00').getTime() && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => unfixPredictions(u.uid, u.displayName)}
                            className="flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                            title={t('admin.users.unfixTooltip')}
                          >
                            <Unlock className="w-4 h-4" /> {t('admin.users.unfixBtn')}
                          </Button>
                        )}
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => setConfirmAction({ type: 'delete', uid: u.uid, name: u.displayName })}
                          disabled={u.role === 'admin'} // Prevent deleting other admins or self easily
                          className="flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" /> {t('admin.users.deleteBtn')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        {t('admin.users.noUsers')}
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
              onClick={() => loadUsers('', 'append')}
              disabled={loadingMore}
              className="flex items-center gap-2 border-red-200 text-red-700 hover:bg-red-50"
            >
              {loadingMore ? 'Cargando...' : `Cargar más usuarios`}
            </Button>
          </div>
        )}
      </div>
      )}

      {activeTab === 'reports' && (
      <div className="space-y-6 pt-4 pb-12">
        <h2 className="text-2xl font-bold text-orange-700 border-b border-orange-200 pb-2 flex items-center gap-2">
          <MessageSquareWarning className="w-6 h-6" /> {t('admin.reports.title')}
        </h2>
        <p className="text-sm text-gray-600 mb-4">{t('admin.reports.description')}</p>
        
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-lg text-center border border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-200">{t('admin.reports.noReports')}</p>
            </div>
          ) : (
            reports.map((report) => (
              <Card key={report.id} className="overflow-hidden border-l-4 border-l-orange-500 dark:border-gray-800">
                <CardHeader className="bg-gray-50 dark:bg-gray-800/50 py-3 px-4 border-b dark:border-gray-700 flex flex-row justify-between items-start">
                  <div>
                    <CardTitle className="text-base font-bold text-gray-900 dark:text-gray-100">{report.userName || t('admin.reports.anonymous')}</CardTitle>
                    <p className="text-xs text-gray-500 dark:text-gray-200">{report.userEmail || t('admin.reports.noEmail')} • {new Date(report.createdAt).toLocaleString()}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => deleteReport(report.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">
                    {report.message}
                  </div>
                  
                  {report.attachments && report.attachments.length > 0 && (
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-200 mb-2 flex items-center gap-1">
                        <Paperclip className="w-3 h-3" /> {t('admin.reports.attachmentsCount', { count: report.attachments.length })}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {report.attachments.map((url, i) => (
                          <a 
                            key={i} 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                          >
                            Ver archivo {i + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl transition-colors duration-200">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {confirmAction.type === 'calc' ? t('admin.modals.calc.title') : 
               confirmAction.type === 'reset' ? t('admin.modals.reset.title') : 
               t('admin.modals.deleteUser.title')}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {confirmAction.type === 'calc' 
                ? t('admin.modals.calc.desc') 
                : confirmAction.type === 'reset'
                ? t('admin.modals.reset.desc')
                : t('admin.modals.deleteUser.desc', { name: confirmAction.name })}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmAction(null)}>{t('admin.modals.cancel')}</Button>
              <Button 
                variant={confirmAction.type === 'delete' || confirmAction.type === 'reset' ? 'destructive' : 'default'}
                className={confirmAction.type === 'calc' ? 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white' : ''}
                onClick={() => { 
                  if (confirmAction.type === 'calc') {
                    calculatePoints();
                  } else if (confirmAction.type === 'reset') {
                    resetPoints();
                  } else if (confirmAction.type === 'delete' && confirmAction.uid && confirmAction.name) {
                    deleteUser(confirmAction.uid, confirmAction.name);
                  }
                  setConfirmAction(null); 
                }}
              >
                {confirmAction.type === 'calc' ? t('admin.modals.calc.confirm') : 
                 confirmAction.type === 'reset' ? t('admin.modals.reset.confirm') : 
                 t('admin.modals.deleteUser.confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
