import os

files = [
    r"api-server\src\main\java\com\company\project\api\controller\backup\BackupApiController.java",
    r"api-server\src\main\java\com\company\project\api\controller\backup\EgovBackupResultController.java"
]

for f in files:
    if os.path.exists(f):
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
            
        lines = content.split('\n')
        new_lines = []
        for line in lines:
            if not line.strip():
                if new_lines and not new_lines[-1].strip():
                    continue
            new_lines.append(line)
            
        with open(f, 'w', encoding='utf-8') as file:
            file.write('\n'.join(new_lines))
        print(f"Cleaned {f}")
