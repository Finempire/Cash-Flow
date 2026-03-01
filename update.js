// Usage: node update.js
// Run this after pushing changes to GitHub to update the Linode server
const { Client } = require('ssh2');

const SERVER = '172.105.56.225';
const USER = 'root';
const PASS = 'Samshek@1998';
const APP_DIR = '/var/www/Cash-Flow';

const UPDATE_SCRIPT = `
#!/bin/bash
set -e
cd ${APP_DIR}
echo "=== Pulling latest from GitHub ==="
git pull origin main
echo "=== Installing dependencies ==="
npm install --legacy-peer-deps
echo "=== Running Prisma migrations ==="
npx prisma generate
npx prisma migrate deploy 2>/dev/null || npx prisma db push
echo "=== Building Next.js ==="
npm run build
echo "=== Restarting PM2 ==="
pm2 restart cashflow
pm2 status
echo ""
echo "=== UPDATE COMPLETE ==="
echo "App: http://172.105.56.225"
`;

function update() {
    const conn = new Client();
    conn.on('ready', () => {
        console.log('Connected! Running update...');
        conn.exec(UPDATE_SCRIPT, (err, stream) => {
            if (err) { console.error(err); conn.end(); return; }
            stream.on('data', (data) => process.stdout.write(data.toString()));
            stream.stderr.on('data', (data) => process.stderr.write(data.toString()));
            stream.on('close', (code) => { console.log('\\nUpdate finished. Exit:', code); conn.end(); });
        });
    });
    conn.on('error', (err) => { console.error('SSH Error:', err.message); process.exit(1); });
    console.log('Connecting to ' + SERVER + '...');
    conn.connect({ host: SERVER, port: 22, username: USER, password: PASS, readyTimeout: 30000 });
}
update();
