
import xml.etree.ElementTree as ET

xml_path = r'd:\project\egov-enterprise\module-system-admin\build\reports\jacoco\test\jacocoTestReport.xml'

try:
    tree = ET.parse(xml_path)
    root = tree.getroot()

    classes = []
    for package in root.findall('package'):
        for cls in package.findall('class'):
            name = cls.get('name').replace('/', '.')
            for counter in cls.findall('counter'):
                if counter.get('type') == 'INSTRUCTION':
                    missed = int(counter.get('missed'))
                    covered = int(counter.get('covered'))
                    total = missed + covered
                    if total > 0:
                        coverage = (covered / total) * 100
                        classes.append((name, total, missed, coverage))

    # Sort by missed instructions
    classes.sort(key=lambda x: x[2], reverse=True)

    print(f"{'Class':<80} {'Total':<10} {'Missed':<10} {'Coverage':<10}")
    print("-" * 115)
    for c in classes[:20]:
        print(f"{c[0]:<80} {c[1]:<10} {c[2]:<10} {c[3]:.2f}%")

except Exception as e:
    print(f"Error: {e}")
