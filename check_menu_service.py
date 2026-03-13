import xml.etree.ElementTree as ET
try:
    tree = ET.parse('module-system-admin/build/reports/jacoco/test/jacocoTestReport.xml')
    for c in tree.findall('.//class[@name="com/company/project/service/menu/MenuService"]'):
        for m in c.findall('method'):
            counter = m.find('counter[@type="INSTRUCTION"]')
            if counter is not None:
                print(f"{m.attrib['name']}: {counter.attrib['missed']} missed / {int(counter.attrib['missed']) + int(counter.attrib['covered'])} total")
except Exception as e:
    print(f"Error: {e}")
