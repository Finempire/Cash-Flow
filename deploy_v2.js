const { Client } = require('ssh2');
const fs = require('fs');

const SERVER = '172.105.56.225';
const USER = 'root';
const PASS = 'Samshek@1998';
const APP_DIR = '/var/www/Cash-Flow';

const conn = new Client();
conn.on('ready', () => {
    console.log('Connected via SSH. Initiating SFTP upload...');
    conn.sftp((err, sftp) => {
        if (err) throw err;

        console.log('Uploading update.zip...');
        sftp.fastPut('./update.zip', `${APP_DIR}/update.zip`, (err) => {
            if (err) {
                console.error('Failed to upload update.zip:', err);
                conn.end();
                return;
            }
            console.log('Successfully uploaded update.zip. Executing remote commands...');

            conn.exec(`
                apt-get update -y && apt-get install -y unzip
                cd ${APP_DIR}
                unzip -o update.zip
                rm update.zip
                npx prisma generate
                npx prisma db push --accept-data-loss
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
        });
    });
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect({ host: SERVER, port: 22, username: USER, password: PASS, readyTimeout: 60000 });
