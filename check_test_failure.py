import xml.etree.ElementTree as ET
try:
    tree = ET.parse('common-core/build/test-results/test/TEST-egovframework.com.utl.fcc.service.EgovStringUtilTest.xml')
    for testcase in tree.findall('.//testcase'):
        failure = testcase.find('failure')
        if failure is not None:
            print(f"Test: {testcase.attrib['name']}")
            print(f"Message: {failure.attrib['message']}")
except Exception as e:
    print(f"Error: {e}")
