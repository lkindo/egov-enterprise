const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = 'd:\\project\\egov-enterprise';
const DB_BRIDGE_PATH = path.join(PROJECT_ROOT, '.agent', 'scripts', 'db-bridge.js');

// Helper to run query via db-bridge
function runQuery(sql) {
  const tempFile = path.join(PROJECT_ROOT, 'scratch', 'temp_query.sql');
  try {
    fs.writeFileSync(tempFile, sql, 'utf-8');
    const cmd = `node "${DB_BRIDGE_PATH}" --file "${tempFile}" --json`;
    const out = execSync(cmd, { cwd: PROJECT_ROOT, encoding: 'utf-8' });
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    return JSON.parse(out);
  } catch (e) {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    console.error('Query failed:', sql, e.message);
    return [];
  }
}

// 1. Get DB Tables & Columns
console.log('Retrieving DB Schema from PostgreSQL...');
const dbColumns = runQuery(`
  SELECT table_name, column_name, data_type 
  FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name LIKE 'tb_%'
`);

const dbSchema = {};
for (const col of dbColumns) {
  const tbl = col.table_name.toLowerCase();
  if (!dbSchema[tbl]) dbSchema[tbl] = {};
  dbSchema[tbl][col.column_name.toLowerCase()] = col.data_type;
}

console.log(`Loaded ${Object.keys(dbSchema).length} tables from DB.`);

// 2. Scan JPA Entities
function findJavaFiles(dir) {
  const results = [];
  function walk(d) {
    if (!fs.existsSync(d)) return;
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.java')) results.push(full);
    }
  }
  walk(dir);
  return results;
}

const javaFiles = findJavaFiles(PROJECT_ROOT);
const entities = {};
const mappers = [];
const dtos = {};

for (const file of javaFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  
  // Is Entity?
  if (content.includes('@Entity')) {
    const classNameMatch = content.match(/public class (\w+)/);
    const tblMatch = content.match(/@Table\(\s*name\s*=\s*"([^"]+)"/);
    if (classNameMatch) {
      const className = classNameMatch[1];
      const tableName = tblMatch ? tblMatch[1].toLowerCase() : `tb_${className.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()}`;
      
      // Parse Fields & Column Annotations
      const fields = [];
      const lines = content.split('\n');
      let currentAnnotations = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('@')) {
          currentAnnotations.push(line);
        } else if (line.match(/(?:private|protected|public)\s+[\w<>]+\s+(\w+)\s*[;=]/)) {
          const fieldName = line.match(/(?:private|protected|public)\s+[\w<>]+\s+(\w+)\s*[;=]/)[1];
          
          // Check if this field should be ignored (JPA mappings or transient)
          let shouldIgnore = false;
          let colName = null;
          
          for (const ann of currentAnnotations) {
            if (ann.startsWith('@Transient') || 
                ann.startsWith('@OneToMany') || 
                ann.startsWith('@ManyToMany') || 
                ann.startsWith('@EmbeddedId')) {
              shouldIgnore = true;
              break;
            }
            const nameMatch = ann.match(/(?:Column|JoinColumn)\(.*name\s*=\s*"([^"]+)"/);
            if (nameMatch) {
              colName = nameMatch[1];
            }
          }
          
          if (!shouldIgnore) {
            if (!colName) {
              // Default JPA Naming Strategy: camelCase to snake_case
              colName = fieldName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
            }
            fields.push({ fieldName, columnName: colName.toLowerCase(), line: i + 1 });
          }
          currentAnnotations = [];
        } else if (line.startsWith('public class') || line.startsWith('public interface')) {
          currentAnnotations = [];
        }
      }
      
      entities[className] = {
        tableName,
        fields,
        file: file.replace(PROJECT_ROOT, '')
      };
    }
  }
  
  // Is MapStruct Mapper?
  if (content.includes('@Mapper')) {
    const classNameMatch = content.match(/public interface (\w+)/);
    if (classNameMatch) {
      const className = classNameMatch[1];
      // Extract @Mapping mappings
      const mappingRegex = /@Mapping\(\s*target\s*=\s*"([^"]+)"\s*,\s*source\s*=\s*"([^"]+)"/g;
      let match;
      const mappings = [];
      while ((match = mappingRegex.exec(content)) !== null) {
        mappings.push({ target: match[1], source: match[2] });
      }
      mappers.push({ className, mappings, file: file.replace(PROJECT_ROOT, '') });
    }
  }

  // Is DTO?
  if (file.endsWith('Dto.java') || file.endsWith('Request.java') || file.endsWith('Response.java') || file.endsWith('VO.java')) {
    const classNameMatch = content.match(/public (?:class|record)\s+(\w+)/);
    if (classNameMatch) {
      const className = classNameMatch[1];
      const fields = [];
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const fieldMatch = line.match(/(?:private|protected|public)\s+[\w<>]+\s+(\w+)\s*[;=]/) || line.match(/(\w+)\s*(?:,|\))/);
        // exclude keywords
        if (fieldMatch && !['class', 'interface', 'record', 'return', 'package', 'import'].includes(fieldMatch[1])) {
          // Simple validation
          if (line.includes('private') || line.includes('public') || file.endsWith('Request.java')) {
            fields.push(fieldMatch[1]);
          }
        }
      }
      dtos[className] = { fields, file: file.replace(PROJECT_ROOT, '') };
    }
  }
}

