fetch("https://www.infobae.com/deportes/rss.xml").then(r=>r.text()).then(t=>console.log(t.substring(0, 500))).catch(e=>console.log("No"));
fetch("https://www.espn.com.ar/espn/rss/news").then(r=>r.text()).then(t=>console.log(t.substring(0, 500))).catch(e=>console.log("No2"));
