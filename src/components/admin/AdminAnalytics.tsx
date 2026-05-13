import { useState, useEffect } from "react";
import { doc, onSnapshot, getCountFromServer, collection } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Calculator, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AnalyticsData {
  totalUsers: number;
  newUsers7d: number;
  returningUsersAtLeastOnce: number;
  returningUsersMultiple: number;
  activeToday: number;
  wau: number;
  mau: number;
  dormant14d: number;
  totalLeagues: number;
  privateLeagues: number;
  publicLeagues: number;
  duelsCreated: number;
  duelsAccepted: number;
  usersGroupStage: number;
  usersSpecialQuestions: number;
  completePredictions: number;
  organicUsers: number;
  referredUsers: number;
}

interface Props {
  onMessage: (msg: { type: "success" | "error"; text: string } | null) => void;
}

function mapDocToAnalytics(s: Record<string, any>): AnalyticsData {
  return {
    totalUsers:                s.usuarios?.total         ?? 0,
    newUsers7d:                s.usuarios?.nuevos7d      ?? 0,
    returningUsersAtLeastOnce: s.usuarios?.regresaron1vez    ?? 0,
    returningUsersMultiple:    s.usuarios?.regresaronVarias  ?? 0,
    activeToday:               s.usuarios?.activosHoy    ?? 0,
    wau:                       s.usuarios?.activosSemana ?? 0,
    mau:                       s.usuarios?.activosMes    ?? 0,
    dormant14d:                s.usuarios?.inactivos14d  ?? 0,
    totalLeagues:              s.torneos?.total          ?? 0,
    privateLeagues:            s.torneos?.privadas       ?? 0,
    publicLeagues:             s.torneos?.publicas       ?? 0,
    duelsCreated:              s.duelos?.creados         ?? 0,
    duelsAccepted:             s.duelos?.aceptados       ?? 0,
    usersGroupStage:           s.participacion?.conPrediccion ?? 0,
    usersSpecialQuestions:     s.participacion?.conEspeciales ?? 0,
    completePredictions:       s.participacion?.prodeCompleto ?? 0,
    organicUsers:              s.usuarios?.organicos     ?? 0,
    referredUsers:             s.usuarios?.referidos     ?? 0,
  };
}

const EMPTY_ANALYTICS: AnalyticsData = {
  totalUsers: 0, newUsers7d: 0, returningUsersAtLeastOnce: 0,
  returningUsersMultiple: 0, activeToday: 0, wau: 0, mau: 0, dormant14d: 0,
  totalLeagues: 0, privateLeagues: 0, publicLeagues: 0,
  duelsCreated: 0, duelsAccepted: 0, usersGroupStage: 0,
  usersSpecialQuestions: 0, completePredictions: 0, organicUsers: 0, referredUsers: 0,
};

