const { Client } = require('ssh2');

const SERVER = '172.105.56.225';
const USER = 'root';
const PASS = 'Samshek@1998';
const APP_DIR = '/var/www/Cash-Flow';

// Update deployment: pull latest, rebuild, restart
const DEPLOY_SCRIPT = `
#!/bin/bash
set -e

echo "=== Pull latest code ==="
cd ${APP_DIR}
git pull origin main

echo "=== Update .env (fix AUTH_URL issue) ==="
cd ${APP_DIR}
sed -i '/^NEXTAUTH_URL=/d' .env 2>/dev/null || true
sed -i '/^AUTH_URL=/d' .env 2>/dev/null || true
sed -i '/^AUTH_TRUST_HOST=/d' .env 2>/dev/null || true
sed -i '/^NEXTAUTH_SECRET=/d' .env 2>/dev/null || true

# Ensure AUTH_SECRET and File Secrets exist
grep -q '^AUTH_SECRET=' .env || echo 'AUTH_SECRET="k8xP2mN7qR3sT9vW4yB6dF1hJ5lC8nQ0rU3wA7eI2oK4tX6zM9pV1gY5bJ8fH"' >> .env
grep -q '^FILE_SIGNING_SECRET=' .env || echo 'FILE_SIGNING_SECRET="k8xP2mN7qR3sT9vW4yB6dF1hJ5lC8nQ0rU3wA7eI2oK4tX6zM9pV1gY5bJ8fH"' >> .env
grep -q '^UPLOAD_BASE_PATH=' .env || echo 'UPLOAD_BASE_PATH="./uploads"' >> .env

echo "=== Install Dependencies ==="
cd ${APP_DIR}
npm install --legacy-peer-deps

echo "=== Prisma Setup ==="
cd ${APP_DIR}
npx prisma generate
npx prisma db push --accept-data-loss

echo "=== Seed Database ==="
cd ${APP_DIR}
npx prisma db seed || echo "Seed done (may already exist)."

echo "=== Build Next.js ==="
cd ${APP_DIR}
npm run build

echo "=== Restart PM2 ==="
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
    location /uploads/ {
        deny all;
        return 403;
    }
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
NGINXEOF
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/cashflow /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx
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
    console.log('Connected! Running deployment...');
    conn.exec(DEPLOY_SCRIPT, (err, stream) => {
      if (err) { console.error(err); conn.end(); return; }
      stream.on('data', (d) => process.stdout.write(d.toString()));
      stream.stderr.on('data', (d) => process.stderr.write(d.toString()));
      stream.on('close', (code) => { console.log('\nExit code:', code); conn.end(); });
    });
  });
  conn.on('error', (err) => { console.error('SSH Error:', err.message); process.exit(1); });
  console.log('Connecting to Linode...');
  conn.connect({ host: SERVER, port: 22, username: USER, password: PASS, readyTimeout: 30000 });
}
deploy();
