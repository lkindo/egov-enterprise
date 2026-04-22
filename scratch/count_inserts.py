import re
from collections import Counter

file_path = r"D:\project\egov-enterprise\dump\supabase_full.sql"
counts = Counter()
current_table = None

with open(file_path, 'r', encoding='utf-8') as f:
    for line in f:
        if line.startswith("COPY "):
            match = re.search(r"COPY (?:public\.)?(\w+)", line)
            if match:
                current_table = match.group(1).lower()
                continue
        
        if line.strip() == r"\.":
            current_table = None
            continue
            
        if current_table:
            counts[current_table] += 1

for table, count in sorted(counts.items()):
    print(f"{table}: {count}")
