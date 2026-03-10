const { Client } = require('ssh2');

const SERVER = '172.105.56.225';
const USER = 'root';
const PASS = 'Samshek@1998';
const APP_DIR = '/var/www/Cash-Flow';

const conn = new Client();
conn.on('ready', () => {
    console.log('Connected via SSH. Executing deployment commands...');
    
    conn.exec(`
        cd ${APP_DIR}
        git pull origin main
        npm install --legacy-peer-deps
        npx prisma generate
        npx prisma migrate deploy
        npm run build
        pm2 restart cashflow
    `, (err, stream) => {
        if (err) { console.error(err); conn.end(); return; }
        stream.on('data', d => process.stdout.write(d));
        stream.stderr.on('data', d => process.stderr.write(d));
        stream.on('close', () => {
            console.log('\\nDeployment completed successfully.');
            conn.end();
        });
    });
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect({ host: SERVER, port: 22, username: USER, password: PASS, readyTimeout: 60000 });
