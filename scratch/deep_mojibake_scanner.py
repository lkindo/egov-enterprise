import os
import re

def check_mojibake(file_path):
    issues = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            for i, line in enumerate(lines):
                # ASCII (0-127) and Korean (AC00-D7A3) are OK.
                # Anything else might be Mojibake.
                # Also check for common Mojibake markers like ??
                if re.search(r'[^\x00-\x7f가-힣ㄱ-ㅎㅏ-ㅣ\s\d\w\.,\(\)\{\}\[\]\/\*=@_;\':!#%&\"\"\+\-\^\|\?\:\<\>\~\\$₩]', line):
                    issues.append((i + 1, line.strip()))
                elif '??' in line and '//' in line:
                    issues.append((i + 1, line.strip()))
    except Exception as e:
        issues.append((0, f"Error reading file: {str(e)}"))
    return issues

root_dir = r'D:\project\egov-enterprise'
exclude_dirs = {'.git', '.gradle', '.settings', 'bin', 'build', 'target', 'node_modules', 'frontend'}

print(f"Starting deep scan for Mojibake in {root_dir}...")
found_count = 0
for root, dirs, files in os.walk(root_dir):
    dirs[:] = [d for d in dirs if d not in exclude_dirs]
    for file in files:
        if file.endswith('.java'):
            full_path = os.path.join(root, file)
            problems = check_mojibake(full_path)
            if problems:
                # Filter out emojis and known safe special characters
                real_problems = []
                for ln, content in problems:
                    if '⚠️' in content or '✅' in content or '❌' in content:
                        continue
                    real_problems.append((ln, content))
                
                if real_problems:
                    found_count += 1
                    print(f"\n[FILE] {full_path}")
                    for ln, content in real_problems:
                        print(f"  L{ln}: {content}")

if found_count == 0:
    print("\nNo Mojibake found! All files are clean.")
else:
    print(f"\nTotal files with potential issues: {found_count}")
