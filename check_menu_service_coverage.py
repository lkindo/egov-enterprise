
import xml.etree.ElementTree as ET

xml_path = r'd:\project\egov-enterprise\module-system-admin\build\reports\jacoco\test\jacocoTestReport.xml'

try:
    tree = ET.parse(xml_path)
    root = tree.getroot()

    for package in root.findall('package'):
        for cls in package.findall('class'):
            if cls.get('name') == 'com/company/project/service/menu/MenuService':
                for counter in cls.findall('counter'):
                    if counter.get('type') == 'INSTRUCTION':
                        missed = int(counter.get('missed'))
                        covered = int(counter.get('covered'))
                        total = missed + covered
                        coverage = (covered / total) * 100
                        print(f"--- MenuService Coverage Impact ---")
                        print(f"Total Instructions: {total}")
                        print(f"Covered: {covered}")
                        print(f"Missed: {missed}")
                        print(f"Coverage: {coverage:.2f}%")
except Exception as e:
    print(f"Error: {e}")
