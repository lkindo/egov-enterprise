import re
import os

# 매칭 사전 (한글 키워드 -> 영문 가능성)
KEYWORD_MAP = {
    "권한": ["Author", "Auth"],
    "그룹": ["Group"],
    "롤": ["Role"],
    "사용자": ["User", "Mber", "Emplyr"],
    "로그": ["Log"],
    "메뉴": ["Menu"],
    "프로그램": ["Progrm", "Program"],
    "코드": ["Code", "Ccc", "Cca", "Cde"],
    "게시판": ["BBS", "Article"],
    "통계": ["Stats", "Statistic"],
    "일정": ["Schdul", "Calendar"],
    "로그인": ["Login"],
    "정책": ["Policy"],
    "회원": ["Mber", "User"],
    "기업": ["Entrprs"],
    "부서": ["Dept", "Orgnzt"],
    "설문": ["Qustnr", "Respond"],
    "회의": ["Meeting", "Mtg"],
    "행사": ["Event"],
    "메일": ["Mail", "Sndng"],
    "공지": ["Notice", "Board"],
    "자료": ["Dta"],
    "접속": ["Conect", "Login"],
    "화면": ["Scrin", "Image"],
    "사이트맵": ["SiteMap"]
}

# 명확한 프로그램명-JSP 매핑 (Controller 분석 기반)
HARDCODED_MAPPING = {
    "EgovMenuListSelect": "EgovMenuList",
    "EgovMenuManageSelect": "EgovMenuManage",
    "EgovMenuCreatManageSelect": "EgovMenuCreatManage",
    "selectBkmkMenuManageList": "EgovBkmkMenuManageList",
    "EgovMenuCreatSelect": "EgovMenuCreat",
}

