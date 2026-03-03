import csv
import sys

def find_uncovered(csv_file):
    classes = []
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            pkg = row['PACKAGE']
            cls = row['CLASS']
            instr_missed = int(row['INSTRUCTION_MISSED'])
            instr_covered = int(row['INSTRUCTION_COVERED'])
            total = instr_missed + instr_covered
            
            if instr_covered == 0 and total > 0:
                classes.append((pkg, cls, total))

    # Sort by total instructions (missed) descending
    classes.sort(key=lambda x: x[2], reverse=True)

    print(f"{'PACKAGE':<40} | {'CLASS':<40} | {'INSTR':<10}")
    print("-" * 95)
    for p, c, t in classes[:50]:
        print(f"{p[:40]:<40} | {c[:40]:<40} | {t:>10}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python find_uncovered.py <csv_file>")
    else:
        find_uncovered(sys.argv[1])
