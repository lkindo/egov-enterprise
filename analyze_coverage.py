import re

with open('build/reports/jacoco/aggregated/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Modified to handle both >...</td> and /> forms
matches = re.findall(r'<tr><td id="a\d+"><a href="[^"]+".*?>(.*?)</a></td><td class="bar"[^>]*>(?:.*?</td>|/>)<td class="ctr2"[^>]*>(.*?)</td><td class="bar"[^>]*>(?:.*?</td>|/>)<td class="ctr2"[^>]*>(.*?)</td>', html)

results = []
for pkg, inst_cov, branch_data in matches:
    # branch_data is the third capturing group: <td class="ctr2">...</td>
    # Actually wait. The branch missed/total is usually inside a title attr or img alt, or maybe we just want to look at the ctr2 percentages.
    results.append((pkg, inst_cov, branch_data))

print("Packages with missing branch coverage:")
for pkg, ic, bc in results:
    if bc != 'n/a' and bc != '100%':
        print(f'{pkg}: Branch Cov: {bc} - Inst Cov: {ic}')
