import { useState } from "react";
import { Button } from "../components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { CountdownBanner } from "../components/CountdownBanner";
import { AdminAnalytics } from "../components/admin/AdminAnalytics";
import { AdminReports } from "../components/admin/AdminReports";
import { AdminUsers } from "../components/admin/AdminUsers";
import { AdminResults } from "../components/admin/AdminResults";
import { useTranslation } from "react-i18next";

type Tab = "results" | "users" | "reports" | "analytics";

export default function Admin() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("results");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <CountdownBanner />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t("admin.title")}</h1>
          <p className="text-gray-500 dark:text-gray-200 mt-1">{t("admin.subtitle")}</p>
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          {(["results", "users", "reports", "analytics"] as Tab[]).map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? "default" : "outline"}
              onClick={() => setActiveTab(tab)}
              className={activeTab === tab ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              {t(`admin.tabs.${tab}`)}
            </Button>
          ))}
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-md flex items-center gap-3 ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {message.text}
        </div>
      )}

      {activeTab === "analytics" && <AdminAnalytics onMessage={setMessage} />}
      {activeTab === "results"   && <AdminResults   onMessage={setMessage} />}
      {activeTab === "users"     && <AdminUsers     onMessage={setMessage} />}
      {activeTab === "reports"   && <AdminReports   onMessage={setMessage} />}
    </div>
  );
}
