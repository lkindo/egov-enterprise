/**
 * 업무면 fill 셸의 공용 클래스(2026-10-05, 카탈로그 §4 'fill 셸').
 *
 * `work-fill:` 은 globals.css 의 `@custom-variant work-fill` 이다 — 폭 lg(64rem) 이상 · 높이 600px 이상 · screen 일 때만
 * 켜진다. 그 조건에서 셸 루트는 최소 `--work-fill-height`(ApplicationFrame 본문 최소 높이에서 lg 패딩 위아래를 뺀 값) 높이의
 * 세로 flex 가 되고, 마지막 작업 영역 하나가 남은 높이를 받는다. 그래서 페이지는 스크롤하지 않고, 스크롤은 작업 영역 안의
 * 주 스크롤 영역 하나가 맡는다. 셸 루트는 `data-work-fill` 표지도 단다 — 같은 조건에서 globals.css 가 그 표지가 있는 화면의
 * 푸터를 숨기고 푸터 몫(`--app-footer-reserve`)을 0 으로 돌려, 셸 높이가 그만큼(5rem) 늘어난다. 이 파일의 클래스만 쓰고 표지를
 * 빼면 푸터가 남고 셸 높이가 5rem 짧아진다(work-fill-shell-contract 가 표지 동반을 검사한다).
 *
 * 무너질 때의 동작(2026-10-05 Chromium 실측, 반박 리뷰 반영 — 푸터를 숨기기 전의 실측이다. 지금은 같은 조건에서 푸터가
 * 숨으므로 아래 '푸터를 덮지 않는다'는 '넘친 내용이 셸·본문 상자 밖으로 그려지지 않는다'는 뜻으로 읽는다):
 * - 창이 낮아 머리(브레드크럼·제목·조회 조건·알림)만으로 남은 높이를 다 쓰면, 작업 영역은 바닥값(12rem)을 지키고 셸 루트가
 *   그만큼 길어진다 — 페이지가 스크롤할 뿐 내용이 푸터를 덮지 않는다(루트가 고정 높이였을 때는 넘친 내용이 푸터 아래로
 *   그려지고 작업 영역이 0px 로 줄었다).
 * - 소비 화면이 작업 영역에서 주 스크롤 영역까지 세로 flex 사슬을 끊어도, 주 스크롤 영역은 셸 높이로 상한이 걸려 고정
 *   머리글·안쪽 스크롤을 유지하고, 넘친 부분은 작업 영역 자신이 스크롤한다(안전판) — 푸터를 덮지 않는다.
 *
 * 조건 밖(좁은 화면·낮은 창·브라우저 확대)에서는 이 클래스들이 아무 일도 하지 않아 기본 배치 그대로 쌓이고, 인쇄에서는
 * 높이 제한과 내부 스크롤을 풀어 내용을 펼친다. 렌더를 너비로 가르지 않는다(ADR-0006) — 같은 DOM 에 CSS 만 바뀐다.
 *
 * ⚠ 클래스 문자열은 완전한 리터럴로 둔다. Tailwind 는 소스의 문자열을 그대로 스캔하므로 조립한 클래스는 생성되지 않는다.
 */

/**
 * 셸 루트 — 최소 화면 높이의 세로 flex. 고정 height 가 아니라 min-height 다: 머리가 길어 남은 높이가 바닥값보다 작으면
 * 루트가 늘어나 페이지가 스크롤한다(내용이 루트 밖으로 넘쳐 푸터를 덮지 않는다).
 */
export const WORK_FILL_ROOT_CLASS = 'work-fill:flex work-fill:min-h-[var(--work-fill-height)] work-fill:flex-col';

/**
 * 셸의 마지막 작업 영역(WorkListPage 콘텐츠 영역·MasterDetailPage 마스터·상세 격자) — 남은 높이를 받는다.
 * - `flex-[1_1_0px]`: 기준 크기가 0px(확정값)이라 내용 높이와 무관하게 남은 높이만 받는다. `flex-1`(0%)은 루트 높이가 확정되지
 *   않은(min-height) 세로 flex 에서 내용 크기로 취급돼 페이지가 다시 스크롤한다(실측).
 * - `min-h-[12rem]`: 바닥값. 이보다 낮아지면 루트가 늘어난다(위 '무너질 때').
 * - `overflow-y-auto` + `relative`: 사슬이 끊겼을 때의 안전판. 정상이면 넘치지 않아 스크롤바가 없다. 스크롤 상자이므로 안쪽
 *   sr-only 가 상자에 잘리도록 relative 를 둔다(카탈로그 §4 relative 원칙).
 * - `-m-1 p-1`: 스크롤 상자 가장자리에서 안쪽 요소의 포커스 링(3px)이 잘리지 않게 4px 안쪽 여백을 두고, 같은 만큼 바깥 여백을
 *   당겨 배치는 그대로 둔다.
 * display(flex·grid)는 쓰는 쪽이 정한다.
 */
export const WORK_FILL_CONTENT_CLASS = 'work-fill:relative work-fill:-m-1 work-fill:min-h-[12rem] work-fill:flex-[1_1_0px] work-fill:overflow-y-auto work-fill:p-1';

/** 작업 영역 안에서 남은 높이를 다시 넘겨받는 중간 고리(그 자신도 세로 flex 라 자식 하나가 다시 남은 높이를 받을 수 있다). */
export const WORK_FILL_REGION_CLASS = 'work-fill:flex work-fill:min-h-0 work-fill:flex-1 work-fill:flex-col';

/**
 * 주 스크롤 영역 — 조건 안에서는 남은 높이를 채우고, 인쇄에서는 높이 제한과 내부 스크롤을 푼다. 상한은 지우지 않고 셸 높이로
 * 둔다(`max-h-none` 이 아니다): 사슬이 끊겨 남은 높이를 못 받으면 내용 높이로 커지는데, 상한이 있어야 상자가 안쪽에서
 * 스크롤하며 고정 머리글·고정 첫 열을 유지한다. 바닥값(6rem — 고정 머리글과 한두 행)은 창이 낮을 때 상자가 0px 로 줄어 쓸 수
 * 없게 되는 것을 막는다(실측: 1280x720 상세 칸 안 권한 상자 19px). 그때는 바깥 칸이 대신 스크롤한다.
 */
export const WORK_FILL_SCROLL_CLASS = 'work-fill:max-h-[var(--work-fill-height)] work-fill:min-h-[6rem] work-fill:flex-1 print:max-h-none print:overflow-visible';

/** 높이 제한이 없는 칸(조건 안에서는 부모가 높이를 준다)의 인쇄 펼침. */
export const WORK_FILL_PANE_PRINT_CLASS = 'print:max-h-none print:overflow-visible';

/**
 * MasterDetailPage 칸이 자식에게 남은 높이를 넘길 때(masterFillChild·detailFillChild) — 칸을 세로 flex 로 바꾼다. 칸의 직계
 * 자식은 `WORK_FILL_REGION_CLASS`(중간 고리)나 `fill` 스크롤 상자여야 한다. 칸의 overflow-auto 는 그대로 두어 사슬이 끊겨도
 * 칸이 스크롤한다.
 */
export const WORK_FILL_PANE_CHAIN_CLASS = 'work-fill:flex work-fill:flex-col';
