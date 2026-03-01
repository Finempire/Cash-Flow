const { Client } = require('ssh2');

const SERVER = '172.105.56.225';
const USER = 'root';
const PASS = 'Samshek@1998';

function run() {
    const conn = new Client();
    conn.on('ready', () => {
        conn.exec('tail -n 100 /root/.pm2/logs/cashflow-out.log /root/.pm2/logs/cashflow-error.log', (err, stream) => {
            if (err) throw err;
            stream.on('data', d => process.stdout.write(d.toString()));
            stream.stderr.on('data', d => process.stderr.write(d.toString()));
            stream.on('close', () => conn.end());
        });
    });
    conn.connect({ host: SERVER, port: 22, username: USER, password: PASS, readyTimeout: 10000 });
}
run();
