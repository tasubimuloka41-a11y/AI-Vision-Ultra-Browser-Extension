const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5000;
const HOST = '0.0.0.0';

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const EXTENSION_FILES = ['manifest.json', 'background.js', 'content.js', 'sidepanel.html', 'sidepanel.css', 'sidepanel.js', 'rules.json', 'drive-api.js', 'image-processor.js'];

const server = http.createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Vision Ultra - Chrome Extension</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 40px 20px; }
    .container { max-width: 800px; margin: 0 auto; }
    .card { background: white; border-radius: 16px; padding: 40px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    h1 { color: #333; margin-bottom: 10px; font-size: 2rem; }
    .version { color: #667eea; font-weight: 600; margin-bottom: 20px; }
    .description { color: #666; margin-bottom: 30px; line-height: 1.6; }
    h2 { color: #333; margin-bottom: 15px; font-size: 1.3rem; }
    .files { list-style: none; margin-bottom: 30px; }
    .files li { padding: 12px 16px; background: #f8f9fa; margin-bottom: 8px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
    .files a { color: #667eea; text-decoration: none; font-weight: 500; }
    .files a:hover { text-decoration: underline; }
    .install-steps { background: #f0f4ff; padding: 25px; border-radius: 12px; margin-top: 20px; }
    .install-steps h3 { color: #333; margin-bottom: 15px; }
    .install-steps ol { padding-left: 20px; color: #555; line-height: 2; }
    .badge { background: #667eea; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>AI Vision Ultra - Google Fixed</h1>
      <div class="version">Version 25.0.0</div>
      <p class="description">A Chrome extension with Google integration, iframe support for all sites, DDG, Grok, and Agent capabilities.</p>
      
      <h2>Extension Files</h2>
      <ul class="files">
        ${EXTENSION_FILES.map(f => `<li><a href="/${f}">${f}</a><span class="badge">${path.extname(f).slice(1).toUpperCase() || 'FILE'}</span></li>`).join('')}
      </ul>
      
      <div class="install-steps">
        <h3>How to Install This Extension</h3>
        <ol>
          <li>Download all extension files to a folder on your computer</li>
          <li>Open Chrome and go to <strong>chrome://extensions/</strong></li>
          <li>Enable <strong>Developer mode</strong> (toggle in top right)</li>
          <li>Click <strong>Load unpacked</strong></li>
          <li>Select the folder containing the extension files</li>
        </ol>
      </div>
    </div>
  </div>
</body>
</html>`);
    return;
  }

  let filePath = req.url.slice(1);
  if (filePath.startsWith('_metadata/')) {
    filePath = filePath;
  }
  
  const fullPath = path.join(__dirname, filePath);
  const ext = path.extname(fullPath);
  
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      return;
    }
    
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Chrome Extension preview server running at http://${HOST}:${PORT}`);
  console.log('View extension files and installation instructions at the root URL');
});
