
import xml.etree.ElementTree as ET
import os

def check_module_coverage(xml_path, module_name):
    if not os.path.exists(xml_path):
        print(f"Report not found for {module_name}")
        return

    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        
        print(f"--- Low Coverage Services in {module_name} ---")
        print(f"{'Class':<60} {'Total':<10} {'Covered':<10} {'Coverage':<10}")
        print("-" * 90)
        
        for package in root.findall('package'):
            for cls in package.findall('class'):
                name = cls.get('name').replace('/', '.')
                if 'Service' in name and 'Test' not in name:
                    for counter in cls.findall('counter'):
                        if counter.get('type') == 'INSTRUCTION':
                            missed = int(counter.get('missed'))
                            covered = int(counter.get('covered'))
                            total = missed + covered
                            if total > 0:
                                coverage = (covered / total) * 100
                                if coverage < 50:
                                    print(f"{name:<60} {total:<10} {covered:<10} {coverage:.2f}%")
    except Exception as e:
        print(f"Error parsing {module_name}: {e}")

check_module_coverage(r'd:\project\egov-enterprise\module-system-admin\build\reports\jacoco\test\jacocoTestReport.xml', "module-system-admin")
check_module_coverage(r'd:\project\egov-enterprise\module-core-iam\build\reports\jacoco\test\jacocoTestReport.xml', "module-core-iam")
check_module_coverage(r'd:\project\egov-enterprise\module-workspace\build\reports\jacoco\test\jacocoTestReport.xml', "module-workspace")
