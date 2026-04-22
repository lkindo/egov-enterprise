import re
import os

db_schema_path = "scratch/db_schema_utf8.txt"
entities_list_path = "scratch/entities_list.txt"

# 1. Parse DB Schema
db_schema = {}
try:
    with open(db_schema_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
except UnicodeDecodeError:
    with open(db_schema_path, 'r', encoding='utf-16') as f:
        lines = f.readlines()
    for line in lines:
        if "|" in line and "table_name" not in line and "---" not in line:
            parts = [p.strip() for p in line.split("|")]
            if len(parts) >= 4:
                table = parts[0].lower()
                column = parts[1].lower()
                dtype = parts[2].lower()
                precision = parts[4].strip() if len(parts) > 4 else ""
                scale = parts[5].strip() if len(parts) > 5 else ""
                
                if table not in db_schema:
                    db_schema[table] = {}
                db_schema[table][column] = {
                    'type': dtype,
                    'precision': precision,
                    'scale': scale
                }

# 2. Parse Entities
entity_mismatches = []

def parse_java_entity(file_path):
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Get Table Name
    table_match = re.search(r'@Table\(name\s*=\s*"(.*?)"', content)
    if not table_match:
        # Fallback to class name if no @Table
        class_match = re.search(r'public class (\w+)', content)
        table_name = class_match.group(1).lower() if class_match else None
    else:
        table_name = table_match.group(1).lower()
    
    if not table_name:
        return

    # Find all field-like blocks
    fields = []
    
    # Pattern to find @Column and the field below it
    column_pattern = re.compile(r'@Column\((.*?)\)\s*(?:@.*?\s*)*(?:private|protected|public)\s+([\w\.<>\[\]]+)\s+(\w+);', re.DOTALL)
    for match in column_pattern.finditer(content):
        col_attrs = match.group(1)
        java_type = match.group(2)
        field_name = match.group(3)
        
        col_name_match = re.search(r'name\s*=\s*"(.*?)"', col_attrs)
        col_name = col_name_match.group(1).lower() if col_name_match else field_name.lower()
        fields.append({'col_name': col_name, 'java_type': java_type, 'field_name': field_name})

    # Pattern to find fields without @Column
    found_fields = [f['field_name'] for f in fields]
    field_pattern = re.compile(r'(?:private|protected|public)\s+([\w\.<>\[\]]+)\s+(\w+);')
    for match in field_pattern.finditer(content):
        java_type = match.group(1)
        field_name = match.group(2)
        if field_name not in found_fields and java_type not in ['static', 'final', 'transient', 'class']:
            fields.append({'col_name': field_name.lower(), 'java_type': java_type, 'field_name': field_name})

    return table_name, fields

# 3. Compare
with open(entities_list_path, 'r', encoding='utf-16') as f:
    try:
        entity_files = [line.strip() for line in f if line.strip()]
    except UnicodeError:
        with open(entities_list_path, 'r', encoding='utf-8') as f2:
            entity_files = [line.strip() for line in f2 if line.strip()]

type_map = {
    'long': ['bigint', 'numeric'],
    'long': ['bigint', 'numeric'],
    'integer': ['integer', 'numeric', 'int4'],
    'int': ['integer', 'numeric', 'int4'],
    'string': ['character varying', 'text', 'character', 'bpchar'],
    'localdatetime': ['timestamp without time zone', 'timestamp'],
    'localdate': ['date'],
    'boolean': ['boolean', 'character varying', 'character'], # sometimes mapped to Y/N
    'double': ['numeric', 'double precision'],
    'bigdecimal': ['numeric'],
    'byte[]': ['bytea', 'oid'],
}

report = []

for entity_file in entity_files:
    result = parse_java_entity(entity_file)
    if not result: continue
    table_name, fields = result
    
    if table_name not in db_schema:
        report.append(f"Table '{table_name}' not found in DB (Entity: {os.path.basename(entity_file)})")
        continue
    
    db_cols = db_schema[table_name]
    for field in fields:
        col_name = field['col_name']
        java_type = field['java_type'].lower()
        
        if col_name not in db_cols:
            # Check if it's a transient field or relation (simplified)
            continue
            
        db_type = db_cols[col_name]['type']
        
        # Check if matched
        matched = False
        if java_type in type_map:
            if db_type in type_map[java_type]:
                # Specific check for numeric vs bigint/integer which causes Hibernate validation errors
                if db_type == 'numeric' and java_type in ['long', 'integer', 'int']:
                    # Hibernate expects numeric to be BigDecimal or specifically mapped
                    # but it often works at runtime if ddl-auto is none.
                    # HOWEVER, Hibernate validate will FAIL if it expects bigint but finds numeric.
                    report.append(f"[WARNING] Table '{table_name}', Column '{col_name}': Java {field['java_type']} vs DB {db_type} (Potential Hibernate Validate Failure)")
                matched = True
        
        if not matched:
            report.append(f"[MISMATCH] Table '{table_name}', Column '{col_name}': Java {field['java_type']} vs DB {db_type}")

with open("scratch/type_mismatch_report.txt", "w", encoding="utf-8") as f:
    for line in report:
        f.write(line + "\n")