def parse_sql_programs(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    programs = []
    prog_matches = re.finditer(r"INSERT INTO NPROGRMLIST\s*\((.*?)\)\s*VALUES\s*\((.*?)\);", content, re.DOTALL | re.IGNORECASE)
    for match in prog_matches:
        cols = [c.strip() for c in match.group(1).split(',')]
        vals = [v.strip().strip("'").replace('&amp;', '&') for v in re.findall(r"'[^']*'|[^,]+", match.group(2))]
        prog_data = dict(zip(cols, vals))
        programs.append(prog_data)
    return programs

def parse_sql_menus(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    menus = []
    menu_matches = re.finditer(r"INSERT INTO NMENUINFO\s*\((.*?)\)\s*VALUES\s*\((.*?)\);", content, re.DOTALL | re.IGNORECASE)
    for match in menu_matches:
        cols = [c.strip() for c in match.group(1).split(',')]
        raw_vals = re.findall(r"'[^']*'|[^,]+", match.group(2))
        vals = [v.strip().strip("'").replace('&amp;', '&') for v in raw_vals]
        menu_data = dict(zip(cols, vals))
        menus.append(menu_data)
    return menus

def get_all_jsps(base_dir):
    jsp_files = {} # filename_lower -> (actual_name, rel_path_normalized)
    jsp_root = os.path.join(base_dir, "api-server", "src", "main", "webapp", "WEB-INF", "jsp")
    for root, dirs, files in os.walk(jsp_root):
        for file in files:
            if file.endswith(".jsp"):
                rel_path = os.path.relpath(os.path.join(root, file), jsp_root)
                norm_rel_path = rel_path.replace("\\", "/")
                jsp_files[file.lower()] = (file, norm_rel_path)
    return jsp_files

# 카테고리별 우선 순위 경로 매핑
CATEGORY_PATH_MAP = {
    "사용자디렉토리": ["uat", "uss", "cmm/uss"],
    "보안": ["sec"],
    "통계": ["sts"],
    "협업": ["cop"],
    "사용자지원": ["uss", "cmm/uss"],
    "시스템관리": ["sym", "cmm/sym"],
    "정보알림": ["uss/ion", "cop/ems"]
}

def match_by_context(menu_nm, upper_menu_nm, actual_jsps):
    possible_keywords = []
    for k, engs in KEYWORD_MAP.items():
        if k in menu_nm:
            possible_keywords.extend(engs)
            
    preferred_paths = []
    for cat, paths in CATEGORY_PATH_MAP.items():
        if cat in upper_menu_nm or cat in menu_nm:
            preferred_paths.extend(paths)

    matches = []
    for filename_key, (act_name, act_path) in actual_jsps.items():
        score = 0
        act_base = act_name.lower().replace(".jsp", "")
        act_path_lower = act_path.lower()
        
        # 1. 파일명 키워드 매칭 (가중치 10 - 매우 강력)
        for pk in possible_keywords:
            if pk.lower() in act_base:
                score += 10
            elif pk.lower() in act_path_lower:
                score += 2
                
        # 2. 경로 가중치 (가중치 5)
        for pp in preferred_paths:
            if pp.lower() in act_path_lower:
                score += 5
                break
                
        # 3. 명칭 유사성 (Manage/List 등)
        if "manage" in act_base and ("관리" in menu_nm or "등록" in menu_nm or "수정" in menu_nm):
            score += 1
        if "list" in act_base and ("목록" in menu_nm or "조회" in menu_nm or "관리" in menu_nm):
            score += 1
            
        if score > 8: # 임계치 상향 (키워드가 파일명에 반드시 포함되어야 함을 시사)
            matches.append((score, act_name, act_path))
            
    if matches:
        matches.sort(key=lambda x: (-x[0], len(x[2])))
        return matches[0][1], matches[0][2], matches[0][0]
    return None

def get_all_jsps_with_fallback(base_dir):
    jsps = get_all_jsps(base_dir) # Target project JSPs
    
    # Fallback to template folder
    template_root = os.path.join(base_dir, "egovframe-template-common-components-5.0.0", "src", "main", "webapp", "WEB-INF", "jsp")
    template_jsps = {}
    if os.path.exists(template_root):
        for root, dirs, files in os.walk(template_root):
            for file in files:
                if file.endswith(".jsp"):
                    rel_path = os.path.relpath(os.path.join(root, file), template_root)
                    norm_rel_path = rel_path.replace("\\", "/")
                    template_jsps[file.lower()] = (file, norm_rel_path)
    return jsps, template_jsps

if __name__ == "__main__":
    sql_path = r"d:\project\egov-enterprise\egovframe-template-common-components-5.0.0\script\dml\postgres\com_DML_postgres.sql"
    base_dir = r"d:\project\egov-enterprise"
    
    progs = parse_sql_programs(sql_path)
    progs_dict = {p['PROGRM_FILE_NM']: p for p in progs}
    menus = parse_sql_menus(sql_path)
    menu_tree_flat = {m['MENU_NO']: m for m in menus}
    actual_jsps, template_jsps = get_all_jsps_with_fallback(base_dir)
    
    proposal = []
    
    for menu in menus:
        menu_no = menu['MENU_NO']
        menu_nm = menu['MENU_NM']
        upper_no = menu['UPPER_MENU_NO']
        upper_nm = menu_tree_flat.get(upper_no, {}).get('MENU_NM', "")
        prog_file_nm = menu['PROGRM_FILE_NM']
        
        if prog_file_nm == 'dir': continue

        # 0. Hardcoded mapping first
        if prog_file_nm in HARDCODED_MAPPING:
            suggest_base = HARDCODED_MAPPING[prog_file_nm]
            exact_filename = f"{suggest_base}.jsp".lower()
            if exact_filename in actual_jsps:
                act_name, act_path = actual_jsps[exact_filename]
                proposal.append({
                    "MENU_NO": menu_no, "MENU_NM": menu_nm, "ORIG_PROG": prog_file_nm,
                    "SUGGEST_PROG": suggest_base, "SUGGEST_PATH": "/" + os.path.dirname(act_path) + "/",
                    "SCORE": 100, "SOURCE": "Manual (Controller Verified)"
                })
                continue
            elif exact_filename in template_jsps:
                act_name, act_path = template_jsps[exact_filename]
                proposal.append({
                    "MENU_NO": menu_no, "MENU_NM": menu_nm, "ORIG_PROG": prog_file_nm,
                    "SUGGEST_PROG": suggest_base, "SUGGEST_PATH": "/" + os.path.dirname(act_path) + "/",
                    "SCORE": 100, "SOURCE": "Manual (Template Required)"
                })
                continue

        # 1. Skip if already matched exactly in Project
        already_found = False
        exact_filename = f"{prog_file_nm}.jsp".lower()
        if exact_filename in actual_jsps:
            already_found = True
        else:
            variants = [prog_file_nm.lower(), f"egov{prog_file_nm}".lower(), prog_file_nm.replace("Egov", "").lower()]
            for v in variants:
                if f"{v}.jsp" in actual_jsps or f"{v.replace('list','manage')}.jsp" in actual_jsps or f"{v.replace('manage','list')}.jsp" in actual_jsps:
                    already_found = True
                    break
        
        if not already_found:
            # First try context match in actual project
            suggestion = match_by_context(menu_nm, upper_nm, actual_jsps)
            
            # If not found or low confidence, try template folder
            template_match = match_by_context(menu_nm, upper_nm, template_jsps)
            
            final_match = None
            source = "Project"
            
            if suggestion and template_match:
                if suggestion[2] >= template_match[2]:
                    final_match = suggestion
                else:
                    final_match = template_match
                    source = "Template (Migrate Required)"
            elif suggestion:
                final_match = suggestion
            elif template_match:
                final_match = template_match
                source = "Template (Migrate Required)"
                
            if final_match:
                act_name, act_path, score = final_match
                act_file_base = act_name.replace(".jsp", "")
                proposal.append({
                    "MENU_NO": menu_no,
                    "MENU_NM": menu_nm,
                    "ORIG_PROG": prog_file_nm,
                    "SUGGEST_PROG": act_file_base,
                    "SUGGEST_PATH": "/" + os.path.dirname(act_path) + "/",
                    "SCORE": score,
                    "SOURCE": source
                })

    with open("semantic_match_proposal_v4.md", "w", encoding="utf-8") as f:
        f.write("# 메뉴명 기반 프로그램 매칭 제안서 (V4 - 템플릿 참조형)\n\n")
        f.write("현재 프로젝트(`api-server`)에 없는 경우 템플릿 폴더를 참조하여 최적의 이관 대상을 찾아낸 결과입니다.\n\n")
        f.write("| 메뉴번호 | 메뉴명 | 기존 프로그램 | 제안 프로그램 | 제안 경로 | 신뢰도 | 출처 |\n")
        f.write("|---|---|---|---|---|---|---|\n")
        for p in proposal:
            f.write(f"| {p['MENU_NO']} | {p['MENU_NM']} | {p['ORIG_PROG']} | **{p['SUGGEST_PROG']}** | {p['SUGGEST_PATH']} | {p['SCORE']} | {p['SOURCE']} |\n")
            
    print(f"Generated comprehensive proposal for {len(proposal)} menus.")
    print("Proposal saved to semantic_match_proposal_v4.md")
