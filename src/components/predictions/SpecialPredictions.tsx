import { Card, CardContent } from "../ui/card";
import { SPECIAL_QUESTIONS } from "../../data";
import { useTranslation } from 'react-i18next';

interface SpecialPredictionsProps {
  specialPredictions: Record<string, string>;
  effectiveIsLocked: boolean;
  handleSpecialChange: (id: string, value: string) => void;
}

export function SpecialPredictions({ specialPredictions, effectiveIsLocked, handleSpecialChange }: SpecialPredictionsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 pt-2 special-questions-container">
      <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-400 border-b dark:border-gray-700 pb-2 transition-colors duration-200">
        {t('predictions.specialQuestions')}
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-justify transition-colors duration-200">
        {t('predictions.specialQuestionsDesc')}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SPECIAL_QUESTIONS.map((q) => (
          <Card key={q.id} className="h-full flex flex-col">
            <CardContent className="p-5 flex flex-col h-full justify-between gap-4">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors duration-200">
                {t(`specialQuestions.${q.id}`)}
              </label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors duration-200 mt-auto"
                placeholder={t('predictions.typeAnswer')}
                value={specialPredictions[q.id] || ""}
                onChange={(e) => handleSpecialChange(q.id, e.target.value)}
                disabled={effectiveIsLocked}
              />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg text-center mt-6 shadow-sm transition-colors duration-200">
        <p className="text-blue-800 dark:text-blue-300 font-bold">{t('predictions.suggestions')}</p>
      </div>
    </div>
  );
}
