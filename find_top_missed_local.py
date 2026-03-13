import xml.etree.ElementTree as ET
import os

modules = [
    'api-server', 'common-core', 'common-security', 
    'module-core-iam', 'module-knowledge', 'module-operation', 
    'module-system-admin', 'module-workspace'
]

class_coverage = []

for module in modules:
    path = f'{module}/build/reports/jacoco/test/jacocoTestReport.xml'
    if os.path.exists(path):
        try:
            tree = ET.parse(path)
            root = tree.getroot()
            for pkg in root.findall('package'):
                for cls in pkg.findall('class'):
                    cls_name = cls.attrib['name'].replace('/', '.')
                    counter = cls.find('counter[@type="INSTRUCTION"]')
                    if counter is not None:
                        missed = int(counter.attrib['missed'])
                        covered = int(counter.attrib['covered'])
                        if missed > 0:
                            class_coverage.append({
                                'class': cls_name,
                                'missed': missed,
                                'total': missed + covered
                            })
        except Exception as e:
            pass

class_coverage.sort(key=lambda x: x['missed'], reverse=True)

print("Top 30 classes with most missed instructions:")
print("-" * 80)
for item in class_coverage[:30]:
    percentage = (item['total'] - item['missed']) / item['total'] * 100
    print(f"{item['class']:<60} Missed: {item['missed']:<5} Total: {item['total']:<5} Cov: {percentage:.1f}%")
