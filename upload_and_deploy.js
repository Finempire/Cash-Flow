const { Client } = require('ssh2');
const fs = require('fs');

const SERVER = '172.105.56.225';
const USER = 'root';
const PASS = 'Samshek@1998';
const APP_DIR = '/var/www/Cash-Flow';

const files = [
    'src/app/actions/purchases.ts',
    'src/app/dashboard/runner/purchases/[id]/PurchaseActions.tsx',
    'src/app/dashboard/runner/purchases/[id]/page.tsx'
];

const conn = new Client();
conn.on('ready', () => {
    console.log('Connected via SSH. Initiating SFTP upload...');
    conn.sftp((err, sftp) => {
        if (err) throw err;
        let pending = files.length;
        files.forEach(file => {
            const localPath = `./${file}`;
            const remotePath = `${APP_DIR}/${file}`;
            console.log(`Uploading ${localPath} -> ${remotePath}...`);
            sftp.fastPut(localPath, remotePath, (err) => {
                if (err) console.error(`Failed to upload ${file}:`, err);
                else console.log(`Successfully uploaded ${file}`);
                pending--;
                if (pending === 0) {
                    console.log('All files uploaded. Rebuilding Next.js app and restarting PM2...');
                    conn.exec(`
             cd ${APP_DIR}
             npm run build
             pm2 restart cashflow
           `, (err, stream) => {
                        if (err) { console.error(err); conn.end(); return; }
                        stream.on('data', d => process.stdout.write(d));
                        stream.stderr.on('data', d => process.stderr.write(d));
                        stream.on('close', () => {
                            console.log('\nDeployment completed successfully.');
                            conn.end();
                        });
                    });
                }
            });
        });
    });
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect({ host: SERVER, port: 22, username: USER, password: PASS, readyTimeout: 30000 });
