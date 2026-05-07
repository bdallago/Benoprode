import { useTranslation } from 'react-i18next';

export default function Privacy() {
  const { t } = useTranslation();
  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">{t('privacy.title')}</h1>
      <div className="space-y-4 text-gray-600 dark:text-gray-300">
        <p dangerouslySetInnerHTML={{ __html: t('privacy.p1') }} />
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-6">{t('privacy.h2_1')}</h2>
        <p>{t('privacy.p2')}</p>
        <ul className="list-disc pl-6 space-y-2">
          <li dangerouslySetInnerHTML={{ __html: t('privacy.li1') }} />
          <li dangerouslySetInnerHTML={{ __html: t('privacy.li2') }} />
          <li dangerouslySetInnerHTML={{ __html: t('privacy.li3') }} />
        </ul>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-6">{t('privacy.h2_2')}</h2>
        <p>{t('privacy.p3')}</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>{t('privacy.li4')}</li>
          <li>{t('privacy.li5')}</li>
          <li>{t('privacy.li6')}</li>
        </ul>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-6">{t('privacy.h2_3')}</h2>
        <p>{t('privacy.p4')}</p>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-6">{t('privacy.h2_4')}</h2>
        <p>{t('privacy.p5')}</p>
      </div>
    </div>
  );
}
