
import xml.etree.ElementTree as ET

xml_path = r'd:\project\egov-enterprise\module-system-admin\build\reports\jacoco\test\jacocoTestReport.xml'

try:
    tree = ET.parse(xml_path)
    root = tree.getroot()

    found = False
    for package in root.findall('package'):
        for cls in package.findall('class'):
            if cls.get('name') == 'com/company/project/service/system/service/survey/SurveyService':
                found = True
                for counter in cls.findall('counter'):
                    if counter.get('type') == 'INSTRUCTION':
                        missed = int(counter.get('missed'))
                        covered = int(counter.get('covered'))
                        total = missed + covered
                        coverage = (covered / total) * 100
                        print(f"--- SurveyService Coverage ---")
                        print(f"Total Instructions: {total}")
                        print(f"Covered: {covered}")
                        print(f"Missed: {missed}")
                        print(f"Coverage: {coverage:.2f}%")
    if not found:
        print("SurveyService not found in the report.")
except Exception as e:
    print(f"Error: {e}")
