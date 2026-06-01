const fs = require('fs');
const apiDocs = JSON.parse(fs.readFileSync('api-docs.json', 'utf8'));
const schemas = apiDocs.components?.schemas || {};
const keys = Object.keys(schemas);
console.log("Keys containing 'Bulk':");
keys.forEach(k => {
    if (k.includes('Bulk')) {
        console.log(`- ${k}`);
    }
});
