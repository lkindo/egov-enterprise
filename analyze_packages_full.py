
import xml.etree.ElementTree as ET

xml_path = r'd:\project\egov-enterprise\build\reports\jacoco\jacocoRootReport\jacocoRootReport.xml'

try:
    tree = ET.parse(xml_path)
    root = tree.getroot()

    package_stats = []

    for package in root.findall('package'):
        p_name = package.get('name').replace('/', '.')
        p_missed = 0
        p_covered = 0
        
        for cls in package.findall('class'):
            c_name = cls.get('name').split('/')[-1]
            if c_name.startswith('Q') or c_name.endswith('_'):
                continue
            
            for counter in cls.findall('counter'):
                if counter.get('type') == 'INSTRUCTION':
                    p_missed += int(counter.get('missed'))
                    p_covered += int(counter.get('covered'))
        
        total = p_missed + p_covered
        if total > 0:
            coverage = (p_covered / total) * 100
            package_stats.append((p_name, total, coverage))

    package_stats.sort(key=lambda x: x[1], reverse=True)

    print(f"{'PACKAGE NAME':<60} {'TOTAL':<10} {'COVERAGE':<10}")
    print("-" * 80)
    for name, total, cov in package_stats:
        print(f"{name:<60} {total:<10} {cov:<10.2f}%")

except Exception as e:
    print(f"Error: {e}")
