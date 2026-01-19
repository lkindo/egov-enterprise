
try:
    with open('startup.txt', 'r', encoding='utf-16') as f:
        lines = f.readlines()
except UnicodeError:
    try:
        with open('startup.txt', 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except UnicodeError:
        with open('startup.txt', 'r', encoding='cp949') as f:
            lines = f.readlines()

found_exception = False
for i, line in enumerate(lines):
    if "Exception" in line or "Caused by" in line:
        print(f"Line {i}: {line.strip()}")
        found_exception = True
        # Print next 5 lines for context
        for j in range(1, 6):
            if i + j < len(lines):
                print(f"    {lines[i+j].strip()}")

if not found_exception:
    print("No Exception or Caused by found.")
    # Print last 20 lines to see what happened
    print("Last 20 lines:")
    for line in lines[-20:]:
        print(line.strip())
