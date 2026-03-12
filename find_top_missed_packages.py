
import xml.etree.ElementTree as ET

xml_path = r'd:\project\egov-enterprise\build\reports\jacoco\jacocoRootReport\jacocoRootReport.xml'

try:
    tree = ET.parse(xml_path)
    root = tree.getroot()

    packages = []
    for package in root.findall('package'):
        name = package.get('name').replace('/', '.')
        missed = 0
        covered = 0
        for counter in package.findall('counter'):
            if counter.get('type') == 'INSTRUCTION':
                missed = int(counter.get('missed'))
                covered = int(counter.get('covered'))
                break
        total = missed + covered
        if total > 0:
            coverage = (covered / total) * 100
            packages.append((name, total, missed, coverage))

    # Sort by missed instructions descending
    packages.sort(key=lambda x: x[2], reverse=True)

    print(f"{'Package':<60} {'Total':<10} {'Missed':<10} {'Coverage':<10}")
    print("-" * 95)
    for p in packages[:20]:
        print(f"{p[0]:<60} {p[1]:<10} {p[2]:<10} {p[3]:.2f}%")

except Exception as e:
    print(f"Error: {e}")
