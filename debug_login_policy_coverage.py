
import xml.etree.ElementTree as ET

xml_path = r'd:\project\egov-enterprise\module-system-admin\build\reports\jacoco\test\jacocoTestReport.xml'

try:
    tree = ET.parse(xml_path)
    root = tree.getroot()

    for package in root.findall('package'):
        for cls in package.findall('class'):
            if cls.get('name') == 'com/company/project/service/login/LoginPolicyManageService':
                print(f"--- {cls.get('name')} ---")
                for method in cls.findall('method'):
                    name = method.get('name')
                    for counter in method.findall('counter'):
                        if counter.get('type') == 'INSTRUCTION':
                            missed = int(counter.get('missed'))
                            covered = int(counter.get('covered'))
                            total = missed + covered
                            coverage = (covered / total) * 100
                            print(f"Method: {name} | Total: {total} | Covered: {covered} | Coverage: {coverage:.2f}%")
except Exception as e:
    print(f"Error: {e}")
