import xml.etree.ElementTree as ET
import glob

files = glob.glob('module-system-admin/build/test-results/test/*.xml')
for file in files:
    try:
        tree = ET.parse(file)
        for t in tree.findall('.//testcase'):
            failure = t.find('failure')
            if failure is not None:
                print(f"Test: {t.attrib['classname']} - {t.attrib['name']}")
                print(f"Message: {failure.attrib['message']}\n")
    except Exception as e:
        print(f"Error reading {file}: {e}")
