import { NextResponse, NextRequest } from 'next/server';
import Parser from 'rss-parser';
import { GoogleGenAI } from '@google/genai';
import { unstable_cache } from 'next/cache';

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['content:encoded', 'contentEncoded'],
      ['description', 'description']
    ]
  }
});

const getCachedNews = unstable_cache(
  async (targetLang: string) => {
    const feedsToFetch = [
      { url: 'https://www.ole.com.ar/rss/seleccion/', source: 'Olé (Arg)' },
      { url: 'https://www.ole.com.ar/rss/futbol-internacional/', source: 'Olé' },
      { url: 'https://www.clarin.com/rss/deportes/', source: 'Clarín' },
      { url: 'https://as.com/rss/futbol/internacional.xml', source: 'Diario AS' },
      { url: 'https://feeds.bbci.co.uk/sport/football/rss.xml', source: 'BBC Sport' },
      { url: 'https://www.marca.com/rss/futbol/mundial.xml', source: 'Marca' }
    ];

    const argKeywords = [
      "selección argentina", "scaloneta", "lionel messi", "lionel scaloni", 
      "afa", "dibu martínez", "julián álvarez", "rodrigo de paul", "lesión argentina mundial",
      "argentina", "messi", "scaloni", "martínez"
    ];

    const otherKeywords = [
      "fifa world cup 2026", "mundial 2026", "selección brasil", "selección uruguay", 
      "france national football team", "england national football team", 
      "spain national football team", "lesión mundial 2026", "world cup qualifiers", "world cup roster"
    ];

    const fetchFeedWithTimeout = async (feedConf: {url: string, source: string}) => {
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 4000));
        const feedPromise = parser.parseURL(feedConf.url);
        const feed = await Promise.race([feedPromise, timeoutPromise]) as Parser.Output<any>;
        return feed.items.map(item => ({ ...item, sourceName: feedConf.source }));
      } catch (err) {
        console.error(`Error fetching feed ${feedConf.url}:`, err);
        return [];
      }
    };

    const allItemsArrays = await Promise.all(feedsToFetch.map(fetchFeedWithTimeout));
    let allItems = allItemsArrays.flat();

    const uniqueItems: any[] = [];
    const titles = new Set();
    for (const item of allItems) {
      if (item.title && !titles.has(item.title)) {
        titles.add(item.title);
        uniqueItems.push(item);
      }
    }

    uniqueItems.sort((a, b) => {
      const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return dateB - dateA;
    });

    const matchesKeywords = (text: string, keywords: string[]) => {
      const lowerText = text.toLowerCase();
      return keywords.some(kw => lowerText.includes(kw.toLowerCase()));
    };

    const argNews = uniqueItems.filter(item => {
      const textToSearch = ((item.title || '') + ' ' + (item.contentSnippet || '') + ' ' + (item.content || '') + ' ' + (item.sourceName || '')).toLowerCase();
      if (item.sourceName === 'Olé (Arg)') return true;
      return matchesKeywords(textToSearch, argKeywords);
    }).slice(0, 3);

    const otherNews = uniqueItems.filter(item => {
      const textToSearch = ((item.title || '') + ' ' + (item.contentSnippet || '')).toLowerCase();
      return matchesKeywords(textToSearch, otherKeywords) && !matchesKeywords(textToSearch, argKeywords);
    }).slice(0, 2);

    let finalNews = [...argNews, ...otherNews];
    if (finalNews.length < 5) {
      const remainingNeeded = 5 - finalNews.length;
      const genericNews = uniqueItems
        .filter(item => !finalNews.includes(item))
        .slice(0, remainingNeeded);
      finalNews = [...finalNews, ...genericNews];
    }

    const formatNewsItem = (item: any) => {
      let imageUrl = item.enclosure?.url || item.mediaContent?.$?.url || item.mediaThumbnail?.$?.url || null;
      if (!imageUrl && item.contentEncoded) {
         const match = item.contentEncoded.match(/<img[^>]+src=["']([^"']+)["']/i);
         if (match) imageUrl = match[1];
      }
      if (!imageUrl && item.content) {
         const match = item.content.match(/<img[^>]+src=["']([^"']+)["']/i);
         if (match) imageUrl = match[1];
      }
      if (!imageUrl && item.description) {
         const match = item.description.match(/<img[^>]+src=["']([^"']+)["']/i);
         if (match) imageUrl = match[1];
      }
      if (!imageUrl && item.content) {
         const match = item.content.match(/src=["']([^"']+)["']/i);
         if (match) imageUrl = match[1];
      }
      return {
        id: item.guid || item.link || Math.random().toString(),
        title: item.title,
        link: item.link,
        summary: item.contentSnippet || item.content || `Noticia de ${item.sourceName}`,
        date: item.pubDate || new Date().toISOString(),
        image: imageUrl || "https://picsum.photos/seed/worldcup/800/600",
        source: item.sourceName,
      };
    };

    const formattedNews = finalNews.map(formatNewsItem);

    if (process.env.NEXT_PUBLIC_GEMINI_API_KEY && process.env.NEXT_PUBLIC_GEMINI_API_KEY.length > 5) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
        const prompt = `
          Translate the following news titles and summaries into this language code ideally (e.g. 'es', 'en', 'pt'): ${targetLang}.
          Return ONLY valid JSON. The JSON should be an array of objects matching the original order, each with 'title' and 'summary'.
          Here is the data:
          ${JSON.stringify(formattedNews.map(n => ({ title: n.title, summary: n.summary.substring(0, 200) })))}
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.2
          }
        });
        
        const translatedText = response.text();
        if (translatedText) {
          const translations = JSON.parse(translatedText);
          if (Array.isArray(translations) && translations.length === formattedNews.length) {
            translations.forEach((t, i) => {
              formattedNews[i].title = t.title || formattedNews[i].title;
              formattedNews[i].summary = t.summary || formattedNews[i].summary;
            });
          }
        }
      } catch (translateError: any) {
        if (translateError?.message?.includes('API key not valid')) {
          console.warn("Translation skipped: Invalid Gemini API Key.");
        } else {
          console.warn("Translation failed, using original text.");
        }
      }
    } else {
      console.warn("No valid GEMINI_API_KEY found, returning untranslated news.");
    }

    return formattedNews;
  },
  ['language-news-cache'],
  { revalidate: 3600 }
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetLang = searchParams.get('lang') || 'es';

    const formattedNews = await getCachedNews(targetLang);

    return NextResponse.json(formattedNews);
  } catch (error) {
    console.error("Error in news route:", error);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}


