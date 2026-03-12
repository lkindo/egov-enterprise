
import xml.etree.ElementTree as ET

def check_class_coverage(xml_path, class_name):
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        for package in root.findall('package'):
            for cls in package.findall('class'):
                if cls.get('name').replace('/', '.') == class_name:
                    for counter in cls.findall('counter'):
                        if counter.get('type') == 'INSTRUCTION':
                            missed = int(counter.get('missed'))
                            covered = int(counter.get('covered'))
                            total = missed + covered
                            coverage = (covered / total) * 100
                            print(f"{class_name}: {coverage:.2f}% ({covered}/{total})")
    except: pass

check_class_coverage(r'd:\project\egov-enterprise\module-workspace\build\reports\jacoco\test\jacocoTestReport.xml', "com.company.project.service.board.BoardService")
check_class_coverage(r'd:\project\egov-enterprise\module-workspace\build\reports\jacoco\test\jacocoTestReport.xml', "com.company.project.service.note.NoteServiceImpl")
check_class_coverage(r'd:\project\egov-enterprise\module-core-iam\build\reports\jacoco\test\jacocoTestReport.xml', "com.company.project.service.auth.AuthorManageService")
check_class_coverage(r'd:\project\egov-enterprise\module-system-admin\build\reports\jacoco\test\jacocoTestReport.xml', "com.company.project.service.login.LoginPolicyManageService")
check_class_coverage(r'd:\project\egov-enterprise\module-system-admin\build\reports\jacoco\test\jacocoTestReport.xml', "com.company.project.api.controller.code.CodeApiController")
check_class_coverage(r'd:\project\egov-enterprise\module-system-admin\build\reports\jacoco\test\jacocoTestReport.xml', "com.company.project.service.system.content.community.CommunityServiceImpl")
