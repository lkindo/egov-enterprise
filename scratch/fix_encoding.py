import os
import re

# Dictionary of mangled strings and their correct Korean counterparts
REPLACEMENTS = {
    '紐⑸줉': '목록',
    '議고쉶': '조회',
    '議곌굔': '조건',
    '寃€님': '검색',
    '寃뚯떆': '게시',
    '?뺤콉': '정책',
    '?뺣낫': '정보',
    '?섏씠吏€': '페이지',
    '愿몃━먭?': '관리자가',
    '쒖뒪?': '시스템',
    '媛쒖씤?뺣낫': '개인정보',
    '鍮꾩젙님': '비정형',
    '諛곕꼫': '배너',
    '洹몃９': '그룹',
    '遺€님': '부서',
    '沅뚰븳': '권한',
    '怨듯넻肄붾뱶': '공통코드',
    '遺꾨쪟肄붾뱶': '분류코드',
    '?됱젙肄붾뱶': '행정코드',
    '諛쒖떊': '발신',
    '?섏떊': '수신',
    '履쎌?': '쪽지',
    '硫붾돱': '메뉴',
    '肄붾뱶': '코드',
    '紐⑤뱺': '모든',
    '議고쉶⑸땲??': '조회합니다',
    '?꾩껜': '전체',
    '?볤?': '댓글',
    '??젣': '삭제',
    '鍮꾪솢?깊솕': '비활성화',
    '泥섎━⑸땲??': '처리합니다',
    '?쒖뒪?쒖뿉': '시스템에',
    '?좎껌님': '신청',
    '님님': '...',
    '湲곗님': '기준',
    '濡님泥님': '로그인처리',
    '臾명빆': '문항',
    '?쒗뵆由': '템플릿',
    '肄넗?뀗痢': '콘텐츠',
    '留덉씠?섏씠吏€': '마이페이지',
    '쒖뒪???댁쓽': '시스템 내의',
    '?섏씠吏뺥븯님': '페이지네이션하여',
    '?섏씠吏€ㅼ씠?섑븯님': '페이지네이션하여',
    'ъ슜?먭?': '사용자가',
    '?앹꽦님': '생성',
    '먮뒗': '또는',
    '怨듦컻님': '공개',
    '湲곌컙': '기간',
    '?댁뿉': '내에',
    '?덈뒗': '있는',
    '로그?명븳': '로그인한',
    'ъ슜?먯쓽': '사용자의',
    '吏곸젒': '직접',
    '諛솚': '반환',
    '?듯빀': '통합',
    '留곹겕': '링크',
    '?쇰컲?뚯썝': '일반회원',
    '湲곗뾽?뚯썝': '기업회원',
    '?앹뾽': '팝업',
}

def fix_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        for mangled, correct in REPLACEMENTS.items():
            content = content.replace(mangled, correct)
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
    except Exception:
        pass
    return False

def main():
    search_dirs = [
        r'd:\project\egov-enterprise\frontend\src',
        r'd:\project\egov-enterprise\api-server\src',
        r'd:\project\egov-enterprise\business-suite\src'
    ]
    
    fixed_count = 0
    for search_dir in search_dirs:
        for root, dirs, files in os.walk(search_dir):
            for file in files:
                if file.endswith(('.ts', '.tsx', '.java', '.md')):
                    if fix_file(os.path.join(root, file)):
                        fixed_count += 1
    print(f"Total files fixed: {fixed_count}")

if __name__ == "__main__":
    main()
