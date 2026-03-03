import os
import re

dirs = ["api-server", "common-service"]
pattern = re.compile(r'([^@*])?private\s+(final\s+)?(org\.egovframe\.rte\.fdl\.idgnr\.)?EgovIdGnrService\s+(\w+)\s*;')

for d in dirs:
    for root, _, files in os.walk(d):
        if "build" in root:
            continue
        for f in files:
            if f.endswith(".java"):
                file_path = os.path.join(root, f)
                with open(file_path, 'r', encoding='utf-8') as file:
                    content = file.read()
                
                # Check if it has EgovIdGnrService but no @Qualifier above it...
                # Simpler: just replace everything, but first stip out all @Qualifier("...") private final Egov...
                # to avoid duplicates.
                
                stripped_content = re.sub(r'@(?:org\.springframework\.beans\.factory\.annotation\.)?Qualifier\("[^"]+"\)\s*(?:@\w+\s*)*private\s+(final\s+)?(?:org\.egovframe\.rte\.fdl\.idgnr\.)?EgovIdGnrService', r'private \1EgovIdGnrService', content)
                stripped_content = stripped_content.replace('private finalEgovIdGnrService', 'private final EgovIdGnrService')
                stripped_content = stripped_content.replace('private EgovIdGnrService', 'private EgovIdGnrService')

                # Now add it back properly to ALL private (final) EgovIdGnrService
                new_content = re.sub(r'private\s+(final\s+)?(?:org\.egovframe\.rte\.fdl\.idgnr\.)?EgovIdGnrService\s+(\w+)\s*;', r'@org.springframework.beans.factory.annotation.Qualifier("\2") private \1EgovIdGnrService \2;', stripped_content)
                
                if new_content != content:
                    with open(file_path, 'w', encoding='utf-8') as file:
                        file.write(new_content)
                    print(f"Updated {file_path}")
