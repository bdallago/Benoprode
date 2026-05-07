import Parser from "rss-parser";

async function testFetch() {
  const parser = new Parser();
  try {
    const feed = await parser.parseURL("https://news.google.com/rss/search?q=mundial+futbol+OR+seleccion+argentina+when:1d&hl=es-419&gl=AR&ceid=AR:es-419");
    console.log(feed.title);
    console.log(feed.items.slice(0, 5).map((item) => item.title + " - " + item.link));
  } catch (error) {
    console.error("Error:", error);
  }
}
testFetch();
