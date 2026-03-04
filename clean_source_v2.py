import os
import re
import sys
from pathlib import Path

# Configuration
TARGET_ROOT = r"d:\project\egov-enterprise"
# Modules to process
MODULES = ["api-server", "common-core", "common-domain", "common-security", "common-service", "frontend"]
# Extensions to target
EXTENSIONS = {".java", ".xml", ".yml", ".properties", ".ts", ".tsx", ".js", ".jsx", ".css", ".scss", ".json", ".sh", ".bat"}
# Directories to definitely exclude
EXCLUDE_DIRS_GLOBAL = {".git", ".gradle", "build", "node_modules", ".next", "dist", "out"}

# Special characters to remove
# \ufffd: Replacement character
# \u200b: Zero width space
# \u200c - \u200f: Zero width joiner/non-joiner etc
# \ufeff: Byte Order Mark (BOM)
UNWANTED_CHARS_REGEX = re.compile(r'[\ufffd\u200b\u200c\u200d\u200e\u200f\ufeff]')

def clean_file(file_path):
    try:
        content = None
        detected_encoding = None
        
        # Try different encodings
        for encoding in ['utf-8-sig', 'utf-8', 'cp949', 'euc-kr', 'latin-1']:
            try:
                with open(file_path, 'r', encoding=encoding) as f:
                    content = f.read()
                detected_encoding = encoding
                break
            except UnicodeDecodeError:
                continue
        
        if content is None:
            return False, "Failed to decode"

        original_content = content
        modified = False

        # 1. Remove unwanted invisible characters
        new_content = UNWANTED_CHARS_REGEX.sub('', content)
        
        # 2. Trim trailing whitespace line by line
        lines = new_content.splitlines()
        cleaned_lines = [line.rstrip() for line in lines]
        
        # 3. Standardize line endings and collapse excessive empty lines (3+ -> 2)
        new_content = "\n".join(cleaned_lines)
        new_content = re.sub(r'\n{3,}', '\n\n', new_content)
        
        # 4. Ensure final newline
        if new_content and not new_content.endswith('\n'):
            new_content += '\n'

        if new_content != original_content:
            modified = True
            content = new_content

        # 5. Always save as UTF-8 (no BOM) if encoding was not utf-8 or characters were modified
        if modified or detected_encoding not in ['utf-8']:
            with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
                f.write(content)
            return True, f"Cleaned ({detected_encoding} -> utf-8)"
        
        return False, "Already Clean"

    except Exception as e:
        return False, f"Error: {str(e)}"

def is_excluded(dir_path):
    parts = Path(dir_path).parts
    for exc in EXCLUDE_DIRS_GLOBAL:
        if exc in parts:
            return True
    return False

def main():
    report = []
    total_scanned = 0
    total_modified = 0
    
    print(f"Starting Project Cleanup (UTF-8 + Special Chars + Space)...")
    
    for module in MODULES:
        module_path = os.path.join(TARGET_ROOT, module)
        if not os.path.exists(module_path):
            print(f"Module {module} not found at {module_path}. Skipping.")
            continue
            
        print(f"Processing module: {module}...")
        module_scanned = 0
        module_modifiedCount = 0
        
        for root, dirs, files in os.walk(module_path):
            # Dynamic exclusion logic
            if is_excluded(root):
                continue
                
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in EXTENSIONS:
                    file_path = os.path.join(root, file)
                    total_scanned += 1
                    module_scanned += 1
                    
                    is_modified, msg = clean_file(file_path)
                    if is_modified:
                        total_modified += 1
                        module_modifiedCount += 1
        
        print(f"  - {module} Results: {module_scanned} files scanned, {module_modifiedCount} modified.")

    print("\n" + "="*30)
    print("FINAL CONSOLIDATED REPORT")
    print("="*30)
    print(f"Total Files Scanned:  {total_scanned}")
    print(f"Total Files Modified: {total_modified}")
    print("="*30)

if __name__ == "__main__":
    main()
