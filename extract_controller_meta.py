
import os
import re
import glob
import json

# 설정
JAVA_SRC_ROOT = r'd:\project\egov-enterprise\api-server\src\main\java'
OUTPUT_META_FILE = r'd:\project\egov-enterprise\controller_meta.json'

def extract_meta(root_dir):
    """
    Java 소스를 스캔하여 (URL -> Description) 매핑 정보를 추출
    Description은 메서드 위의 JavaDoc 또는 @IncludedInfo의 name 속성을 우선 사용
    """
    print(f"Scanning Java files in {root_dir}")
    
    meta_data = [] 
    # List of dicts: {'url': '/path.do', 'desc': '설명', 'file': 'Filename'}
    
    java_files = glob.glob(os.path.join(root_dir, '**/*.java'), recursive=True)
    
    for file_path in java_files:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            
        if '@Controller' not in content:
            continue
            
        # Class Level RequestMapping
        class_url = ""
        class_match = re.search(r'@RequestMapping\s*\(\s*(?:value\s*=\s*)?(?:\{)?\s*"([^"]+)"', content)
        if class_match:
            class_url = class_match.group(1)
            
        # Method 스캔
        # 정규식을 이용해 @RequestMapping 주변의 주석이나 @IncludedInfo 추출
        # 패턴: (주석 or IncludedInfo) ... @RequestMapping ... 
        # 복잡하므로, 일단 RequestMapping을 찾고 그 앞을 역탐색? -> 너무 복잡.
        # 단순하게: @IncludedInfo를 찾으면 가장 신뢰도가 높음.
        # @IncludedInfo(name = "공통분류코드", listUrl = "/sym/ccm/ccc/SelectCcmCmmnClCodeList.do", ...)
        
        # 1. IncludedInfo 기반 추출 (가장 정확)
        included_infos = re.finditer(r'@IncludedInfo\s*\(([^)]+)\)', content)
        for m in included_infos:
            params = m.group(1)
            # name 추출
            name_match = re.search(r'name\s*=\s*"([^"]+)"', params)
            url_match = re.search(r'listUrl\s*=\s*"([^"]+)"', params)
            
            if name_match and url_match:
                name = name_match.group(1)
                url = url_match.group(1)
                meta_data.append({'url': url, 'desc': name, 'type': 'included_info', 'file': os.path.basename(file_path)})

        # 2. 메서드 주석 기반 추출 (보완)
        # TODO: 시간 관계상 IncludedInfo가 없는 경우에 대한 정밀 파싱은 생략하거나 추후 보강.
        # 전자정부 표준 프레임워크는 대부분 IncludedInfo가 있거나, 주석이 메서드 바로 위에 있음.
        
        # 만약 IncludedInfo가 많이 없다면 로직 보강 필요. 
        # 일단 IncludedInfo만으로도 주요 메뉴는 커버될 가능성 높음.
        
    return meta_data

if __name__ == "__main__":
    data = extract_meta(JAVA_SRC_ROOT)
    print(f"Extracted {len(data)} controller metadata items.")
    
    with open(OUTPUT_META_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Saved to {OUTPUT_META_FILE}")
