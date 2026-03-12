
import xml.etree.ElementTree as ET

xml_path = r'd:\project\egov-enterprise\build\reports\jacoco\jacocoRootReport\jacocoRootReport.xml'

try:
    tree = ET.parse(xml_path)
    root = tree.getroot()

    for counter in root.findall('counter'):
        if counter.get('type') == 'INSTRUCTION':
            missed = int(counter.get('missed'))
            covered = int(counter.get('covered'))
            total = missed + covered
            coverage = (covered / total) * 100
            print(f"--- Global Project Coverage ---")
            print(f"Total Instructions: {total}")
            print(f"Covered: {covered}")
            print(f"Missed: {missed}")
            print(f"Overall Coverage: {coverage:.2f}%")
except Exception as e:
    print(f"Error: {e}")
