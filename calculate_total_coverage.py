import xml.etree.ElementTree as ET
import sys

def calculate_global_coverage(xml_path):
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        
        # Jacoco XML format has <counter type="INSTRUCTION" missed="X" covered="Y"/> under root
        for counter in root.findall('counter'):
            if counter.get('type') == 'INSTRUCTION':
                missed = int(counter.get('missed'))
                covered = int(counter.get('covered'))
                total = missed + covered
                percentage = (covered / total * 100) if total > 0 else 0
                print(f"Global Instruction Coverage:")
                print(f"Total: {total}")
                print(f"Covered: {covered}")
                print(f"Missed: {missed}")
                print(f"Percentage: {percentage:.2f}%")
                return
    except Exception as e:
        print(f"Error: {e}")

calculate_global_coverage(r'd:\project\egov-enterprise\build\reports\jacoco\jacocoRootReport\jacocoRootReport.xml')
