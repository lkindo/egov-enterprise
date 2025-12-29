
import os

target_path = r'egovframe-template-common-components-5.0.0\script\ddl\postgres\com_DDL_postgres.sql'
source_path = 'generated_comments.sql'

# 1. Read source comments
with open(source_path, 'r', encoding='utf-8') as src:
    comments = src.read()

# 2. Read target DDL
# Try to find the line where comments might have started if re-running
# Originally the file had 5368 lines.
with open(target_path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

# Original file end was at line 5368 (1-indexed)
original_lines = lines[:5368]

# 3. Write back with UTF-8
with open(target_path, 'w', encoding='utf-8-sig') as f: # Use utf-8-sig for better compatibility with some editors
    f.writelines(original_lines)
    f.write('\n\n-- Generated Comments --\n')
    f.write(comments)

print(f"Successfully restored and applied comments to {target_path}")
