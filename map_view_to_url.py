
import os
import re
import glob
import json

# 설정
JAVA_SRC_ROOT = r'd:\project\egov-enterprise\api-server\src\main\java'
OUTPUT_MAP_FILE = r'd:\project\egov-enterprise\view_url_map.json'

def extract_mappings(root_dir):
    """
    Java 소스를 스캔하여 (ViewName -> URL) 매핑 정보를 추출
    """
    print(f"Scanning Java files in {root_dir}")
    
    mapping_data = {} # Key: ViewName (e.g., "egovframework/com/sym/ccm/ccc/EgovCcmCmmnClCodeList"), Value: URL
    
    java_files = glob.glob(os.path.join(root_dir, '**/*.java'), recursive=True)
    
    for file_path in java_files:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            
        # 1. Controller 확인
        if '@Controller' not in content:
            continue
            
        # 2. Class Level RequestMapping 확인
        class_url = ""
        class_match = re.search(r'@RequestMapping\s*\(\s*(?:value\s*=\s*)?(?:\{)?\s*"([^"]+)"', content)
        if class_match:
            class_url = class_match.group(1)
            
        # 3. 메서드 단위 파싱
        # 정규식 한계로 인해, 간단한 패턴 매칭 사용
        # 패턴: @RequestMapping(...) ... return "ViewName";
        # 메서드 블록을 정확히 잡기 어려우므로, 파일 전체에서 @RequestMapping과 return 사이의 거리가 가까운 것을 매칭하거나,
        # 단순히 "메서드 시그니처" 주변을 탐색
        
        # 전략: "@RequestMapping" 인덱스 찾기 -> 그 뒤의 "return" 찾기
        # 주의: 메서드 내부에 조건문이 많으면 꼬일 수 있음. 하지만 대다수 eGov 코드는 단순함.
        
        # 모든 RequestMapping 인덱스 찾기
        rm_iter = re.finditer(r'@RequestMapping\s*\(([^)]+)\)', content)
        
        mappings_in_file = []
        for m in rm_iter:
            start_idx = m.start()
            end_idx = m.end()
            params = m.group(1)
            
            # URL 추출
            urls = re.findall(r'"([^"]+)"', params)
            if not urls: continue
            url = urls[0] # 첫번째 URL만 사용
            
            # Full URL 조립
            full_url = url
            if not url.startswith('/'):
                 if class_url:
                     full_url = class_url + "/" + url
                     full_url = full_url.replace('//', '/')
            
            mappings_in_file.append({'url': full_url, 'start': start_idx, 'end': end_idx})
            
        # 각 매핑에 대해, 다음 매핑이 나오기 전까지의 코드에서 'return "..."' 추출
        for i, mapping in enumerate(mappings_in_file):
            current_start = mapping['end']
            next_start = mappings_in_file[i+1]['start'] if i+1 < len(mappings_in_file) else len(content)
            
            method_body = content[current_start:next_start]
            
            # return "ViewName" 패턴 찾기
            # return "..." or return "redirect:..." or modelAndView.setViewName("...")
            
            # 1. return "String"
            returns = re.findall(r'return\s+"([^"]+)"', method_body)
            for view_name in returns:
                if view_name.startswith("redirect:") or view_name.startswith("forward:"):
                    continue # 리다이렉트는 뷰가 아님 (다른 URL 호출)
                
                # 확장자 제거 (.jsp 등) - 보통 안 붙음
                mapping_data[view_name] = mapping['url']
                
            # 2. .setViewName("String")
            setviews = re.findall(r'\.setViewName\s*\(\s*"([^"]+)"', method_body)
            for view_name in setviews:
                mapping_data[view_name] = mapping['url']

    return mapping_data

if __name__ == "__main__":
    maps = extract_mappings(JAVA_SRC_ROOT)
    print(f"Extracted {len(maps)} View-URL mappings.")
    
    with open(OUTPUT_MAP_FILE, 'w', encoding='utf-8') as f:
        json.dump(maps, f, indent=2)
    print(f"Saved to {OUTPUT_MAP_FILE}")
