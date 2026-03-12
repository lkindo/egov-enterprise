
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
                        classes.append((name, total, missed))

    classes.sort(key=lambda x: x[2], reverse=True)

    for c in classes[:20]:
        print(f"{c[0]}|{c[1]}|{c[2]}")

except Exception as e:
    print(f"Error: {e}")
