import os

db_schema_path = "scratch/db_schema_utf8.txt"
output_sql = "scratch/migrate_chars.sql"

def get_lines():
    try:
        with open(db_schema_path, 'r', encoding='utf-8') as f:
            return f.readlines()
    except UnicodeDecodeError:
        with open(db_schema_path, 'r', encoding='utf-16') as f:
            return f.readlines()

lines = get_lines()
sql_lines = ["BEGIN;"]

for line in lines:
    if "|" in line and "table_name" not in line and "---" not in line:
        parts = [p.strip() for p in line.split("|")]
        if len(parts) >= 4:
            table = parts[0]
            column = parts[1]
            dtype = parts[2]
            length = parts[3]
            
            if dtype == "character":
                # Convert fixed character to varchar
                if not length:
                    length = "255" # Fallback
                sql_lines.append(f"ALTER TABLE {table} ALTER COLUMN {column} TYPE varchar({length}) USING {column}::varchar({length});")

sql_lines.append("COMMIT;")

with open(output_sql, 'w', encoding='utf-8') as f:
    f.write("\n".join(sql_lines))

print(f"Generated {len(sql_lines)-2} ALTER commands in {output_sql}")
