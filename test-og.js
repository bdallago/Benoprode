const link = "https://news.google.com/rss/articles/CBMiggJBVV95cUxPNE5jRDV5aWU1Y0J6NlI2OEZEdlNNdC1KZlRvd1lhaVRMZk9SUnVBOFZyNElDZEFXbGUzcFNpTzkyQjhZQVQwZWFrQ2lBd1F4dE40d082Mi1uSVM2M0djelhVTGJsS013akF6SVhjbE83dXZBQW5EOU92M0NTd1l2SlRmNnFnS21NeUEzTDR2ejJNOGxRRDYwdElVRV9nQU94dXcwNExrS0hnSFBDcDBlVGFpMEpzVlhqenlPT0ZxMjdBN2pDNEtFN1dqeXFVdVJkWWEtUXpPLTNMbkV6cnlUM1FTUFV1ZDFObzhiVEgtbkk0Tlh1blBzYXlyVExubk9Jb2fSAZwCQVVfeXFMUGhSR2tsLWp2MlNWTVB2TFFCOWVmMG1VejdjcHdKZHliM1RMTF9icFVLMEFSYU9iT2d3ZU9YQUMxZkpaSVgwUU83NDNiYzVLQnJSd3JqbGlsd0ZiNGpNVlBMMjR6WnNxTDk0eS1aN0NIaFQtTTRQUFBqQ2hxRXlKVWlRZm9VYU1JbUl0ODQwMllVZmZFTmVCTjF1VzgxVGVVRmxUaWlwMFRxaExCaEU4RTdqcXlieWdIM1kwWUlKNnluMGY5clFzV3VoZEpTQzV1SkdZcWZwWUFDV1lKS3RDa0JUem1rdXZZMFp3Y0s3WDE5RnRMcVo1M2dRN195MW9hcHctaTRZR3FmTGZqUHZZTmhnUkE2VzFLdHJFN3A?oc=5";
fetch(link, { redirect: 'follow' })
.then(r => r.text())
.then(html => {
  const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
  console.log("Image:", ogImage ? ogImage[1] : null);
  console.log("Desc:", ogDesc ? ogDesc[1] : null);
}).catch(e => console.error(e));
