
import re

sql_file = r'd:\project\egov-enterprise\legacy\egovframe-template-common-components-5.0.0\script\dml\postgres\com_DML_postgres.sql'
output_file = r'd:\project\egov-enterprise\nmenuinfo_restore.sql'

with open(sql_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Find all INSERT INTO NMENUINFO statements
# They might span multiple lines or be single line
matches = re.findall(r"INSERT INTO NMENUINFO.*?;", content, re.DOTALL | re.IGNORECASE)

with open(output_file, 'w', encoding='utf-8') as f:
    for match in matches:
        # Clean up newlines within the statement for easier processing
        cleaned = re.sub(r'\s+', ' ', match).strip()
        f.write(cleaned + '\n')

print(f"Extracted {len(matches)} statements to {output_file}")
