import json
import os

file_path = r"C:\Users\lkind\.gemini\antigravity\brain\b1932843-6189-41b2-844b-4bc818c1116c\.system_generated\steps\4282\output.txt"
with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

with open('all_tables.txt', 'w', encoding='utf-8') as out:
    for table in data.get('tables', []):
        out.write(f"Table: {table['name']}\n")
        for col in table.get('columns', []):
            out.write(f"  Column: {col['name']}\n")
