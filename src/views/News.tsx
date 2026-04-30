import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Newspaper, ExternalLink, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface NewsItem {
  id: string;
  title: string;
  link: string;
  summary: string;
  date: string;
  image: string | null;
  source: string;
}

export default function News() {
  const { t } = useTranslation();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSticky, setIsSticky] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const lang = navigator.language.split('-')[0] || 'es'; // Get language, default to es
        const res = await fetch(`/api/news?lang=${lang}`);
        if (res.ok) {
          const data = await res.json();
          setNews(data);
        } else {
          console.error("Failed to fetch news");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-0">
      <div className="sticky top-[64px] z-40 flex flex-col md:flex-row items-center justify-between bg-white/95 backdrop-blur-md dark:bg-gray-800/95 border-b border-l border-r border-t-0 md:border-t-0 border-gray-200 dark:border-gray-700 shadow-sm p-4 gap-4 rounded-b-lg">
        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center md:text-left w-full md:w-auto">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center justify-center gap-2 text-gray-900 dark:text-gray-100">
            <Newspaper className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
            {t('news.title')}
          </h1>
          <div className="flex flex-col text-sm font-medium hidden md:block">
            <p className="text-gray-600 dark:text-gray-300">
              {t('news.desc')}
            </p>
            <p className="text-gray-500/80 dark:text-gray-400/80 text-xs mt-1">
              {t('news.notTranslate', 'Las noticias se muestran en su idioma original.')}
            </p>
          </div>
        </div>
        
        <Button 
          onClick={() => router.push('/predictions')}
          variant="outline"
          className="flex items-center justify-center gap-2 w-full md:w-auto shrink-0 shadow-sm transition-all"
        >
          <Pencil className="w-4 h-4" /> 
          <span className="md:inline">{t('news.modifyPredictions')}</span>
        </Button>
      </div>

      <div className="space-y-6 pb-20">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="animate-pulse flex flex-col md:flex-row overflow-hidden border-2 border-gray-100 dark:border-gray-700">
                 <div className="w-full md:w-1/3 h-48 bg-gray-200 dark:bg-gray-700 shrink-0"></div>
                 <div className="p-4 flex-1 space-y-4">
                   <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                   <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                   <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                   <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                 </div>
              </Card>
            ))}
          </div>
        ) : news.length > 0 ? (
          news.map((item) => (
            <Card key={item.id} className="overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow group flex flex-col md:flex-row">
              {item.image && (
                <div className="relative w-full md:w-1/3 h-48 md:h-auto shrink-0 bg-gray-100 dark:bg-gray-800">
                  {/* Next.js Image component needs domain to be registered in next.config.mjs or just use standard img if domains vary. Since image sources might vary across news platforms, we'll use a standard img tag to bypass strict domain whitelisting, or ensure we only use whitelisted domains. Since it's dynamic, img is safer here. */}
                  <img
                    src={item.image}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent md:hidden" />
                </div>
              )}
              <div className="flex-1 p-4 sm:p-5 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-1 rounded">
                    {t('news.source', 'Fuente')}: {item.source}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded">
                    {new Date(item.date).toLocaleDateString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <h2 className="text-lg sm:text-xl font-bold mb-2 text-gray-900 dark:text-gray-100 leading-tight">
                  {item.title}
                </h2>
                
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3 md:line-clamp-none flex-1">
                  {item.summary}
                </p>
                
                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
                  <a 
                    href={item.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 transition-colors inline-flex whitespace-nowrap rounded-xl font-bold ring-offset-background duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-md border-b-[4px] active:border-b-0 active:translate-y-[4px] bg-white text-gray-900 border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-950 h-9 px-3 text-xs"
                  >
                    {t('news.readMore')} {t('news.on', 'en')} {item.source}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <Newspaper className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">{t('news.noNews')}</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">{t('news.tryAgainLater', 'Vuelve a intentar más tarde.')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
