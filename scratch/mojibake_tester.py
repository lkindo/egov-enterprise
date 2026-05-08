import sys
import os

# 표준 출력을 UTF-8로 설정 (윈도우 터미널 대응)
sys.stdout.reconfigure(encoding='utf-8')

def try_recovery(text):
    combinations = [
        ('utf-8', 'cp949'),
        ('iso-8859-1', 'utf-8'),
        ('cp949', 'utf-8'),
        ('latin1', 'utf-8'),
    ]
    
    results = []
    for enc, dec in combinations:
        try:
            res = text.encode(enc).decode(dec)
            results.append((f"{enc} -> {dec}", res))
        except Exception as e:
            results.append((f"{enc} -> {dec}", f"Error: {e}"))
    return results

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 깨진 부분이 있는 라인만 추출하여 테스트
    broken_line = ""
    for line in content.splitlines():
        if "€" in line or "명꽣" in line:
            broken_line = line
            break
    
    if not broken_line:
        print("Broken line not found.")
        return

    print(f"Original Line: {broken_line}\n")
    
    recoveries = try_recovery(broken_line)
    for label, res in recoveries:
        print(f"[{label}]: {res}")

if __name__ == "__main__":
    target = r"D:\project\egov-enterprise\business-suite\src\main\java\nuri\business\service\deptjob\EgovDeptJobService.java"
    process_file(target)
