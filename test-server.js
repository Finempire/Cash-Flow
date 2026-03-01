const fs = require('fs');
const path = require('path');

const targetArtifact = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\0d1719b5-19ed-4c53-b4f7-bee6d3e3f1b4\\cashflow_codebase.md';

const orderedItems = [
    { title: '1. prisma/schema.prisma', files: ['prisma/schema.prisma'] },
    { title: '2. middleware.ts', files: ['middleware.ts'] },
    { title: '3. lib/auth.ts (and auth.config.ts)', files: ['src/lib/auth.ts', 'src/lib/auth.config.ts', 'src/lib/auth-utils.ts'] },
    { title: '4. Global Layout & Components', files: ['src/app/layout.tsx', 'src/app/dashboard/layout.tsx', 'tailwind.config.ts', 'src/app/globals.css'], dir: 'src/components' },
    { title: '5. Dashboard pages', files: ['src/app/dashboard/page.tsx', 'src/app/dashboard/manager/page.tsx', 'src/app/dashboard/runner/page.tsx', 'src/app/dashboard/accountant/page.tsx', 'src/app/dashboard/ceo/page.tsx'] },
    {
        title: '6. Core pages', files: [
            'src/app/dashboard/manager/requests/page.tsx',
            'src/app/dashboard/manager/requests/new/page.tsx',
            'src/app/dashboard/manager/requests/[id]/page.tsx',
            'src/app/dashboard/runner/pending/page.tsx',
            'src/app/dashboard/runner/my-purchases/page.tsx',
            'src/app/dashboard/runner/purchases/[id]/page.tsx',
            'src/app/dashboard/accountant/purchases-review/page.tsx',
            'src/app/dashboard/accountant/payments/page.tsx',
            'src/app/dashboard/accountant/transactions/[id]/page.tsx']
    },
    { title: '7. Server Actions', dir: 'src/app/actions' },
    { title: '8. API Routes', dir: 'src/app/api' },
    { title: '9. Seed file', files: ['prisma/seed.ts'] },
    { title: '10. DEPLOYMENT.md', files: ['DEPLOYMENT.md'] },
];

let markdown = '# Cashflow Complete Codebase\\n\\n';

function getFilesRecursively(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFilesRecursively(file));
        } else {
            if (!file.endsWith('.js') && !file.endsWith('.ts') && !file.endsWith('.tsx') && !file.endsWith('.css') && !file.endsWith('.md')) return;
            results.push(file);
        }
    });
    return results;
}

orderedItems.forEach(item => {
    markdown += `## ${item.title}\\n\\n`;
    let filesToProcess = [];

    if (item.files) {
        filesToProcess = [...item.files];
    }
    if (item.dir) {
        filesToProcess = filesToProcess.concat(getFilesRecursively(item.dir).map(f => f.replace(/\\\\/g, '/')));
    }

    filesToProcess.forEach(file => {
        try {
            const content = fs.readFileSync(file, 'utf8');
            const ext = path.extname(file).replace('.', '');
            markdown += `### \`${file}\`\\n\\n\`\`\`${ext}\\n${content}\\n\`\`\`\\n\\n`;
        } catch (e) {
            console.log("Could not read " + file);
        }
    });
});

fs.writeFileSync(targetArtifact, markdown);
console.log('Artifact updated successfully.');
