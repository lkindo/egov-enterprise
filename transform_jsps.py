import os
import re

def transform_jsp(content):
    # 1. Taglib update
    content = content.replace("http://java.sun.com/jsp/jstl/core", "jakarta.tags.core")
    content = content.replace("http://java.sun.com/jsp/jstl/functions", "jakarta.tags.functions")
    content = content.replace("http://java.sun.com/jsp/jstl/fmt", "jakarta.tags.fmt")
    
    # 2. Header/Footer conversion (Standard project structure)
    # Remove existing <html>, <head>, <body> tags to wrap with our layout if it's a full page
    if "<body" in content.lower():
        # Inject standard head resources if missing
        head_resources = """
    <link rel="stylesheet" href="<c:url value='/css/base.css'/>">
    <link rel="stylesheet" href="<c:url value='/css/layout.css'/>">
    <link rel="stylesheet" href="<c:url value='/css/component.css'/>">
    <link rel="stylesheet" href="<c:url value='/css/page.css'/>">
    <script src="<c:url value='/js/jquery-1.11.2.min.js'/>"></script>
    <script src="<c:url value='/js/ui.js'/>"></script>
"""
        content = re.sub(r"(</head>)", head_resources + r"\1", content, flags=re.IGNORECASE)
        
        # Inject Header after <body>
        header_import = '\n<div class="wrap">\n<c:import url="/sym/mms/EgovHeader.do" />\n<div class="container" style="padding-bottom: 60px;">\n<div class="sub_layout">\n<div class="sub_in">\n<div class="layout">\n'
        content = re.sub(r"(<body[^>]*>)", r"\1" + header_import, content, flags=re.IGNORECASE)
        
        # Close tags and Inject Footer before </body>
        footer_import = '\n</div>\n</div>\n</div>\n</div>\n<c:import url="/sym/mms/EgovFooter.do" />\n</div>\n'
        content = re.sub(r"(</body>)", footer_import + r"\1", content, flags=re.IGNORECASE)

    return content

def run_transformation():
    base_dir = r"d:\project\egov-enterprise"
    jsp_root = os.path.join(base_dir, "api-server", "src", "main", "webapp", "WEB-INF", "jsp", "egovframework", "com")
    
    count = 0
    for root, dirs, files in os.walk(jsp_root):
        for file in files:
            if file.endswith(".jsp"):
                file_path = os.path.join(root, file)
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                
                new_content = transform_jsp(content)
                
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                count += 1
                
    print(f"Transformation complete. Processed {count} files.")

if __name__ == "__main__":
    run_transformation()
