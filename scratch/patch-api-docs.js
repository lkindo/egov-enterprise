const fs = require('fs');
const path = require('path');

const filePath = path.resolve('api-docs.json');
if (!fs.existsSync(filePath)) {
    console.error("api-docs.json not found!");
    process.exit(1);
}

const apiDocs = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const targets = ['BulkStatusRequest', 'BulkRoleRequest', 'BulkDeptMoveRequest'];

targets.forEach(t => {
    const schema = apiDocs.components?.schemas?.[t];
    if (schema) {
        if (!schema.required) {
            schema.required = [];
        }
        if (!schema.required.includes('userIds')) {
            schema.required.push('userIds');
            console.log(`Successfully added 'userIds' to required list in ${t}`);
        }
    } else {
        console.warn(`Schema ${t} not found in api-docs.json`);
    }
});

fs.writeFileSync(filePath, JSON.stringify(apiDocs, null, 2), 'utf8');
console.log("api-docs.json patch complete.");
