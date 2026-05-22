const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// PostgreSQL Config
const config = {
    host: process.env.DB_HOST || '129.154.54.178',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'egovdb',
    user: process.env.DB_USERNAME || 'egov',
    password: process.env.DB_PASSWORD || 'egov123',
};

if (process.env.DB_SSL === 'true') {
    config.ssl = { rejectUnauthorized: false };
}

// 1. Recursive file walker to find Java files
function walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else if (f.endsWith('.java')) {
            callback(dirPath);
        }
    });
}

// 2. Parse Java JPA Entity
function parseJavaEntity(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if it is an @Entity or @MappedSuperclass
    if (!content.includes('@Entity') && !content.includes('@MappedSuperclass')) {
        return null;
    }

    // Get Class Name
    const classMatch = content.match(/(?:public|class)\s+([A-Za-z0-9_]+)/);
    if (!classMatch) return null;
    const className = classMatch[1];

    // Get Table Name
    let tableName = null;
    const tableMatch = content.match(/@Table\s*\(\s*name\s*=\s*["']([^"']+)["']/);
    if (tableMatch) {
        tableName = tableMatch[1];
    } else {
        // secondary table matches
        const secTableMatch = content.match(/@SecondaryTable\s*\(\s*name\s*=\s*["']([^"']+)["']/);
        if (secTableMatch) {
            tableName = secTableMatch[1];
        }
    }

    // If it's BaseEntity, it might not have @Table
    if (!tableName && content.includes('@MappedSuperclass')) {
        tableName = 'MAPPED_SUPERCLASS';
    }

    const fields = [];
    const lines = content.split('\n');

    // Parse fields with @Column
    // Simple state-machine or line-by-line parsing
    let currentColumn = null;
    let currentColumnLength = null;
    let currentColumnNullable = null;

    lines.forEach((line, i) => {
        // @Column(name = "...", length = 20, nullable = false)
        const colMatch = line.match(/@Column\s*\(([^)]+)\)/);
        const colSimpleMatch = line.match(/@Column\s*$/); // or multi-line

        // Check if there is an override or column annotation
        if (colMatch) {
            const colParams = colMatch[1];
            const nameParam = colParams.match(/name\s*=\s*["']([^"']+)["']/);
            const lenParam = colParams.match(/length\s*=\s*(\d+)/);
            const nullParam = colParams.match(/nullable\s*=\s*(true|false)/);

            if (nameParam) {
                currentColumn = nameParam[1];
                if (lenParam) currentColumnLength = parseInt(lenParam[1], 10);
                if (nullParam) currentColumnNullable = nullParam[1] === 'true';
            }
        }

        // Check variable definition
        // private String userNm; or private int count;
        const fieldMatch = line.match(/(?:private|protected|public)\s+([A-Za-z0-9_<>\点]+)\s+([A-Za-z0-9_]+)\s*(?:;|=|;)/);
        if (fieldMatch && currentColumn) {
            fields.push({
                fieldName: fieldMatch[2],
                fieldType: fieldMatch[1],
                columnName: currentColumn,
                length: currentColumnLength,
                nullable: currentColumnNullable,
                line: i + 1
            });
            // Reset for next field
            currentColumn = null;
            currentColumnLength = null;
            currentColumnNullable = null;
        } else if (fieldMatch) {
            // Field without @Column or @Column was not caught
            // Reset state anyway to prevent wrong mappings
            currentColumn = null;
            currentColumnLength = null;
            currentColumnNullable = null;
        }
    });

    // Also look for AttributeOverrides in BaseEntity subclasses
    const overrides = [];
    const overrideBlockMatch = content.match(/@AttributeOverrides\s*\(\s*\{([\s\S]+?)\}\s*\)/);
    if (overrideBlockMatch) {
        const overrideItems = overrideBlockMatch[1].match(/@AttributeOverride\s*\(\s*name\s*=\s*["']([^"']+)["']\s*,\s*column\s*=\s*@Column\s*\(\s*name\s*=\s*["']([^"']+)["']/g);
        if (overrideItems) {
            overrideItems.forEach(item => {
                const parts = item.match(/name\s*=\s*["']([^"']+)["'][\s\S]+?name\s*=\s*["']([^"']+)["']/);
                if (parts) {
                    overrides.push({
                        fieldName: parts[1],
                        columnName: parts[2]
                    });
                }
            });
        }
    }

    return {
        className,
        tableName,
        filePath,
        fields,
        overrides
    };
}

async function run() {
    console.log("Starting DB <-> Java Alignment Audit...");

    // 1. Scan Java files for JPA entities
    const entities = [];
    const dirs = ['api-server', 'business-suite', 'foundation'];
    dirs.forEach(dir => {
        walkDir(path.resolve(dir), (filePath) => {
            const entity = parseJavaEntity(filePath);
            if (entity) {
                entities.push(entity);
            }
        });
    });
    console.log(`Successfully scanned Java entities. Found ${entities.length} JPA entities/superclasses.`);

    // 2. Fetch column definitions from actual physical PostgreSQL database
    const client = new Client(config);
    let dbColumns = [];
    try {
        await client.connect();
        const query = `
            SELECT 
                table_name, 
                column_name, 
                data_type, 
                character_maximum_length, 
                is_nullable
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            ORDER BY table_name, ordinal_position;
        `;
        const res = await client.query(query);
        dbColumns = res.rows;
        console.log(`Fetched ${dbColumns.length} physical columns from database schema.`);
    } catch (err) {
        console.error("Database connection failed:", err.message);
        process.exit(1);
    } finally {
        await client.end();
    }

    // 3. Map physical columns by table
    const dbSchema = {};
    dbColumns.forEach(c => {
        const tbl = c.table_name.toLowerCase();
        if (!dbSchema[tbl]) {
            dbSchema[tbl] = {};
        }
        dbSchema[tbl][c.column_name.toLowerCase()] = {
            columnName: c.column_name,
            dataType: c.data_type,
            maxLength: c.character_maximum_length,
            isNullable: c.is_nullable === 'YES'
        };
    });

    // 4. Perform comparison audits
    const auditReports = {
        missingTables: [],
        mismatchedColumns: [],
        missingJavaFields: [],
        sizeMismatches: []
    };

    entities.forEach(entity => {
        if (!entity.tableName || entity.tableName === 'MAPPED_SUPERCLASS') return;

        const tblNameLower = entity.tableName.toLowerCase();
        const dbTable = dbSchema[tblNameLower];

        // Check A: Table existence
        if (!dbTable) {
            auditReports.missingTables.push({
                className: entity.className,
                tableName: entity.tableName,
                filePath: path.relative(path.resolve('.'), entity.filePath)
            });
            return; // Skip column checks if table doesn't exist in DB
        }

        // Prepopulate mapped columns to detect missing Java mappings later
        const mappedDbCols = new Set();

        // Check B: Compare Java fields mapping
        entity.fields.forEach(field => {
            const dbColLower = field.columnName.toLowerCase();
            const physicalCol = dbTable[dbColLower];

            if (!physicalCol) {
                // Case 1: Entity has @Column but physical column does not exist in DB table
                auditReports.mismatchedColumns.push({
                    className: entity.className,
                    tableName: entity.tableName,
                    fieldName: field.fieldName,
                    columnName: field.columnName,
                    line: field.line,
                    filePath: path.relative(path.resolve('.'), entity.filePath),
                    reason: "Java Entity maps to DB column that does NOT exist physically in the table."
                });
            } else {
                mappedDbCols.add(dbColLower);

                // Case 2: Length limit mismatch (if defined on both sides)
                if (field.length !== null && physicalCol.maxLength !== null) {
                    if (field.length !== physicalCol.maxLength) {
                        auditReports.sizeMismatches.push({
                            className: entity.className,
                            tableName: entity.tableName,
                            fieldName: field.fieldName,
                            columnName: field.columnName,
                            javaLength: field.length,
                            dbLength: physicalCol.maxLength,
                            filePath: path.relative(path.resolve('.'), entity.filePath)
                        });
                    }
                }
            }
        });

        // Handle Overrides (e.g. BaseEntity fields)
        entity.overrides.forEach(ov => {
            const dbColLower = ov.columnName.toLowerCase();
            const physicalCol = dbTable[dbColLower];
            if (physicalCol) {
                mappedDbCols.add(dbColLower);
            } else {
                auditReports.mismatchedColumns.push({
                    className: entity.className,
                    tableName: entity.tableName,
                    fieldName: ov.fieldName,
                    columnName: ov.columnName,
                    filePath: path.relative(path.resolve('.'), entity.filePath),
                    reason: "Java BaseEntity override maps to column that does NOT exist physically."
                });
            }
        });

        // Add common base columns if BaseEntity is used
        // base entity columns: frst_rgtr_id, frst_regist_pnttm, last_mdfr_id, last_updt_pnttm, crt_dt, mdfcn_dt
        const baseCols = ['frst_rgtr_id', 'frst_regist_pnttm', 'last_mdfr_id', 'last_updt_pnttm', 'crt_dt', 'mdfcn_dt'];
        baseCols.forEach(bc => {
            if (dbTable[bc]) {
                mappedDbCols.add(bc);
            }
        });

        // Check C: DB Columns that are NOT mapped in Java Entity at all
        Object.keys(dbTable).forEach(dbColName => {
            // Ignore system columns or auto-generated index columns if any
            if (!mappedDbCols.has(dbColName)) {
                auditReports.missingJavaFields.push({
                    tableName: entity.tableName,
                    className: entity.className,
                    columnName: dbTable[dbColName].columnName,
                    dataType: dbTable[dbColName].dataType,
                    maxLength: dbTable[dbColName].maxLength,
                    filePath: path.relative(path.resolve('.'), entity.filePath)
                });
            }
        });
    });

    // 5. Output Audit Results
    console.log("\n========================================================");
    console.log("            DB <-> Java JPA ALIGNMENT REPORT            ");
    console.log("========================================================\n");

    console.log(`[1] MISSING TABLES IN DATABASE: ${auditReports.missingTables.length}`);
    if (auditReports.missingTables.length > 0) {
        auditReports.missingTables.forEach(t => {
            console.log(`  - Class: ${t.className} refers to missing Table: ${t.tableName}`);
            console.log(`    File: ${t.filePath}`);
        });
    } else {
        console.log("  ✔ All JPA entity tables exist physically in the DB!");
    }

    console.log(`\n[2] ORPHAN JAVA ENTITY COLUMNS (Java references DB column that does not exist): ${auditReports.mismatchedColumns.length}`);
    if (auditReports.mismatchedColumns.length > 0) {
        auditReports.mismatchedColumns.forEach(c => {
            console.log(`  - Table [${c.tableName}] / Class [${c.className}] / Field [${c.fieldName}]`);
            console.log(`    maps to non-existent Column: [${c.columnName}] (Line: ${c.line})`);
            console.log(`    File: ${c.filePath}`);
            console.log(`    Reason: ${c.reason}`);
        });
    } else {
        console.log("  ✔ All @Column mapping definitions refer to valid DB columns!");
    }

    console.log(`\n[3] UNMAPPED DATABASE COLUMNS (DB column exists but not mapped in Java Entity): ${auditReports.missingJavaFields.length}`);
    if (auditReports.missingJavaFields.length > 0) {
        // Group by Table Name for readability
        const groupedMissing = {};
        auditReports.missingJavaFields.forEach(c => {
            if (!groupedMissing[c.tableName]) {
                groupedMissing[c.tableName] = { className: c.className, filePath: c.filePath, cols: [] };
            }
            groupedMissing[c.tableName].cols.push(c);
        });

        Object.keys(groupedMissing).forEach(tbl => {
            const data = groupedMissing[tbl];
            console.log(`  - Table: [${tbl}] (${data.className}) | File: ${data.filePath}`);
            data.cols.forEach(c => {
                console.log(`    * DB Column: [${c.columnName}] | Type: ${c.dataType} (${c.maxLength || 'N/A'})`);
            });
        });
    } else {
        console.log("  ✔ 100% of all physical columns in every entity table are mapped in Java!");
    }

    console.log(`\n[4] COLUMN LENGTH/SIZE MISMATCHES: ${auditReports.sizeMismatches.length}`);
    if (auditReports.sizeMismatches.length > 0) {
        auditReports.sizeMismatches.forEach(c => {
            console.log(`  - Table [${c.tableName}] / Field [${c.fieldName}] / Col [${c.columnName}]`);
            console.log(`    JPA length: ${c.javaLength} vs DB physical limit: ${c.dbLength}`);
            console.log(`    File: ${c.filePath}`);
        });
    } else {
        console.log("  ✔ Character length/size matches completely between JPA and DB!");
    }

    console.log("\n========================================================");
    console.log("                 AUDIT PROCESS COMPLETE                 ");
    console.log("========================================================\n");

    // Save report as a JSON file
    fs.writeFileSync(
        path.resolve('scratch/db_java_alignment_report.json'),
        JSON.stringify(auditReports, null, 2),
        'utf8'
    );
    console.log("Detailed report saved to scratch/db_java_alignment_report.json");
}

run();
