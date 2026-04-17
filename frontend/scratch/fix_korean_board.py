
import os

files = [
    r"d:\project\egov-enterprise\frontend\src\app\admin\community\boards\selectBoardList\BoardListClient.tsx",
    r"d:\project\egov-enterprise\frontend\src\app\admin\community\boards\maker\components\BoardMakerWizard.tsx",
    r"d:\project\egov-enterprise\frontend\src\app\admin\community\boards\selectBoardArticle\[id]\BBSDetailClient.tsx",
    r"d:\project\egov-enterprise\frontend\src\app\admin\community\boards\selectBoardArticle\[id]\page.tsx",
    r"d:\project\egov-enterprise\frontend\src\app\admin\community\boards\maker\components\BoardPreview.tsx"
]

replacements = {
    # BoardListClient Specific (Mangled UTF-8/CP949)
    "留덉뒪??肄섏넄": "마스터 콘솔",
    "?좉퇋 ?깅줉": "신규 등록",
    "怨듭??ы빆": "공지사항",
    "寃뚯떆??": "게시판",
    "吏€???덈툕": "지식 허브",
    "??寃뚯떆?먯쓽 ?쒕룞?댁뿭怨?理쒖떊 ?뚯떇???뺤씤?섏꽭??": "전체 게시판의 활동 내역과 최신 소식을 확인하세요.",
    "寃€??議곌굔": "검색 조건",
    "紐⑸줉 議고쉶?먮뒗 ?ㅽ뀗 ?ㅻ쪟媛€ 諛쒖깮?덉뒿?덈떎.": "목록 조회 중에 시스템 오류가 발생했습니다.",
    "?깅줉??紐⑤뱺 寃뚯떆臾쇱쓣 ?쒕룞?쇰줈 遺꾩꽍? Dis쒖뿬 ?듦퀎瑜?泥섎━?⑸땲??": "등록된 모든 게시물을 자동으로 분석하여 통계를 처리합니다.",
    "理쒖떊 7???몃옖?뱽 異붿씠": "최근 7일 트래픽 추이",
    "?묒꽦??遺꾪룷": "작성자 분포",
    "寃뚯떆臾쇱쓣 ?묒꽦?섏뿬 지식 ?덈툕瑜?梨꾩썙二쇱꽭??": "게시물을 작성하여 지식 허브를 채워주세요.",
    "?쒕줈 ?뚯뒇?섍퀬 蹂댁셿?섎ŉ ?꾪븿??媛€移섎? 留뚮뱾?닿컩?덈떎.": "서로 소통하고 보완하며 귀중한 가치를 만들어갑니다.",
    "寃뚯떆臾??곸꽭 ??": "게시물 상세 보기",
    "?대떦 寃뚯떆?먯쓽 ?쒕룞?댁뿭怨?理쒖떊 ?뚯떇???뺤씤?섏꽭??": "해당 게시판의 활동 내역과 최신 소식을 확인하세요.",
    
    # Common Patterns
    "?쒕ぉ": "제목",
    "?댁슜": "내용",
    "?묒꽦??": "작성자",
    "?대뼡 ?뺣낫瑜?李얠쑝?쒕굹??": "어떤 정보를 찾으시나요?",
    "寃€?됱“嫄?": "검색조건",
    "議고쉶": "조회",
    "?뺣젹 諛⑹떇": "정렬 방식",
    "理쒖떊??": "최신순",
    "議고쉶?섏닚": "조회수순",
    "?볤???": "댓글순",
    "?볤?": "댓글",
    "議고쉶??": "조회수",
    "而ㅻ??덊떚": "커뮤니티",
    "?듬챸 ?ъ슜??": "익명 사용자",
    "紐⑸줉 議고쉶": "목록 조회",
    "湲€ ?쎄린": "글 읽기",
    "湲€ ?곌린": "글 쓰기",
    "?볤? ?묒꽦": "댓글 작성",
    "愿€由ъ옄": "관리자",
    "?쇰컲 ?ъ슜??": "일반 사용자",
    "寃뚯떆臾쇱씠 ?놁뒿?덈?": "게시물이 없습니다.",
    "寃€?됰맂 寃뚯떆臾쇱씠 ?놁뒿?덈?": "검색된 게시물이 없습니다.",
    "寃뚯떆??紐낆묶?€ 理쒖냼 2湲€???댁긽?댁뼱???⑸땲??": "게시판 명칭은 최소 2글자 이상이어야 합니다.",
    "湲곕낯 ?뺣낫 ?낅젰": "기본 정보 입력",
    "?쒖씠?꾩슐 諛?沅뚰븳 ?ㅼ젙": "레이아웃 및 권한 설정",
    "理쒖쥌 ?뺤씤 諛?留덈Т由?": "최종 확인 및 마무리",
    "?대뵒?꾨줈??以?..": "에디터 로드 중...",
    "?댁쟾?쇰줈": "이전으로",
    "泥섎━ 以?..": "처리 중...",
    "?€?ν븯湲?": "저장하기",
}

for path in files:
    if not os.path.exists(path):
        continue
    with open(path, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()

    for old, new in replacements.items():
        content = content.replace(old, new)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed {os.path.basename(path)}")
