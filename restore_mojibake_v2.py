import sys
import os
import re

# Reconfigure stdout to use UTF-8
if sys.stdout.encoding != 'utf-8':
    try:
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    except:
        pass

# Comprehensive mapping of Mojibake patterns to Korean
# Including those with '?' remnants as requested by user
mojibake_map = {
    # Blocks with '?'
    "?덇굅님": "레거시",
    "?명솚님": "호환성",
    "諛?": "및", 
    "愿€由ъ옄": "관리자",
    "愿€由?": "관리",
    "愿€由": "관리",
    "님보안": "보안",
    "님誘쇨컧님": "민감",
    "님寃쎈줈": "경로",
    "寃쎈줈": "경로",
    "蹂댄샇": "보호",
    "시스템사용자보안": "시스템 사용자 보안",
    "민감愿€由": "민감 관리",
    "?깃났?곸쑝濡님": "성공적으로",
    "섏젙?섏뿀?듬땲님": "수정되었습니다",
    "寃뚯떆湲€님": "게시글이",
    "寃뚯떆湲€": "게시글",
    "님젣님": "삭제",
    "?ㅽ뙣": "실패",
    "?€?μ뿉": "요청에",
    "?낅젰?섏꽭님": "입력하세요",
    "?낅젰?댁＜?몄슂": "입력해주세요",
    "寃€?됱뼱瑜": "검색어를",
    "?덈줈님": "새로운",
    "怨듭??ы빆": "공지사항",
    "?깅줉?섏뿀?듬땲??": "등록되었습니다",
    "섏뿀?듬땲??": "되었습니다",
    "?ㅽ겕?⑸챸": "스크랩명",
    "?쒓퀎님": "시계열",
    "님?뺤떇": "정형",
    "?곗씠님": "데이터",
    "臾닿껐님": "무결성",
    "?쒓컙님": "시간",
    "님異붿씠": "추이",
    "?뺤씤": "확인",
    "?щ?": "여부",
    "?€湲?以묒씤": "대기 중인",
    "寃곗옱": "결재",
    "?명뀛由ъ쟾님": "인텔리전스",
    "?뚰겕?뚮줈님": "워크플로우",
    "?ㅼ떆媛님": "실시간",
    "留ㅽ듃由?뒪": "매트릭스",
    "?숆린님": "동기화",
    "吏€?앷낵": "지식과",
    "?곴컧님": "영감",
    "님蹂닿님": "보고",
    "異붽님섏꽭님": "추가하세요",
    "?ㅽ겕님": "스크랩",
    "?쒕ぉ": "제목",
    "吏곴님곸쑝濡님": "직관적으로",
    "님?섏씠吏€": "페이지",
    "?섏딄긽?곸쑝濡님": "정상적으로",
    "?덉뒿?덈떎": "있습니다",
    "?щ컮瑜?": "올바른",
    "二쇱냼瑜님": "주소를",
    "?명뀛": "인텔",
    "?곗씠?곗뀑": "데이터셋",
    "異붿씠": "추이",
    "寃뚯떆臾님": "게시물",
    "蹂닿퀬님": "보고",
    "諛?...": "및...",
    "?덉젙님": "설정",
    "?섏쐞": "하위",
    "由此щ떎?대젆님": "리다이렉트",
}

def safe_restore(text):
    # 1. Structural Fixes for broken JSX tags (e.g. ?/p> or ?<div)
    text = re.sub(r'(\s+)\?\/\s*([a-zA-Z0-9]+)>', r'\1</\2>', text)
    text = re.sub(r'(\s+)\?<\s*([a-zA-Z0-9]+)', r'\1<\2', text)
    text = re.sub(r'\?/\s*([a-zA-Z0-9]+)>', r'</\1>', text)
    text = re.sub(r'\?<\s*([a-zA-Z0-9]+)', r'<\1', text)
    
    # 2. Advanced Heuristic: '?' connected to Mojibake (Non-Korean Non-ASCII)
    # The user specifically requested to fix '?' connected to Korean (Mojibake)
    # This regex looks for '?' adjacent to characters that are NOT Korean and NOT ASCII.
    # [^\x00-\x7F\uac00-\ud7af] matches characters that are neither ASCII nor Hangul Syllables.
    text = re.sub(r'([^\x00-\x7F\uac00-\ud7af])\?+', r'\1', text) 
    text = re.sub(r'\?+([^\x00-\x7F\uac00-\ud7af])', r'\1', text) 

    # 3. Pattern based restoration
    for bad in sorted(mojibake_map.keys(), key=len, reverse=True):
        good = mojibake_map[bad]
        text = text.replace(bad, good)
    
    return text

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8-sig', errors='ignore') as f:
            content = f.read()
        
        new_content = safe_restore(content)
        
        if new_content != content:
            print(f"Restored: {filepath}")
            with open(filepath, 'w', encoding='utf-8-sig') as f:
                f.write(new_content)
            return True
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
    return False

if __name__ == "__main__":
    directory = "frontend/src"
    count = 0
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.js', '.jsx', '.css')):
                path = os.path.join(root, file)
                if process_file(path):
                    count += 1
    print(f"Total files restored: {count}")
