const fs = require('fs');
const file = 'api-server/src/test/java/nuri/openapi/RequestResponseSchemaValidationTest.java';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/"password"/g, '"pswd"');
content = content.replace(/"passwordHint"/g, '"pswdHint"');
content = content.replace(/"passwordCnsr"/g, '"pswdCrans"');
fs.writeFileSync(file, content);
console.log('Done');
