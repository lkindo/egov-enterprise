import sys
import json
from graphify.extract import extract
from pathlib import Path

def run():
    detect_path = Path('graphify-out/.graphify_detect.json')
    content = detect_path.read_bytes()
    text = content.decode('utf-16') if content.startswith(b'\xff\xfe') else content.decode('utf-8')
    detect = json.loads(text)
    
    # Filter code files - excluding build artifacts and libraries
    code_files = []
    for f in detect.get('files', {}).get('code', []):
        if any(x in f for x in ['\\bin\\', '\\build\\', '.gradle', 'node_modules', 'jquery']):
            continue
        code_files.append(Path(f))
    
    print(f"Processing {len(code_files)} code files for AST...")
    result = extract(code_files)
    
    output_path = Path('graphify-out/.graphify_ast.json')
    output_path.write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(f"AST Extraction Complete: {len(result['nodes'])} nodes, {len(result['edges'])} edges")

if __name__ == "__main__":
    run()
