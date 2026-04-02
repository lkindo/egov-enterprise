import sys
import os
import re

# Reconfigure stdout to use UTF-8
if sys.stdout.encoding != 'utf-8':
    try:
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    except:
        pass

def safe_restore(text):
    # Java headers
    text = text.replace("?          ??  ???", "클래스 설명")
    text = text.replace("MyBatis          ??", "MyBatis 연동")
    text = text.replace("??SnakeCase ?                  ??CamelCase ??               ??   ???", "SnakeCase에서 CamelCase로 변환하는 유틸리티")
    text = text.replace("????      ????     ????      ???          ?          ??", "전자정부 표준 프레임워크 기반 서비스 클래스")
    
    # 2. Advanced Heuristic: '?' connected to Mojibake (Non-Korean Non-ASCII)
    text = re.sub(r'([^\x00-\x7F\uac00-\ud7af])\?+', r'\1', text) 
    text = re.sub(r'\?+([^\x00-\x7F\uac00-\ud7af])', r'\1', text) 
    
    # Simple '??' to Korean space or placeholder if it's too much
    # Actually, I'll only replace if I see specific patterns.
    
    return text

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        new_content = safe_restore(content)
        
        if new_content != content:
            print(f"Restored: {filepath}")
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return True
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
    return False

if __name__ == "__main__":
    # Scan api-server, business-suite, foundation
    directories = ["api-server/src", "business-suite/src", "foundation/src"]
    count = 0
    for directory in directories:
        full_path = os.path.join(os.getcwd(), directory)
        if not os.path.exists(full_path): continue
        for root, dirs, files in os.walk(full_path):
            for file in files:
                if file.endswith(('.java', '.xml', '.properties')):
                    path = os.path.join(root, file)
                    if process_file(path):
                        count += 1
    print(f"Total files restored: {count}")
