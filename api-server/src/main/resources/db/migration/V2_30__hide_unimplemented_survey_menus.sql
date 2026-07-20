-- 미구현 스텁 탭을 가리키던 설문 메뉴를 감추고, 잘못 연결된 '온라인poll관리'를 실화면에 잇는다.
--
-- [문제]
-- V2_2 시드의 설문 하위 메뉴 다섯이 /admin/survey/hub 의 탭을 가리키는데, 그 탭들이 실기능이
-- 아니었다. 허브(SurveyHubClient)에서 실제로 화면을 렌더하는 탭은 manage / stats 둘뿐이고
-- 나머지는 "준비 중 (미구현)" 문구만 띄우는 껍데기(PlaceholderCard)였다.
--
--   2010600 항목관리       ?tab=items       ← 허브에 items 탭이 **존재한 적도 없다**
--   2010500 질문관리       ?tab=questions   ← 껍데기
--   2010400 응답자관리     ?tab=respondents ← 껍데기
--   2010300 설문템플릿관리 ?tab=templates   ← 껍데기
--   2010700 온라인poll관리 ?tab=templates   ← 껍데기이자 2010300 과 **중복**
--
-- 즉 설문 메뉴 7개 중 4개는 눌러도 "아직 제공되지 않는 기능입니다" 만 나오고, 1개는 아예
-- 없는 탭이라 기본 탭으로 튕겼다. 메뉴가 있다는 것 자체가 기능이 있다는 거짓 신호였다.
--
-- [조치 1 — 2010700 은 감추지 않고 고친다]
-- 이름만 보고 스텁으로 묶을 뻔했으나 실측 결과 **온라인 여론조사는 완제품이다.**
--   · 화면  frontend/src/app/admin/survey/polls/page.tsx + OnlinePollAdminClient.tsx(433줄)
--   · 서비스 frontend/src/services/foundation/system/OnlinePollAdminService.ts (목록/상세/등록/수정)
--   · API   OnlinePollApiController.java (+ OnlinePollApiControllerTest)
-- 그런데 이 실화면 /admin/survey/polls 를 가리키는 메뉴가 **DB 전체에 0건**이었다(실측).
-- 다 만들어 둔 기능이 메뉴에서 도달 불가능한 상태였고, 그 자리를 스텁 탭 링크가 차지하고
-- 있었다. 감추는 대신 올바른 경로로 잇는다.
-- (주의: 형제 경로 /admin/survey/polls/manage 는 껍데기다. 실기능은 인덱스 쪽이다.)
--
-- [조치 2 — 나머지 넷은 감춘다]
-- 2010300/2010400/2010500/2010600 은 구현 범위가 정해질 때까지 use_yn='N'.
-- 동반 코드 변경: SurveyHubClient 의 해당 탭 4개(questions/respondents/templates/settings)를
-- 탭 목록에서 제거했다. settings('시스템 연동')는 대응 메뉴가 없는 고아 탭이라 UI 에서만 정리된다.
-- 허브에는 알 수 없는 tab 값을 기본 탭(manage)으로 흡수하는 폴백이 있으므로, 기존 북마크나
-- 외부 링크가 ?tab=questions 등으로 들어와도 빈 화면이 되지 않는다.
--
-- [삭제하지 않는 이유]
-- tb_menu_crt_dtl(menu_sn, authrt_cd) 이 menu_sn 을 PK 로 참조한다(V2_12 FK). 네 메뉴 각각
-- ROLE_ADMIN/ROLE_USER 2행씩 총 8행이 걸려 있다(실측). 물리 삭제하면 권한 매핑까지 정리해야
-- 하고 되돌릴 수 없다. use_yn='N' 은 사이드바에서만 감춰지고 매핑은 그대로 남는다
-- (MenuRepositoryImpl 이 useYn.eq("Y") 로 거른다). V2_27/V2_28 이 이미 채택한 방식이다.
--
-- [되살리는 방법] 기능 구현 후 해당 menu_sn 을 use_yn='Y' 로 되돌리고, modern_route 를 실제
-- 화면 경로로 맞춘 뒤 SurveyHubClient 에 탭을 다시 추가한다.
--
-- [멱등성] 모든 문장이 대상 menu_sn 과 현재 값 조건을 함께 걸어 재적용 시 0 rows 로 통과한다.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) 2010700 '온라인poll관리' — 스텁 탭 링크를 실제 온라인 여론조사 관리 화면으로 교체.
--    감추지 않는다. 유일하게 구현이 끝나 있는데도 도달 경로만 끊겨 있던 메뉴다.
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE tb_menu_info
   SET modern_route = '/admin/survey/polls', mdfcn_dt = CURRENT_TIMESTAMP
 WHERE menu_sn = 2010700
   AND modern_route = '/admin/survey/hub?tab=templates';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) 스텁/부재 탭을 가리키던 네 메뉴 비활성화.
--    네 행 모두 자식 0건(실측)이라 트리 구조가 끊기지 않는다.
--    부모 2010000 은 남는 자식(2010210 통계 · 2010700 온라인poll관리 · 2010800 poll참여)이
--    있어 빈 폴더가 되지 않는다.
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE tb_menu_info
   SET use_yn = 'N', mdfcn_dt = CURRENT_TIMESTAMP
 WHERE menu_sn IN (
         2010300,  -- 설문템플릿관리 → ?tab=templates   (껍데기)
         2010400,  -- 응답자관리     → ?tab=respondents (껍데기)
         2010500,  -- 질문관리       → ?tab=questions   (껍데기)
         2010600   -- 항목관리       → ?tab=items       (탭 자체가 부재)
       )
   AND use_yn = 'Y';

-- ─────────────────────────────────────────────────────────────────────────────
-- [남겨두는 것 — 의도적]
-- · 2010000 '설문 및 여론조사 관리'(?tab=manage), 2010210 '설문 통계 및 결과 분석'(?tab=stats)
--   → 허브의 실기능 탭 둘. 그대로 둔다.
-- · 2010800 '온라인poll참여' → /admin/survey/polls/participate 는 실화면이다
--   (OnlinePollParticipateClient.tsx 300줄). 그대로 둔다.
-- · 2010900 '📝 온라인 설문 참여' → /survey 도 실화면(테스트 포함)이다. 그대로 둔다.
-- · tb_menu_crt_dtl 의 권한 매핑 8행은 손대지 않는다 — 복구 시 그대로 재사용된다.
-- · V2_2 원본 시드는 수정하지 않는다(Flyway 체크섬 불변).
--
-- [별건으로 남기는 것]
-- · frontend/src/app/admin/survey/{items,questions,respondents,templates,polls/manage}/page.tsx
--   다섯 개는 어느 메뉴도 가리키지 않는 고아 스텁 라우트다(실측: 참조 메뉴 0건).
--   삭제는 라우트 정리 건으로 분리한다 — 문자열 URL 참조는 정적 분석으로 잡히지 않아
--   일괄 삭제가 위험하다(과거 라우트 13개 오삭제 선례).
-- · 2010700 의 메뉴명 '온라인poll관리'는 한/영 혼용 레거시 명칭이다. 화면 제목('온라인 설문
--   관리')과 어휘가 어긋나나, 이번 승인 범위(감추기)를 넘어서므로 개명은 별건으로 둔다.
-- ─────────────────────────────────────────────────────────────────────────────