export function AdminAnalytics({ onMessage }: Props) {
  const { t } = useTranslation();
  const [analytics, setAnalytics] = useState<AnalyticsData>(EMPTY_ANALYTICS);
  const [analyticsUpdatedAt, setAnalyticsUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [campaignLoading, setCampaignLoading] = useState<string | null>(null);
  const [totalUsersCount, setTotalUsersCount] = useState<number | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "estadisticas_globales", "actual"),
      (snap) => {
        if (snap.exists()) {
          setAnalytics(mapDocToAnalytics(snap.data()));
          setAnalyticsUpdatedAt(snap.data().actualizadoEn ?? null);
        }
        setLoading(false);
      },
      (err) => {
        console.warn("AdminAnalytics: listener error:", err);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const fetchTotalUsers = async (): Promise<number> => {
    if (totalUsersCount !== null) return totalUsersCount;
    const snap = await getCountFromServer(collection(db, "users"));
    const count = snap.data().count;
    setTotalUsersCount(count);
    return count;
  };

  const sendWelcomeBlast = async () => {
    const confirmed = window.confirm(
      "¿Enviar mail de bienvenida a todos los usuarios que aún no lo recibieron?\n\nEs idempotente: si lo disparás de nuevo, no enviará nada."
    );
    if (!confirmed) return;

    setCampaignLoading("welcome-blast");
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("No autenticado");
      const res = await fetch("/api/mail/welcome-blast", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      onMessage({
        type: "success",
        text: `Blast enviado: ${data.sent} enviados, ${data.failed} fallidos, ${data.skipped} sin email válido.`,
      });
    } catch (err: any) {
      onMessage({ type: "error", text: `Error en blast: ${err.message}` });
      setTimeout(() => onMessage(null), 6000);
    } finally {
      setCampaignLoading(null);
    }
  };

  const sendCampaign = async (type: string, label: string) => {
    const count = await fetchTotalUsers();
    const confirmed = window.confirm(
      `¿Enviar "${label}" a ${count} usuarios?\n\nEsta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    setCampaignLoading(type);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("No autenticado");
      const res = await fetch("/api/mail/campaign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      onMessage({ type: "success", text: `Campaña enviada: ${data.sent} enviados, ${data.failed} fallidos de ${data.total} usuarios.` });
    } catch (err: any) {
      onMessage({ type: "error", text: `Error al enviar campaña: ${err.message}` });
      setTimeout(() => onMessage(null), 6000);
    } finally {
      setCampaignLoading(null);
    }
  };

  const recalcularEstadisticas = async () => {
    setRecalculating(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("No autenticado");
      const res = await fetch("/api/admin/recalcular-estadisticas", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error ?? res.statusText);
      }
      const data = await res.json();
      // Update timestamp immediately from API response — onSnapshot may lag with long polling
      setAnalyticsUpdatedAt(data.actualizadoEn);
      onMessage({ type: "success", text: `Estadísticas recalculadas. Actualizado: ${new Date(data.actualizadoEn).toLocaleString()}` });
    } catch (err: any) {
      onMessage({ type: "error", text: `Error al recalcular: ${err.message}` });
      setTimeout(() => onMessage(null), 5000);
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );

  return (
    <div className="space-y-6 pt-4 pb-12">
      <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
        <h2 className="text-2xl font-bold text-indigo-700 flex items-center gap-2">
          <Calculator className="w-6 h-6" /> {t("admin.analytics.title")}
        </h2>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="flex items-center gap-1 text-green-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              En vivo
            </span>
            {analyticsUpdatedAt && (
              <>· Últ. cálculo: {new Date(analyticsUpdatedAt).toLocaleString()}</>
            )}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={recalcularEstadisticas}
            disabled={recalculating}
            className="flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            <Calculator className="w-4 h-4" />
            {recalculating ? "Calculando..." : "Recalcular"}
          </Button>
        </div>
      </div>

      {!analyticsUpdatedAt && (
        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          No hay datos calculados aún. Pulsá &quot;Recalcular&quot; para generar las estadísticas.
        </p>
      )}
      <p className="text-sm text-gray-600 mb-4">{t("admin.analytics.description")}</p>

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

      <h3 className="text-xl font-bold text-indigo-700 mt-8 mb-4 border-b border-indigo-100 pb-2 flex items-center gap-2">
        Adquisición y Viralidad
      </h3>

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
              {analytics.totalUsers > 0
                ? ((analytics.referredUsers / analytics.totalUsers) * 100).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Usuarios invitados</p>
          </CardContent>
        </Card>
      </div>

      <h3 className="text-xl font-bold text-indigo-700 mt-8 mb-4 border-b border-indigo-100 pb-2 flex items-center gap-2">
        Participación y Torneos
      </h3>

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

      {/* Campañas de Mail */}
      <h3 className="text-xl font-bold text-indigo-700 mt-10 mb-4 border-b border-indigo-100 pb-2 flex items-center gap-2">
        <Mail className="w-5 h-5" /> Campañas de Mail
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Cada botón envía el mail a <strong>todos los usuarios</strong> con email real. Se te pedirá confirmación antes de disparar.
      </p>

      {/* One-time welcome blast */}
      <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex-1">
          <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">Bienvenida a usuarios existentes</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Disparo único — solo llega a quienes no recibieron el mail al registrarse. Idempotente: si lo volvés a correr, no envía nada.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={campaignLoading !== null}
          onClick={sendWelcomeBlast}
          className="flex items-center gap-2 border-amber-400 text-amber-700 hover:bg-amber-100 shrink-0"
        >
          <Mail className="w-3.5 h-3.5" />
          {campaignLoading === "welcome-blast" ? "Enviando..." : "Enviar bienvenida"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { type: "players100", label: "Llegamos a 100 jugadores", desc: "Celebración del hito inicial" },
          { type: "dayBefore", label: "1 día antes del Mundial", desc: "Cierra tu prode — 10 de junio" },
          { type: "firstDate", label: "Cierre primera fecha", desc: "Revisá tus puntos y posición" },
          { type: "knockouts", label: "Fin de grupos / eliminatorias", desc: "Arrancó la etapa final" },
          { type: "postFinal", label: "Post final", desc: "Gracias por jugar — 20 de julio" },
        ].map(({ type, label, desc }) => (
          <div key={type} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col gap-2">
            <div>
              <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{label}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={campaignLoading !== null}
              onClick={() => sendCampaign(type, label)}
              className="mt-auto flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <Mail className="w-3.5 h-3.5" />
              {campaignLoading === type ? "Enviando..." : "Enviar campaña"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