// 3. Diagnose DB ↔ JPA Entity Mismatches
console.log('\n--- Analyzing DB ↔ JPA Entity Mismatches ---');
const entityMismatches = [];
for (const [entityName, entityInfo] of Object.entries(entities)) {
  const tbl = entityInfo.tableName;
  const dbFields = dbSchema[tbl];
  if (!dbFields) {
    console.log(`⚠ Table ${tbl} not found in DB schema (Entity: ${entityName})`);
    continue;
  }
  
  for (const f of entityInfo.fields) {
    if (!dbFields[f.columnName]) {
      entityMismatches.push({
        entityName,
        tableName: tbl,
        fieldName: f.fieldName,
        columnName: f.columnName,
        file: entityInfo.file,
        line: f.line
      });
    }
  }
}
console.log(`Found ${entityMismatches.length} DB ↔ Entity Mismatches.`);

// 4. Analyze MapStruct Force Mappings (Where target != source)
console.log('\n--- Analyzing MapStruct Force Mappings ---');
const forceMappings = [];
for (const map of mappers) {
  for (const mapping of map.mappings) {
    // extract base property name (remove prefixes like request.)
    const cleanTarget = mapping.target.replace(/^.*\./, '');
    const cleanSource = mapping.source.replace(/^.*\./, '');
    if (cleanTarget !== cleanSource) {
      forceMappings.push({
        mapperName: map.className,
        target: mapping.target,
        source: mapping.source,
        file: map.file
      });
    }
  }
}
console.log(`Found ${forceMappings.length} Force Mappings in MapStruct.`);

// 5. Scan Frontend Types & Services for Legacy References
console.log('\n--- Scanning Frontend Files for Legacy References ---');
const FE_DIR = path.join(PROJECT_ROOT, 'frontend', 'src');
const feFiles = [];
function walkFe(d) {
  if (!fs.existsSync(d)) return;
  const entries = fs.readdirSync(d, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(d, e.name);
    if (e.isDirectory()) {
      if (e.name !== 'node_modules' && e.name !== '.next') walkFe(full);
    } else if (e.name.endsWith('.ts') || e.name.endsWith('.tsx')) {
      feFiles.push(full);
    }
  }
}
walkFe(FE_DIR);

const legacyKeywords = [
  'rdcnt', 'nttCn', 'frstRegistPnttm', 'ntcrNm', 
  'replyLc', 'qestnSj', 'answerCn', 
  'createdDate', 'lastModifiedDate', 'useAt', 'inqireCo',
  'qnaStatus', 'qnaCategory', 'eventDate'
];

const feLegacyReferences = [];
for (const file of feFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const kw of legacyKeywords) {
      // Regex boundary check to avoid substring match
      const regex = new RegExp(`\\b${kw}\\b`);
      if (regex.test(line) && !line.includes('*') && !line.includes('//')) {
        feLegacyReferences.push({
          file: file.replace(PROJECT_ROOT, ''),
          line: i + 1,
          keyword: kw,
          content: line.trim()
        });
      }
    }
  }
}
console.log(`Found ${feLegacyReferences.length} legacy field references in Frontend files.`);

// Summarize and Write Output
const summary = {
  dbEntityMismatches: entityMismatches,
  mapstructForceMappings: forceMappings,
  feLegacyReferences: feLegacyReferences
};

fs.writeFileSync(
  path.join(PROJECT_ROOT, 'scratch', 'omnibus-analysis-report.json'),
  JSON.stringify(summary, null, 2)
);
console.log('\nWritten report to scratch/omnibus-analysis-report.json');
