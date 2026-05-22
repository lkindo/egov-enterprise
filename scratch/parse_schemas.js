const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'api-docs.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const schemas = data.components?.schemas || {};
console.log('Total schemas:', Object.keys(schemas).length);

// 몇 가지 스키마의 키와 구조를 출력해봅니다.
const sampleKeys = Object.keys(schemas).slice(0, 5);
for (const key of sampleKeys) {
  console.log(`\n--- Schema: ${key} ---`);
  console.log(JSON.stringify(schemas[key], null, 2).slice(0, 500));
}
