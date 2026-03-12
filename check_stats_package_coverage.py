
import xml.etree.ElementTree as ET

xml_path = r'd:\project\egov-enterprise\module-system-admin\build\reports\jacoco\test\jacocoTestReport.xml'

try:
    tree = ET.parse(xml_path)
    root = tree.getroot()

    print(f"{'Class':<60} {'Total':<10} {'Covered':<10} {'Coverage':<10}")
    print("-" * 90)
    for package in root.findall('package'):
        if package.get('name') == 'com/company/project/service/stats':
            for cls in package.findall('class'):
                name = cls.get('name').split('/')[-1]
                for counter in cls.findall('counter'):
                    if counter.get('type') == 'INSTRUCTION':
                        missed = int(counter.get('missed'))
                        covered = int(counter.get('covered'))
                        total = missed + covered
                        coverage = (covered / total) * 100 if total > 0 else 0
                        print(f"{name:<60} {total:<10} {covered:<10} {coverage:.2f}%")
except Exception as e:
    print(f"Error: {e}")
