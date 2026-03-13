import xml.etree.ElementTree as ET
import os

xml_path = 'module-core-iam/build/test-results/test/TEST-com.company.project.api.controller.group.GroupManageControllerTest.xml'
if not os.path.exists(xml_path):
    print(f"File not found: {xml_path}")
else:
    tree = ET.parse(xml_path)
    for t in tree.findall('.//testcase'):
        failure = t.find('failure')
        if failure is not None:
            print(f"Test: {t.attrib['name']}")
            print(f"Message: {failure.attrib['message']}")
            print("-" * 20)
