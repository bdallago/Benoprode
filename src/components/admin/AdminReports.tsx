import { useState, useEffect } from "react";
import { doc, deleteDoc, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { MessageSquareWarning, Paperclip, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Report {
  id: string;
  message: string;
  userEmail: string;
  userName: string;
  createdAt: string;
  attachments?: string[];
}

interface Props {
  onMessage: (msg: { type: "success" | "error"; text: string } | null) => void;
}

export function AdminReports({ onMessage }: Props) {
  const { t } = useTranslation();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db, "reports"), orderBy("createdAt", "desc"), limit(100)))
      .then((snap) => {
        setReports(snap.docs.map((d) => ({ ...d.data(), id: d.id } as Report)));
      })
      .catch((e) => console.warn("AdminReports: failed to fetch reports:", e))
      .finally(() => setLoading(false));
  }, []);

  const deleteReport = async (id: string) => {
    try {
      await deleteDoc(doc(db, "reports", id));
      setReports((prev) => prev.filter((r) => r.id !== id));
      onMessage({ type: "success", text: t("admin.messages.deleteReportSuccess") });
    } catch (error) {
      console.error("Error deleting report:", error);
      onMessage({ type: "error", text: t("admin.messages.deleteReportError") });
    } finally {
      setTimeout(() => onMessage(null), 5000);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
    </div>
  );

  return (
    <div className="space-y-6 pt-4 pb-12">
      <h2 className="text-2xl font-bold text-orange-700 border-b border-orange-200 pb-2 flex items-center gap-2">
        <MessageSquareWarning className="w-6 h-6" /> {t("admin.reports.title")}
      </h2>
      <p className="text-sm text-gray-600 mb-4">{t("admin.reports.description")}</p>

      <div className="space-y-4">
        {reports.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-lg text-center border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-200">{t("admin.reports.noReports")}</p>
          </div>
        ) : (
          reports.map((report) => (
            <Card key={report.id} className="overflow-hidden border-l-4 border-l-orange-500 dark:border-gray-800">
              <CardHeader className="bg-gray-50 dark:bg-gray-800/50 py-3 px-4 border-b dark:border-gray-700 flex flex-row justify-between items-start">
                <div>
                  <CardTitle className="text-base font-bold text-gray-900 dark:text-gray-100">
                    {report.userName || t("admin.reports.anonymous")}
                  </CardTitle>
                  <p className="text-xs text-gray-500 dark:text-gray-200">
                    {report.userEmail || t("admin.reports.noEmail")} •{" "}
                    {new Date(report.createdAt).toLocaleString()}
                  </p>
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
                      <Paperclip className="w-3 h-3" />{" "}
                      {t("admin.reports.attachmentsCount", { count: report.attachments.length })}
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
  );
}
