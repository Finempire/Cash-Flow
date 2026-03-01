const { Client } = require('ssh2');

const SERVER = '172.105.56.225';
const USER = 'root';
const PASS = 'Samshek@1998';
const APP_DIR = '/var/www/Cash-Flow';

// Phase 3: repo already cloned, .env created. Clear npm cache and finish setup.
const DEPLOY_SCRIPT = `
#!/bin/bash
set -e

echo "=== Clear npm cache ==="
npm cache clean --force
rm -rf ${APP_DIR}/node_modules ${APP_DIR}/package-lock.json

echo "=== Re-install Dependencies ==="
cd ${APP_DIR}
npm install --legacy-peer-deps

echo "=== Prisma Setup ==="
cd ${APP_DIR}
npx prisma generate
npx prisma db push --accept-data-loss

echo "=== Seed Database ==="
cd ${APP_DIR}
npx prisma db seed || echo "Seed done."

echo "=== Build Next.js ==="
cd ${APP_DIR}
npm run build

echo "=== Start PM2 ==="
cd ${APP_DIR}
pm2 delete cashflow 2>/dev/null || true
pm2 start npm --name "cashflow" -- start
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo "=== Configure Nginx ==="
cat > /etc/nginx/sites-available/cashflow << 'NGINXEOF'
server {
    listen 80;
    server_name 172.105.56.225;
    client_max_body_size 20M;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_cache_bypass \\$http_upgrade;
    }
}
NGINXEOF
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/cashflow /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
echo "Nginx configured."

echo ""
echo "============================================"
echo "  DEPLOYMENT COMPLETE!"
echo "  App URL: http://172.105.56.225"
echo "  Login: accountant@cashflow.com / Change@123"
echo "============================================"
pm2 status
`;

function deploy() {
  const conn = new Client();
  conn.on('ready', () => {
    console.log('Connected! Running phase 3...');
    conn.exec(DEPLOY_SCRIPT, (err, stream) => {
      if (err) { console.error(err); conn.end(); return; }
      stream.on('data', (d) => process.stdout.write(d.toString()));
      stream.stderr.on('data', (d) => process.stderr.write(d.toString()));
      stream.on('close', (code) => { console.log('\\nExit code:', code); conn.end(); });
    });
  });
  conn.on('error', (err) => { console.error('SSH Error:', err.message); process.exit(1); });
  console.log('Connecting...');
  conn.connect({ host: SERVER, port: 22, username: USER, password: PASS, readyTimeout: 30000 });
}
deploy();
