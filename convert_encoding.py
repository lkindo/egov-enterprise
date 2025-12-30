import os

def convert_to_utf8(file_path):
    encodings_to_try = ['euc-kr', 'cp949', 'utf-8-sig', 'iso-8859-1']
    
    # First, try to see if it's already valid UTF-8
    try:
        with open(file_path, 'rb') as f:
            content = f.read()
        content.decode('utf-8')
        # print(f"Already UTF-8: {file_path}")
        return
    except UnicodeDecodeError:
        pass

    # If not UTF-8, try other encodings
    for encoding in encodings_to_try:
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
            decoded = content.decode(encoding)
            with open(file_path, 'w', encoding='utf-8', newline='') as f:
                f.write(decoded)
            print(f"Converted ({encoding} -> UTF-8): {file_path}")
            return
        except UnicodeDecodeError:
            continue
    
    print(f"FAILED to convert: {file_path}")

def main():
    for root, dirs, files in os.walk('.'):
        if '.git' in dirs: dirs.remove('.git')
        if '.gradle' in dirs: dirs.remove('.gradle')
        if 'node_modules' in dirs: dirs.remove('node_modules')
        
        for file in files:
            if file.endswith('.java'):
                full_path = os.path.join(root, file)
                convert_to_utf8(full_path)

if __name__ == "__main__":
    main()
