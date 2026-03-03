import csv
import sys

def analyze(csv_file, filter_pkg=None):
    packages = {}
    classes = []
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            pkg = row['PACKAGE']
            cls = row['CLASS']
            instr_missed = int(row['INSTRUCTION_MISSED'])
            instr_covered = int(row['INSTRUCTION_COVERED'])
            total = instr_missed + instr_covered
            
            if pkg not in packages:
                packages[pkg] = {'missed': 0, 'covered': 0}
            packages[pkg]['missed'] += instr_missed
            packages[pkg]['covered'] += instr_covered
            
            if not filter_pkg or pkg == filter_pkg:
                pct = (instr_covered / total * 100) if total > 0 else 0
                classes.append((pkg, cls, pct))

    if filter_pkg:
        print(f"Details for package: {filter_pkg}")
        print(f"{'CLASS':<60} | {'COVERAGE':<10}")
        print("-" * 75)
        for p, c, pct in sorted(classes, key=lambda x: x[2], reverse=True):
            print(f"{c:<60} | {pct:>8.2f}%")
    else:
        print(f"{'PACKAGE':<60} | {'COVERAGE':<10}")
        print("-" * 75)
        total_missed = 0
        total_covered = 0
        for pkg, data in sorted(packages.items()):
            total = data['missed'] + data['covered']
            pct = (data['covered'] / total * 100) if total > 0 else 0
            print(f"{pkg:<60} | {pct:>8.2f}%")
            total_missed += data['missed']
            total_covered += data['covered']
        
        total_all = total_missed + total_covered
        overall_pct = (total_covered / total_all * 100) if total_all > 0 else 0
        print("-" * 75)
        print(f"{'OVERALL':<60} | {overall_pct:>8.2f}%")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python analyze_jacoco.py <csv_file> [filter_pkg]")
    else:
        pkg = sys.argv[2] if len(sys.argv) > 2 else None
        analyze(sys.argv[1], pkg)
