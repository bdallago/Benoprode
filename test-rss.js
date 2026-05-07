const url = 'https://news.google.com/rss/search?q=' + encodeURIComponent('("selección argentina" OR "mundial 2026" OR "eliminatorias") (lesión OR baja OR plantel OR técnico OR declaración OR convocado) site:infobae.com OR site:lacapital.com.ar OR site:rosario3.com OR site:espn.com.ar OR site:ole.com.ar OR site:tycsports.com futbol when:7d') + '&hl=es-419&gl=AR&ceid=AR:es-419';
fetch(url).then(r=>r.text()).then(xml=>{
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match = itemRegex.exec(xml);
  if(match) {
      console.log(match[1]);
  }
});
