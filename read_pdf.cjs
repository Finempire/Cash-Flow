const fs = require('fs');
const pdf = require('pdf-parse');
async function run() {
    try {
        const dataBuffer = fs.readFileSync('29755179.pdf');
        console.log(typeof pdf);
        console.log(Object.keys(pdf));
        const data = await pdf(dataBuffer);
        console.log(data.text);
    } catch (e) {
        console.error(e);
    }
}
run();
