
import csv
import json
import difflib

# 파일 경로
CSV_PATH = r'd:\project\egov-enterprise\menu_status_local.csv' # 로컬로 가져온 파일
META_PATH = r'd:\project\egov-enterprise\controller_meta.json'
OUTPUT_SQL = r'd:\project\egov-enterprise\final_menu_fix.sql'

def load_csv(path):
    menus = []
    encodings = ['utf-8', 'utf-8-sig', 'euc-kr', 'cp949', 'utf-16']
    
    for enc in encodings:
        try:
            print(f"Trying decoding with {enc}...")
            with open(path, 'r', encoding=enc) as f:
                reader = csv.DictReader(f)
                for row in reader:
                    menus.append(row)
            print(f"Successfully loaded {len(menus)} rows with {enc}")
            break
        except (UnicodeDecodeError, UnicodeError):
            continue
        except FileNotFoundError:
             print(f"File not found: {path}")
             break
    return menus

def load_meta(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"File not found: {path}")
        return []

def main():
    # 1. 데이터 로드
    menus = load_csv(CSV_PATH)
    controllers = load_meta(META_PATH)
    
    print(f"Loaded {len(menus)} menus and {len(controllers)} controller metas.")
    
    updates = []
    
    for menu in menus:
        menu_nm = menu['menu_nm']
        progrm_korean_nm = menu['progrm_korean_nm']
        current_url = menu['url']
        progrm_file_nm = menu['progrm_file_nm']
        
        # 이미 정상이면 패스 (예: .do 로 끝나고 404가 아닌... 간단히 .do Check)
        # 하지만 사용자는 "전체 메뉴"를 원하므로, .do라도 검증. 
        # 단, 현행화된 76건은 이미 맞을 것임.
        # 일단 "현재 URL"과 "제안 URL"이 다르면 업데이트 후보.
        
        # 매칭 로직
        # 0. 100% 한글 설명 일치
        best_match = None
        max_ratio = 0.0
        
        # Controller 메타데이터 순회
        for ctrl in controllers:
            ctrl_desc = ctrl.get('desc', '')
            ctrl_url = ctrl['url']
            
            # 비교 텍스트: 메뉴명 vs 컨트롤러 설명
            # 프로그램 한글명도 활용
            
            # 1. 완전 일치 (메뉴명 == 설명)
            if menu_nm == ctrl_desc:
                best_match = ctrl
                break
                
            # 2. 유사도 분석 (difflib)
            ratio = difflib.SequenceMatcher(None, menu_nm, ctrl_desc).ratio()
            
            # 프로그램 한글명 비교 (가중치?)
            if progrm_korean_nm:
                ratio2 = difflib.SequenceMatcher(None, progrm_korean_nm, ctrl_desc).ratio()
                if ratio2 > ratio:
                    ratio = ratio2
            
            if ratio > max_ratio:
                max_ratio = ratio
                best_match = ctrl
        
        # 임계값 설정 (너무 낮으면 위험)
        if best_match and max_ratio > 0.6: # 60% 이상 유사
            proposed_url = best_match['url']
            
            # URL 정규화 (앞에 / 붙이기 등)
            if not proposed_url.startswith('/'):
                 proposed_url = '/' + proposed_url
                 
            # 기존 URL과 비교
            if current_url != proposed_url:
                updates.append({
                    'menu_nm': menu_nm,
                    'progrm_file_nm': progrm_file_nm,
                    'old_url': current_url,
                    'new_url': proposed_url,
                    'reason': f"Match: {best_match['desc']} (Ratio: {max_ratio:.2f})"
                })
        else:
             # 매칭 실패 (로그만)
             # print(f"No match for: {menu_nm} (Max Ratio: {max_ratio:.2f})")
             pass

    # SQL 생성
    if updates:
        print(f"Generating SQL for {len(updates)} suggested fixes...")
        with open(OUTPUT_SQL, 'w', encoding='utf-8') as f:
            f.write("-- Auto-generated Menu-Controller Matching Fixes\n")
            f.write("BEGIN;\n")
            for u in updates:
                f.write(f"-- Menu: {u['menu_nm']} | Reason: {u['reason']}\n")
                f.write(f"-- Old: {u['old_url']} -> New: {u['new_url']}\n")
                f.write(f"UPDATE NPROGRMLIST SET URL = '{u['new_url']}' WHERE PROGRM_FILE_NM = '{u['progrm_file_nm']}';\n")
            f.write("COMMIT;\n")
        print(f"SQL saved to {OUTPUT_SQL}")
    else:
        print("No updates found.")

if __name__ == "__main__":
    main()
