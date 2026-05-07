import { useTranslation } from 'react-i18next';

export default function Terms() {
  const { t } = useTranslation();
  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">{t('terms.title')}</h1>
      <div className="space-y-4 text-gray-600 dark:text-gray-300">
        <p dangerouslySetInnerHTML={{ __html: t('terms.p1') }} />
        <p>{t('terms.p2')}</p>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-6">{t('terms.h2_1')}</h2>
        <p>{t('terms.p3')}</p>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-6">{t('terms.h2_2')}</h2>
        <p dangerouslySetInnerHTML={{ __html: t('terms.p4') }} />
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-6">{t('terms.h2_3')}</h2>
        <p>{t('terms.p5')}</p>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-6">{t('terms.h2_4')}</h2>
        <p>{t('terms.p6')}</p>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-6">{t('terms.h2_5')}</h2>
        <p>{t('terms.p7')}</p>
      </div>
    </div>
  );
}
