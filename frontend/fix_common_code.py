import os

file_path = '../foundation/src/main/java/nuri/foundation/domain/code/CommonCode.java'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('name = "CODE_ID"', 'name = "CD_ID"')
content = content.replace('name = "CODE"', 'name = "DTL_CD"')
content = content.replace('name = "CODE_NM"', 'name = "DTL_CD_NM"')
content = content.replace('name = "CODE_DC"', 'name = "DTL_CD_EXPLN"')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
