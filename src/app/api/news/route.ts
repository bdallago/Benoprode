import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  const parser = new Parser();
  try {
    const feedsToFetch = [
      { url: 'https://www.ole.com.ar/rss/seleccion/', source: 'Olé' },
      { url: 'https://www.ole.com.ar/rss/futbol-internacional/', source: 'Olé' },
      { url: 'https://www.clarin.com/rss/deportes/', source: 'Clarín' },
      { url: 'https://as.com/rss/futbol/internacional.xml', source: 'Diario AS' }
    ];

    const keywords = ['mundial', 'seleccion', 'selección', 'scaloni', 'copa del mundo', 'eliminatorias', 'fifa', 'argentina', 'españa'];

    let allItems: any[] = [];

    await Promise.all(feedsToFetch.map(async (feedConf) => {
      try {
        const feed = await parser.parseURL(feedConf.url);
        const mappedItems = feed.items.map(item => ({
          ...item,
          sourceName: feedConf.source
        }));
        allItems = [...allItems, ...mappedItems];
      } catch (err) {
        console.error(`Error fetching feed ${feedConf.url}:`, err);
      }
    }));

    if (allItems.length === 0) {
      return NextResponse.json({ error: "No news found" }, { status: 404 });
    }

    // Filter by keywords to ensure relevance
    const filteredItems = allItems.filter(item => {
      const textToSearch = ((item.title || '') + ' ' + (item.contentSnippet || '') + ' ' + (item.description || '')).toLowerCase();
      return keywords.some(kw => textToSearch.includes(kw));
    });

    // We can filter out duplicates by title
    const uniqueItems: any[] = [];
    const titles = new Set();
    for (const item of filteredItems) {
      if (!titles.has(item.title)) {
        titles.add(item.title);
        uniqueItems.push(item);
      }
    }

    // Sort by date (newest first)
    uniqueItems.sort((a, b) => {
      const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return dateB - dateA;
    });

    // Take top 5
    const top5 = uniqueItems.slice(0, 5).map(item => {
      let imageUrl = item.enclosure?.url || null;
      if (!imageUrl && item.content) {
         // Attempt to extract image from content HTML if enclosure is missing
         const match = item.content.match(/src="([^"]+)"/);
         if (match) {
            imageUrl = match[1];
         }
      }

      return {
        id: item.guid || item.link,
        title: item.title,
        link: item.link,
        summary: item.contentSnippet || `Noticia de ${item.sourceName}`,
        date: item.pubDate,
        image: imageUrl,
        source: item.sourceName,
      };
    });

    return NextResponse.json(top5);
  } catch (error) {
    console.error("Error fetching RSS:", error);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
