const http = require('http');

http.get('http://localhost:3000/api/stats', (res) => {
  let data = '';
  console.log('Status Code:', res.statusCode);
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('Response:', data));
}).on('error', (err) => console.log('Error:', err.message));
