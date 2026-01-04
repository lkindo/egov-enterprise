
import os
import csv
import re
import glob

# 설정
JAVA_SRC_ROOT = r'd:\project\egov-enterprise\api-server\src\main\java'
CSV_PATH = r'd:\project\egov-enterprise\url_dump.csv'

def get_controller_mappings(root_dir):
    """
    모든 Java 파일을 스캔하여 Controller별 매핑 정보를 추출
    Returns: set of full URLs (e.g., {'/a/b.do', '/c/d.do'})
    """
    mappings = set()
    
    java_files = glob.glob(os.path.join(root_dir, '**/*.java'), recursive=True)
    
    print(f"Scanning {len(java_files)} Java files for RequestMapping...")
    
    for file_path in java_files:
        with open(file_path, 'r', encoding='utf-8') as f:
            try:
                content = f.read()
            except UnicodeDecodeError:
                continue
                
            # Controller 체크
            if '@Controller' not in content:
                continue
                
            # Class Level Mapping
            # @RequestMapping(value = "/cop/bbs") or @RequestMapping("/cop/bbs")
            class_mapping = ""
            class_match = re.search(r'@RequestMapping\s*\(\s*(?:value\s*=\s*)?(?:\{)?\s*"([^"]+)"', content)
            if class_match:
                class_mapping = class_match.group(1)
            
            # Method Level Mappings
            # @RequestMapping(value = "/selectBoardList.do") or @RequestMapping({"/a.do", "/b.do"})
            # 정규식은 단순화하여 "문자열"을 추출하는 방식 사용
            # 매칭 그룹을 반복해서 찾음
            
            # RequestMapping 어노테이션 블록 찾기 (줄바꿈 고려 필요하나 간단히 줄단위 혹은 전체 검색)
            # 여기서는 간단히 @RequestMapping(...) 내부의 문자열들을 모두 추출
            
            method_matches = re.finditer(r'@RequestMapping\s*\(([^)]+)\)', content)
            
            for match in method_matches:
                params = match.group(1)
                # "url.do" 형태 추출
                urls = re.findall(r'"([^"]+)"', params)
                
                for url in urls:
                    if url == class_mapping: continue # 클래스 매핑과 동일하면 스킵 (중복 방지)
                    
                    full_url = ""
                    if url.startswith('/'):
                        # 메서드 매핑이 절대경로면 그대로 사용 (보통 전자정부는 절대경로 많이 씀)
                        # 단, 클래스 매핑이 있고 메서드 매핑이 상대경로인 경우는 드묾.
                        # 전자정부 표준은 보통 메서드에 풀 경로를 적거나, 클래스+메서드 합침.
                        # 여기서는 단순하게: url이 /로 시작하면 그것을 full로 간주.
                        # 만약 클래스 매핑이 있고 url이 /로 시작하지 않으면 합침? (일단 /로 시작하는 것만 신뢰)
                        full_url = url
                    elif class_mapping:
                        full_url = class_mapping + "/" + url
                        full_url = full_url.replace('//', '/')
                    
                    if full_url:
                        mappings.add(full_url)
                        
    return mappings

def check_mappings():
    # 1. DB URL 로드
    db_urls = []
    try:
        with open(CSV_PATH, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['url'] and row['url'].endswith('.do'):
                    db_urls.append(row)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return

    # 2. Java Source 매핑 추출
    source_mappings = get_controller_mappings(JAVA_SRC_ROOT)
    
    print(f"Found {len(source_mappings)} unique URLs defined in Controllers.")
    
    # 3. 비교
    mismatches = []
    
    for row in db_urls:
        db_url = row['url'] # 대문자일 수 있음 (예: /uat/uia/EgovLoginUsr.do)
        
        # 완전 일치 확인
        if db_url in source_mappings:
            continue
            
        # 불일치 발생! (대소문자 차이 혹은 아예 없음)
        # 소문자로 변환해서 있는지 확인 (대소문자 문제인지, 아예 없는건지 구분을 위해)
        found_case_insensitive = False
        potential_match = ""
        for src_url in source_mappings:
            if src_url.lower() == db_url.lower():
                found_case_insensitive = True
                potential_match = src_url
                break
        
        mismatches.append({
            'progrm_file_nm': row['progrm_file_nm'],
            'db_url': db_url,
            'status': 'Case Mismatch' if found_case_insensitive else 'Mapping Missing',
            'source_url': potential_match if found_case_insensitive else 'None'
        })
        
    import json
    # 결과 출력
    if mismatches:
        print(f"\nFound {len(mismatches)} mismatches between DB and Controller Mappings.")
        
        with open('d:/project/egov-enterprise/mismatches.json', 'w', encoding='utf-8') as f:
            json.dump(mismatches, f, indent=2, ensure_ascii=False)
            
        print("Mismatches saved to d:/project/egov-enterprise/mismatches.json")
    else:
        print("\nSUCCESS: All DB URLs are correctly mapped in Controllers (Case Sensitive match).")

if __name__ == "__main__":
    check_mappings()
