
import xml.etree.ElementTree as ET

xml_path = r'd:\project\egov-enterprise\build\reports\jacoco\jacocoRootReport\jacocoRootReport.xml'

try:
    tree = ET.parse(xml_path)
    root = tree.getroot()

    classes = []
    for package in root.findall('package'):
        p_name = package.get('name').replace('/', '.')
        for cls in package.findall('class'):
            c_name = cls.get('name').replace('/', '.')
            if p_name in c_name:
                short_name = c_name
            else:
                short_name = f"{p_name}.{c_name}"
            
            missed = 0
            covered = 0
            for counter in cls.findall('counter'):
                if counter.get('type') == 'INSTRUCTION':
                    missed = int(counter.get('missed'))
                    covered = int(counter.get('covered'))
                    break
            total = missed + covered
            if total > 0:
                coverage = (covered / total) * 100
                classes.append((c_name, total, missed, coverage))

    # Sort by missed instructions descending
    classes.sort(key=lambda x: x[2], reverse=True)

    print(f"{'Class':<80} {'Total':<10} {'Missed':<10} {'Coverage':<10}")
    print("-" * 115)
    for c in classes[:30]:
        print(f"{c[0]:<80} {c[1]:<10} {c[2]:<10} {c[3]:.2f}%")

except Exception as e:
    print(f"Error: {e}")
