import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, writeBatch, query, orderBy, where } from "firebase/firestore";
import { db } from "../firebase";
import { GROUPS, SPECIAL_QUESTIONS, KNOCKOUT_STAGES, ALL_TEAMS } from "../data";
import matchesData from "../lib/matches.json";
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
  
  // State for reports
  const [reports, setReports] = useState<Report[]>([]);
  const [activeTab, setActiveTab] = useState<'results' | 'users' | 'reports' | 'analytics'>('results');
  const [syncingStats, setSyncingStats] = useState(false);

  const syncMatchStats = async () => {
    setSyncingStats(true);
    try {
      const predictionsSnap = await getDocs(collection(db, "predictions"));
      const stats: Record<string, any> = {};
      
      predictionsSnap.forEach(doc => {
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

        // Fetch users
        console.log("Admin: Fetching users...");
        const usersSnap = await getDocs(collection(db, "users"));
        console.log("Admin: Fetched users.");
        const usersData = usersSnap.docs.map(d => ({ ...d.data(), uid: d.id } as any));
        setUsers(usersData);
        
        // Fetch predictions to calculate analytics
        console.log("Admin: Fetching predictions...");
        const predictionsSnap = await getDocs(collection(db, "predictions"));
        console.log("Admin: Fetched predictions.");
        
        // Fetch leagues
        console.log("Admin: Fetching leagues...");
        const leaguesSnap = await getDocs(collection(db, "leagues"));
        console.log("Admin: Fetched leagues.");

        // Fetch duels
        console.log("Admin: Fetching duels...");
        const duelsSnap = await getDocs(collection(db, "duels_v2"));
        console.log("Admin: Fetched duels.");

        // Calculate analytics
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        let activeTodayCount = 0;
        let wau = 0;
        let mau = 0;
        let newUsers7d = 0;
        let returningUsersAtLeastOnce = 0;
        let returningUsersMultiple = 0;
        let dormant14d = 0;
        let organicUsers = 0;
        let referredUsers = 0;
        
        usersData.forEach(u => {
          if (u.referredBy) {
            referredUsers++;
          } else {
            organicUsers++;
          }

          let loginDate = null;
          if (u.lastLogin) {
            loginDate = new Date(u.lastLogin);
          }
          
          let createDate = null;
          if (u.createdAt) {
            if (typeof u.createdAt === 'string') createDate = new Date(u.createdAt);
            else if (u.createdAt.toDate) createDate = u.createdAt.toDate();
          }

          if (createDate && createDate >= sevenDaysAgo) {
            newUsers7d++;
          } else if (!createDate && loginDate && loginDate >= sevenDaysAgo) {
            // Usuarios antiguos de hace unos pocos dias que aun no tenian el campo createdAt
            if (!u.loginCount || (u.loginCount === 1 && !u.totalPoints)) {
               newUsers7d++;
            }
          }
          
          // Activity based on activeDays and strict 24h checks
          let isActive24h = false;
          if (u.lastLogin) {
            const loginTime = new Date(u.lastLogin).getTime();
            if (now.getTime() - loginTime <= 24 * 60 * 60 * 1000) {
              isActive24h = true;
            }
          }
          if (isActive24h) activeTodayCount++;

          const activeDays: string[] = Array.isArray(u.activeDays) ? u.activeDays : [];
          
          if (activeDays.length > 0) {
             
             const stringSevenDays = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
             const stringFourteenDays = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
             const stringThirtyDays = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

             let hasWAU = false;
             let hasMAU = false;
             let hasRecentActivity = false;

             activeDays.forEach((d: string) => {
               if (d >= stringSevenDays) hasWAU = true;
               if (d >= stringThirtyDays) hasMAU = true;
               if (d >= stringFourteenDays) hasRecentActivity = true;
             });

             if (hasWAU) wau++;
             if (hasMAU) mau++;
             if (!hasRecentActivity) dormant14d++;
             
             // Smart Return Logic: If they have only 1 active day but they existed before today, they are returning!
             let isReturning = activeDays.length > 1;
             let isMultipleReturning = activeDays.length > 2;

             // Fallbacks for older users getting added to activeDays today
             if (activeDays.length === 1 && createDate) {
               const dayOfCreation = createDate.toISOString().split('T')[0];
               if (activeDays[0] > dayOfCreation) {
                 isReturning = true;
               }
             }
             // Reliable fallback from incremented login count
             if (typeof u.loginCount === 'number') {
                if (u.loginCount > 1) isReturning = true;
                if (u.loginCount > 2) isMultipleReturning = true;
             }

             if (isReturning) returningUsersAtLeastOnce++;
             if (isMultipleReturning) returningUsersMultiple++;
          } else {
            // Fallback for old tracking
            if (loginDate) {
              if (loginDate >= sevenDaysAgo) wau++;
              if (loginDate >= thirtyDaysAgo) mau++;
              if (loginDate < fourteenDaysAgo) dormant14d++;
            }
            if (typeof u.loginCount === 'number') {
               if (u.loginCount > 1) returningUsersAtLeastOnce++;
               if (u.loginCount > 2) returningUsersMultiple++;
            } else if (createDate && loginDate) {
               if (createDate.toDateString() !== loginDate.toDateString()) {
                 returningUsersAtLeastOnce++;
               }
            } else if (!createDate && loginDate) {
               returningUsersAtLeastOnce++;
               if (u.totalPoints && u.totalPoints > 0) {
                 returningUsersMultiple++;
               }
            }
          }
        });

        let completePredictions = 0;
        let usersGroupStage = 0;
        let usersSpecialQuestions = 0;

        predictionsSnap.forEach(doc => {
          const data = doc.data();
          
          let matchesCount = 0;
          if (data.matches) {
            Object.values(data.matches).forEach((m: any) => {
              if (m && m.outcome && m.outcome !== "") matchesCount++;
            });
          }
          
          let specialsCount = 0;
          if (data.specials) {
             Object.values(data.specials).forEach((s: any) => {
               if (s && typeof s === 'string' && s.trim() !== "") specialsCount++;
             });
          }
          
          const hasMatches = matchesCount >= 48; // Llenaron los 48 de grupos o mas
          const hasGroups = data.hasSavedPredictions === true || data.isLocked === true; // Guardaron o fijaron grupos
          const hasSpecials = specialsCount > 0; // Guardaron al menos 1
          
          if (hasGroups) usersGroupStage++;
          if (hasSpecials) usersSpecialQuestions++;
          
          if (matchesCount >= 72 && specialsCount >= 10 && data.isLocked === true) {
            completePredictions++;
          } else if (matchesCount >= 48 && specialsCount >= 10) {
            // Cuentan como completos temporalmente si llenaron grupos y esp pero quiza no fijaron aun
            completePredictions++;
          }
        });

        let totalLeagues = leaguesSnap.size;
        let privateLeagues = 0;
        let publicLeagues = 0;
        
        leaguesSnap.forEach(doc => {
          const lData = doc.data();
          if (lData.isPublic) publicLeagues++;
          else privateLeagues++;
        });

        let duelsCreated = duelsSnap.size;
        let duelsAccepted = 0;
        duelsSnap.forEach(doc => {
           if (doc.data().status === 'accepted' || doc.data().status === 'completed') {
             duelsAccepted++;
           }
        });

        setAnalytics({
          totalUsers: usersData.length,
          newUsers7d,
          returningUsersAtLeastOnce,
          returningUsersMultiple,
          activeToday: activeTodayCount,
          wau,
          mau,
          dormant14d,
          totalLeagues,
          privateLeagues,
          publicLeagues,
          duelsCreated,
          duelsAccepted,
          usersGroupStage,
          usersSpecialQuestions,
          completePredictions,
          organicUsers,
          referredUsers
        });
        
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
      
      // Sanitize actualG
      const sanitizedActualG: Record<string, string[]> = {};
      const savedActualG = actualData.groups || {};
      for (const [groupLetter, currentTeams] of Object.entries(GROUPS)) {
        const savedTeams = savedActualG[groupLetter] || [];
        const validSavedTeams = (savedTeams as string[]).filter(t => currentTeams.includes(t));
        const missingTeams = currentTeams.filter(t => !validSavedTeams.includes(t));
        sanitizedActualG[groupLetter] = [...validSavedTeams, ...missingTeams];
      }
      
      const actualG = sanitizedActualG;
      const actualS = actualData.specials || {};
      const actualK = actualData.knockouts || {};

      // 2. Fetch all predictions
      const predictionsSnap = await getDocs(collection(db, "predictions"));
      const predictions = predictionsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

      // Fetch all users to ensure we only update existing ones
      const usersSnapCheck = await getDocs(collection(db, "users"));
      const existingUserIds = new Set(usersSnapCheck.docs.map(d => d.id));

      // 3. Prepare batch update for users
      const batch = writeBatch(db);
      
      for (const pred of predictions) {
        if (!existingUserIds.has(pred.id)) continue; // Skip if user doc is missing
        
        let totalPoints = 0;
        const pGroups = pred.groups || {};
        
        // Sanitize pGroups
        const sanitizedPGroups: Record<string, string[]> = {};
        for (const [groupLetter, currentTeams] of Object.entries(GROUPS)) {
          const savedTeams = pGroups[groupLetter] || [];
          const validSavedTeams = (savedTeams as string[]).filter(t => currentTeams.includes(t));
          const missingTeams = currentTeams.filter(t => !validSavedTeams.includes(t));
          sanitizedPGroups[groupLetter] = [...validSavedTeams, ...missingTeams];
        }

        const pSpecials = pred.specials || {};

        // Calculate Group Points
        // +1 Punto por cada acierto en la posición exacta
        // +2 Puntos por cada grupo perfecto (All 4 in correct order)
        for (const [groupLetter, actualTeams] of Object.entries(actualG)) {
          const predictedTeams = sanitizedPGroups[groupLetter];
          if (!predictedTeams || !Array.isArray(actualTeams)) continue;

          // Check exact matches
          let exactMatches = 0;
          for (let i = 0; i < 4; i++) {
            if (actualTeams[i] && predictedTeams[i] === actualTeams[i]) {
              exactMatches++;
              totalPoints += 1;
            }
          }

          // Check perfect group
          if (exactMatches === 4) {
            totalPoints += 3; // Changed from 2 to 3
          }
        }

        // Calculate Special Points (+10 each)
        for (const [qId, actualAnswer] of Object.entries(actualS)) {
          const predictedAnswer = pSpecials[qId];
          if (predictedAnswer && actualAnswer && typeof actualAnswer === 'string' && typeof predictedAnswer === 'string') {
            if (predictedAnswer.trim().toLowerCase() === actualAnswer.trim().toLowerCase()) {
              totalPoints += 10;
            }
          }
        }

        // Calculate Match Points
        const pMatches = pred.matches || {};
        const actualM = actualData.matches || {};
        for (const [matchId, actualMatch] of Object.entries(actualM)) {
          const predictedMatch = pMatches[matchId];
          if (predictedMatch && actualMatch) {
            const pMatch = predictedMatch as any;
            const aMatch = actualMatch as any;
            // Check outcome
            if (pMatch.outcome && aMatch.outcome && pMatch.outcome === aMatch.outcome) {
              totalPoints += 1;
            }
            // Check exact result
            if (
              pMatch.teamA !== '' && pMatch.teamB !== '' &&
              aMatch.teamA !== '' && aMatch.teamB !== '' &&
              pMatch.teamA === aMatch.teamA &&
              pMatch.teamB === aMatch.teamB
            ) {
              totalPoints += 1;
            }
          }
        }

        // Calculate Knockout Points (Disabled for now)
        /*
        const pKnockouts = pred.knockouts || {};
        for (const stage of KNOCKOUT_STAGES) {
          const actualTeams = actualK[stage.id] || [];
          const predictedTeams = pKnockouts[stage.id] || [];
          
          const uniquePredicted = Array.from(new Set(predictedTeams.filter(Boolean)));
          for (const pTeam of uniquePredicted) {
            if (actualTeams.includes(pTeam)) {
              totalPoints += stage.points;
            }
          }
        }
        */

        // Update user document
        const userRef = doc(db, "users", pred.id); // Use pred.id which is guaranteed to be the UID
        batch.set(userRef, { totalPoints }, { merge: true });
      }

      await batch.commit();

      // Re-fetch users to update the UI with new points
      const usersSnap = await getDocs(collection(db, "users"));
      const usersData = usersSnap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile));
      setUsers(usersData);

      setMessage({ type: 'success', text: t('admin.messages.calcSuccess') });
      window.scrollTo(0, 0);

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

      // 3. Reset points for all users
      const usersSnap = await getDocs(collection(db, "users"));
      const batch = writeBatch(db);
      
      usersSnap.docs.forEach(d => {
        batch.set(doc(db, "users", d.id), { totalPoints: 0 }, { merge: true });
      });

      await batch.commit();

      const updatedUsersSnap = await getDocs(collection(db, "users"));
      const usersData = updatedUsersSnap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile));
      setUsers(usersData);

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
      const leaguesSnap = await getDocs(collection(db, "leagues"));
      leaguesSnap.docs.forEach(d => {
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
      snapF1.forEach(d => batch.delete(d.ref));
      
      const qF2 = query(collection(db, "friendships"), where("user2Id", "==", uid));
      const snapF2 = await getDocs(qF2);
      snapF2.forEach(d => batch.delete(d.ref));
      
      // 3. Delete Friend Requests involving the user
      const qFR1 = query(collection(db, "friendRequests"), where("fromUserId", "==", uid));
      const snapFR1 = await getDocs(qFR1);
      snapFR1.forEach(d => batch.delete(d.ref));
      
      const qFR2 = query(collection(db, "friendRequests"), where("toUserId", "==", uid));
      const snapFR2 = await getDocs(qFR2);
      snapFR2.forEach(d => batch.delete(d.ref));
      
      // 4. Delete Notifications for the user
      const qN = query(collection(db, "notifications"), where("userId", "==", uid));
      const snapN = await getDocs(qN);
      snapN.forEach(d => batch.delete(d.ref));
      
      // 5. Delete Duels involving the user
      const qD1 = query(collection(db, "duels_v2"), where("challengerId", "==", uid));
      const snapD1 = await getDocs(qD1);
      snapD1.forEach(d => batch.delete(d.ref));
      
      const qD2 = query(collection(db, "duels_v2"), where("challengedId", "==", uid));
      const snapD2 = await getDocs(qD2);
      snapD2.forEach(d => batch.delete(d.ref));
      
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
          <h2 className="text-2xl font-bold text-indigo-700 border-b border-indigo-200 pb-2 flex items-center gap-2">
            <Calculator className="w-6 h-6" /> {t('admin.analytics.title')}
          </h2>
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
