import re

def generate_sql():
    with open('final_comprehensive_verification.md', 'r', encoding='utf-8') as f:
        lines = f.readlines()

    updates = []
    # Skip header lines
    for line in lines[6:]:
        if not line.strip() or '|' not in line:
            continue
            
        parts = [p.strip() for p in line.split('|')]
        if len(parts) < 6:
            continue
            
        menu_no = parts[1]
        program_nm = parts[3]
        jsp_nm = parts[4].replace('**', '')
        actual_path = parts[5].strip()
        
        if jsp_nm == 'N/A' or '📁' in actual_path:
            continue
            
        # Get directory part
        dir_path = '/'.join(actual_path.split('/')[:-1]) + '/'
        
        # URL construction (relative to context root)
        # Remove /egovframework/com/ prefix if it exists
        url_path = dir_path
        if url_path.startswith('/egovframework/com/'):
            url_path = url_path.replace('/egovframework/com', '', 1)
        
        # Ensure url_path starts with /
        if not url_path.startswith('/'):
            url_path = '/' + url_path
            
        jsp_base = jsp_nm.replace('.jsp', '')
        final_url = f"{url_path}{jsp_base}.do"
        
        # PROGRM_STRE_PATH should probably be the full path for internal usage
        # But let's see what's consistent with existing data.
        # User's previous script used /egovframework/com/...
        # So we keep it.
        stre_path = dir_path
        if not stre_path.startswith('/egovframework/com/'):
            # If it's already a relative path, we might need to prepend it?
            # Let's check consistency.
            if not stre_path.startswith('/'):
               stre_path = '/' + stre_path
            if not stre_path.startswith('/egovframework/com'):
               # If it's a path like /sec/ram/, should it be /egovframework/com/sec/ram/?
               # Looking at the previous summary, YES.
               stre_path = '/egovframework/com' + stre_path
        
        # Clean double slashes
        stre_path = stre_path.replace('//', '/')
        final_url = final_url.replace('//', '/')
        
        updates.append(f"UPDATE NPROGRMLIST SET PROGRM_STRE_PATH = '{stre_path}', URL = '{final_url}' WHERE PROGRM_FILE_NM = '{program_nm}';")

    with open('restore_jsp_convention_urls.sql', 'w', encoding='utf-8') as f:
        f.write("-- NPROGRMLIST JSP 기반 .do 매핑 복구 SQL\n")
        f.write("-- 규칙: URL = [상대경로]/[JSP파일명].do\n")
        f.write("-- 대소문자 엄격 적용\n\n")
        f.write('\n'.join(updates))
        f.write('\n')

    print(f"Generated {len(updates)} update statements in restore_jsp_convention_urls.sql")

if __name__ == "__main__":
    generate_sql()
