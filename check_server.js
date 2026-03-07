const { Client } = require('ssh2');

const SERVER = '172.105.56.225';
const USER = 'root';
const PASS = 'Samshek@1998';

const conn = new Client();
conn.on('ready', () => {
    console.log('Connected via SSH. Running Next.js build...');
    conn.exec('cd /var/www/Cash-Flow && npm run build', (err, stream) => {
        if (err) { console.error(err); conn.end(); return; }
        stream.on('data', d => process.stdout.write(d));
        stream.stderr.on('data', d => process.stderr.write(d));
        stream.on('close', () => {
            conn.end();
        });
    });
}).on('error', (err) => {
    console.error('SSH Error:', err);
}).connect({ host: SERVER, port: 22, username: USER, password: PASS, readyTimeout: 30000 });
