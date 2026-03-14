const http = require('http');

const payload = JSON.stringify({
  code: `document.write("x");\ninnerHTML = "test";\nconst { exec } = require('child_process');\nexec('echo hi');`
});

const req = http.request(
  {
    method: 'POST',
    host: 'localhost',
    port: 5000,
    path: '/api/scan/code',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  },
  (res) => {
    let body = '';
    res.on('data', (chunk) => (body += chunk));
    res.on('end', () => {
      try {
        console.log(JSON.stringify(JSON.parse(body), null, 2));
      } catch {
        console.log(body);
      }
    });
  }
);

req.on('error', (err) => console.error('Request error:', err));
req.write(payload);
req.end();
