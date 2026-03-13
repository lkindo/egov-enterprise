import xml.etree.ElementTree as ET
import os

modules = [
    'api-server', 'common-core', 'common-security', 
    'module-core-iam', 'module-knowledge', 'module-operation', 
    'module-system-admin', 'module-workspace'
]

total_instructions = 0
covered_instructions = 0

for module in modules:
    path = f'{module}/build/reports/jacoco/test/jacocoTestReport.xml'
    if os.path.exists(path):
        try:
            tree = ET.parse(path)
            root = tree.getroot()
            counter = root.find('counter[@type="INSTRUCTION"]')
            if counter is not None:
                m = int(counter.attrib['missed'])
                c = int(counter.attrib['covered'])
                total_instructions += (m + c)
                covered_instructions += c
                print(f"Module {module}: {c}/{m+c} ({c/(m+c)*100:.2f}%)")
        except Exception as e:
            print(f"Error parsing {path}: {e}")
    else:
        print(f"Report not found for {module}")

if total_instructions > 0:
    percentage = (covered_instructions / total_instructions) * 100
    print("-" * 30)
    print(f"Total Covered: {covered_instructions}")
    print(f"Total Instructions: {total_instructions}")
    print(f"Overall Coverage: {percentage:.2f}%")
else:
    print("No coverage data found.")
