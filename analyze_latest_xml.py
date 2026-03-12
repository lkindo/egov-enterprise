
import xml.etree.ElementTree as ET

xml_path = r'd:\project\egov-enterprise\build\reports\jacoco\jacocoRootReport\jacocoRootReport.xml'

try:
    tree = ET.parse(xml_path)
    root = tree.getroot()

    total_missed = 0
    total_covered = 0

    # We want to filter out classes starting with Q (Querydsl) or ending with _ (JPA metamodel)
    for package in root.findall('package'):
        for cls in package.findall('class'):
            name = cls.get('name')
            # Extract simple class name from internal name (e.g. com/foo/Bar -> Bar)
            simple_name = name.split('/')[-1]
            
            if simple_name.startswith('Q') or simple_name.endswith('_'):
                continue
                
            for counter in cls.findall('counter'):
                if counter.get('type') == 'INSTRUCTION':
                    total_missed += int(counter.get('missed'))
                    total_covered += int(counter.get('covered'))

    if total_missed + total_covered == 0:
        print("No valid instruction data found.")
    else:
        coverage = (total_covered / (total_missed + total_covered)) * 100
        print(f"--- Latest Coverage Analysis (Excluding Q/Meta classes) ---")
        print(f"Total Instructions: {total_missed + total_covered}")
        print(f"Covered: {total_covered}")
        print(f"Missed: {total_missed}")
        print(f"Current Real Coverage: {coverage:.2f}%")

except Exception as e:
    print(f"Error parsing XML: {e}")
