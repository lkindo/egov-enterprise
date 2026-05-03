import chardet
import os

def check_encoding(file_path):
    with open(file_path, 'rb') as f:
        raw_data = f.read(10000)
        result = chardet.detect(raw_data)
        print(f"{file_path}: {result}")

files_to_check = [
    r'd:\project\egov-enterprise\frontend\src\types\generated-api.d.ts',
    r'd:\project\egov-enterprise\frontend\src\services\foundation\system\LogAdminService.ts',
    r'd:\project\egov-enterprise\frontend\src\services\foundation\system\LoginPolicyAdminService.ts'
]

for file_path in files_to_check:
    if os.path.exists(file_path):
        check_encoding(file_path)
    else:
        print(f"{file_path} not found")
