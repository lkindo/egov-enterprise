import os

def remove_bom(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.java'):
                path = os.path.join(root, file)
                try:
                    with open(path, 'rb') as f:
                        content = f.read()
                    if content.startswith(b'\xef\xbb\xbf'):
                        print(f"Removing BOM from: {path}")
                        with open(path, 'wb') as f:
                            f.write(content[3:])
                except Exception as e:
                    print(f"Error processing {path}: {e}")

if __name__ == "__main__":
    for module in ['api-server', 'common-core', 'common-domain', 'common-security', 'common-service']:
        if os.path.exists(module):
            remove_bom(module)
