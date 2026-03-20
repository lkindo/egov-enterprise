const fs = require('fs');
const path = require('path');

const srcDir = 'd:/project/egov-enterprise/frontend/src/app/admin';

const replacements = [
    // 1. HubHeader Replacement
    {
        pattern: /<div className="flex flex-col md:flex-row items-center justify-between pb-10 border-b-2 border-slate-100 gap-10 ">\s*<div className="flex items-center gap-6">\s*<div className="w-16 h-16 bg-slate-900 rounded-\[2rem\] flex items-center justify-center shadow-2xl skew-y-1 hover:rotate-6 transition-transform duration-500">\s*<(\w+) size=\{32\} className="text-white" \/>\s*<\/div>\s*<div className="space-y-1">\s*<h2 className="text-(?:\[34\]xl|4xl) font-black text-slate-900 tracking-tighter leading-none">\s*(.+?) <span className="text-primary ">(.+?)<\/span> Hub\s*<\/h2>\s*<p className="text-\[10px\] font-black text-slate-400 tracking-\[0\.4em\] mt-2">\s*(.+?)\s*<\/p>\s*<\/div>\s*<\/div>/gs,
        replacement: (match, icon, title, highlight, subtitle) => {
            return `<HubHeader title="${title.trim()}" highlight="${highlight.trim()}" subtitle="${subtitle.trim()}" icon={<${icon} size={32} />} />`;
        },
        addImport: "import { HubHeader } from '@/components/ui/hub/HubHeader';"
    },
    // 2. Summary Card Replacement
    {
        pattern: /<div className="grid grid-cols-1 md:grid-cols-4 gap-6">\s*<SummaryCard title="(.+?)" value=(.+?) icon={<(.+?) \/>} color="(.+?)" \/>\s*<SummaryCard title="(.+?)" value=(.+?) icon={<(.+?) \/>} color="(.+?)" \/>\s*<SummaryCard title="(.+?)" value=(.+?) icon={<(.+?) \/>} color="(.+?)" \/>\s*<SummaryCard title="(.+?)" value=(.+?) icon={<(.+?) \/>} color="(.+?)" \/>\s*<\/div>/gs,
        replacement: (match, t1, v1, i1, c1, t2, v2, i2, c2, t3, v3, i3, c3, t4, v4, i4, c4) => {
            const vMap = { indigo: 'indigo', emerald: 'emerald', slate: 'slate', primary: 'primary' };
            return `<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StandardSummaryCard title="${t1}" value=${v1} icon={<${i1} />} variant="${vMap[c1] || 'blue'}" />
        <StandardSummaryCard title="${t2}" value=${v2} icon={<${i2} />} variant="emerald" />
        <StandardSummaryCard title="${t3}" value=${v3} icon={<${i3} />} variant="muted" />
        <StandardSummaryCard title="${t4}" value=${v4} icon={<${i4} />} variant="primary" />
      </div>`;
        },
        addImport: "import { StandardSummaryCard } from '@/app/components/ui/standard-summary-card';"
    },
    // 3. Search Input Replacement
    {
        pattern: /<div className="relative">\s*<Search className="absolute left-3 top-1\/2 -translate-y-1\/2 text-muted-foreground" size=\{18\} \/>\s*<Input\s+placeholder="(.+?)"\s+value=(.+?)\s+onChange=(.+?)\s+className="pl-10 h-(?:10|12) rounded-(?:xl|2xl) border-2 shadow-sm font-bold"\s*\/>\s*<\/div>/gs,
        replacement: (match, placeholder, value, onChange) => {
            return `<PremiumSearchInput placeholder="${placeholder}" value=${value} onChange=${onChange} />`;
        },
        addImport: "import { PremiumSearchInput } from '@/components/ui/premium-search-input';"
    },
    // 4. Table Layout Class Replacement
    {
        pattern: /className=["']bg-white rounded-\[3\.5rem\] p-4 lg:p-12 border shadow-2xl relative overflow-hidden group\/\w+ ring-1 ring-slate-100["']/g,
        replacement: 'className="hub-table-container"'
    },
    {
        pattern: /className=["']bg-card border-2 border-border p-12 rounded-\[3\.5rem\] shadow-sm relative overflow-hidden group["']/g,
        replacement: 'className="hub-table-container"'
    }
];

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    let importsToAdd = new Set();

    replacements.forEach(r => {
        if (r.pattern.test(content)) {
            content = content.replace(r.pattern, r.replacement);
            if (r.addImport) importsToAdd.add(r.addImport);
        }
    });

    if (content !== original) {
        // Simple Import Injector (before the first import or at top)
        importsToAdd.forEach(imp => {
            if (!content.includes(imp)) {
                // Find first import line
                const firstImport = content.match(/import /);
                if (firstImport) {
                    content = content.replace(/import /, imp + '\nimport ');
                } else {
                    content = imp + '\n' + content;
                }
            }
        });
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Refactored: ${filePath}`);
    }
}

function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) walk(filePath);
        else if (file.endsWith('.tsx')) processFile(filePath);
    });
}

console.log('Starting global refactoring on /admin...');
walk(srcDir);
console.log('Global refactoring complete.');
