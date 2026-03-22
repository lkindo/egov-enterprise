import os

e2e_dir = 'frontend/e2e'
count = 0
for fname in os.listdir(e2e_dir):
    if fname.endswith('.spec.ts'):
        fpath = os.path.join(e2e_dir, fname)
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
        new_content = content.replace("waitUntil: 'networkidle'", "waitUntil: 'domcontentloaded'")
        new_content = new_content.replace("waitForLoadState('networkidle')", "waitForLoadState('domcontentloaded')")
        if new_content != content:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            count += 1
            print(f'Updated: {fname}')
print(f'Total: {count} files updated')
