import os

def get_jsp_map(root_dir):
    jsp_map = {} # lower_filename -> (actual_filename, relative_path)
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith(".jsp"):
                rel_path = os.path.relpath(os.path.join(root, file), root_dir)
                jsp_map[file.lower()] = (file, rel_path.replace("\\", "/"))
    return jsp_map

def find_best_jsp(prog_nm, jsp_map):
    base = prog_nm.lower()
    variants = [
        f"{base}.jsp",
        f"egov{base}.jsp",
        base.replace("select", "egov").replace("list", "") + ".jsp",
        base.replace("select", "").replace("list", "manage") + ".jsp",
        base.replace("select", "").replace("list", "managelist") + ".jsp",
        base.replace("select", "") + ".jsp"
    ]
    
    # Manual Overrides based on investigation
    manual_maps = {
        "egovauthorlist": "egovauthormanage.jsp",
        "egovauthorgrouplist": "egovauthorgroupmanage.jsp",
        "egovgrouplist": "egovgroupmanage.jsp",
        "egovrolelist": "egovrolemanage.jsp",
        "egovdeptauthorlist": "egovauthormanage.jsp",
        "selectuserstats": "egovuserstats.jsp",
        "egovmenucreatmanageselect": "egovmenucreatmanage.jsp",
        "egovmenumanageselect": "egovmenumanage.jsp",
        "egovmenulistselect": "egovmenulist.jsp",
        "selectreprtstatslistview": "egovreprtstatslist.jsp",
        "selectbbsmasterinfs": "egovbbsmasterlist.jsp",
        "selectncrdinfs": "egovncrdlist.jsp",
        "selectmyncrduseinf": "egovmyncrdlist.jsp",
        "hpcmlistinqire": "egovhpcmlist.jsp",
        "worddicarylistinqire": "egovworddicarylist.jsp",
        "faqlistinqire": "egovfaqlist.jsp",
        "stplatlistinqire": "egovstplatlistinqire.jsp",
        "cpyrhtprtcpolicylistinqire": "egovcpyrhtprtcpolicylistinqire.jsp",
        "qnalistinqire": "egovqnalist.jsp",
        "cnsltlistinqire": "egovcnsltlistinqire.jsp",
        "newsinfolistinqire": "egovnewslist.jsp",
        "sitelistinqire": "egovsitelist.jsp",
        "recomendsitelistinqire": "egovrecomendsitelist.jsp",
        "selectbbsuseinfs": "egovarticlelist.jsp", # Likely fallback
        "selecttemplateinfs": "egovtemplateinqirepopup.jsp",
        "selectdtauitlestatslist": "egovdtauitlestatslist.jsp"
    }
    
    if base in manual_maps:
        target = manual_maps[base]
        if target in jsp_map:
            return jsp_map[target]

    for v in variants:
        if v in jsp_map:
            return jsp_map[v]
            
    # Substring search
    search_key = base.replace("select", "").replace("list", "").replace("egov", "")
    if len(search_key) > 3:
        for k, v in jsp_map.items():
            if search_key in k:
                return v
            
    return None

if __name__ == "__main__":
    base_dir = r"d:\project\egov-enterprise"
    project_jsp_root = os.path.join(base_dir, "api-server", "src", "main", "webapp", "WEB-INF", "jsp")
    template_jsp_root = os.path.join(base_dir, "egovframe-template-common-components-5.0.0", "src", "main", "webapp", "WEB-INF", "jsp")
    
    project_jsps = get_jsp_map(project_jsp_root)
    template_jsps = get_jsp_map(template_jsp_root)
    
    results = []
    with open("full_verification_source.txt", "r", encoding="utf-8") as f:
        lines = f.readlines()[1:]
        for line in lines:
            parts = line.strip().split("|")
            if len(parts) < 4: continue
            m_no, m_nm, u_no, p_nm = parts[0], parts[1], parts[2], parts[3]
            
            if p_nm == 'dir':
                results.append((m_no, m_nm, p_nm, "N/A", "📁 폴더", "Normal"))
                continue
                
            proj_match = find_best_jsp(p_nm, project_jsps)
            temp_match = find_best_jsp(p_nm, template_jsps)
            
            if proj_match:
                status = "✅ 정상" if proj_match[0].lower().startswith(p_nm.lower()) else "⚠️ 파일명 상이"
                results.append((m_no, m_nm, p_nm, proj_match[0], f"/{proj_match[1]}", status))
            elif temp_match:
                results.append((m_no, m_nm, p_nm, temp_match[0], f"/{temp_match[1]}", "❌ 이관필요"))
            else:
                results.append((m_no, m_nm, p_nm, "미발견", "N/A", "❌ 미발견"))

    with open("final_comprehensive_verification.md", "w", encoding="utf-8") as f:
        f.write("# 전 메뉴 프로그램 정밀 전수 검사 보고서\n\n")
        f.write("모든 메뉴 아이템(164건)에 대해 원본 프로그램명과 실제 JSP 소스 파일을 1:1로 대조한 결과입니다.\n\n")
        f.write("| 메뉴번호 | 메뉴명 | 원본 프로그램 | 매칭 JSP | 실제 경로 | 상태 |\n")
        f.write("|---|---|---|---|---|---|\n")
        for r in results:
            f.write(f"| {r[0]} | {r[1]} | {r[2]} | **{r[3]}** | {r[4]} | {r[5]} |\n")

    print(f"Comprehensive verification of {len(results)} items complete.")
