-- 설문 문항·템플릿·응답자 메뉴를 되살린다 — V2_30 이 명시한 복원 절차의 실행.
--
-- [배경]
-- V2_30 은 "구현 범위가 정해질 때까지" 네 메뉴를 use_yn='N' 으로 감췄고, 되살리는 방법을
-- 함께 적어 두었다: "기능 구현 후 해당 menu_sn 을 use_yn='Y' 로 되돌리고 modern_route 를
-- 실제 화면 경로로 맞춘 뒤 SurveyHubClient 에 탭을 다시 추가한다."
-- 이번 변경이 그 세 조건을 모두 충족한다.
--
-- [동반 코드 변경 — 이 마이그레이션 단독으로는 의미가 없다]
--   frontend/src/app/admin/survey/hub/SurveyHubClient.tsx
--     SURVEY_TABS 에 questions/templates/respondents 추가 + TabTrigger·TabsContent 배선
--   frontend/src/app/admin/survey/components/SurveyQuestionsPanel.tsx   (신규)
--   frontend/src/app/admin/survey/components/SurveyTemplatesPanel.tsx   (신규)
--   frontend/src/app/admin/survey/respondents/SurveyRespondentsClient.tsx (기존 재사용)
-- 세 탭 모두 백엔드 CRUD 가 이미 있었고 화면만 없었다. 껍데기 카드는 만들지 않았다.
--
-- [응답자 메뉴(2010400)를 함께 되살리는 이유 — 결함 정정]
-- 응답자 관리 화면은 이미 만들어져 있었다(2026-08-05, PR #301). 그런데
--   · 그 화면은 /admin/survey/respondents 라는 독립 라우트에 있었고
--   · 어떤 화면·메뉴도 그 경로를 가리키지 않았으며(진입 링크 0건, 실측)
--   · 유일한 관련 메뉴 2010400 은 /admin/survey/hub?tab=respondents 를 가리키는데
--     그 탭이 허브에 없었고 메뉴 자체도 use_yn='N' 이었다.
-- 즉 만들어 놓고 아무도 도달할 수 없는 화면이었다 — 이 저장소가 반복해 겪은
-- "완성됐는데 도달 불가" 와 같은 부류다(#304 UnreachableServiceLinterTest 참조).
-- 허브 탭으로 편입해 메뉴 → 탭 → 화면 경로를 잇는다.
--
-- [2010600 '항목관리' 는 되살리지 않는다 — 의도적]
-- 항목(tb_srvy_artcl)은 문항 하위 자원이라 소속 문항 없이는 의미가 없다. 독립 화면을 만들면
-- "어느 문항의 항목인가" 를 사용자가 매번 지정해야 해 오히려 나빠진다. 문항 관리 탭 안에서
-- 문항별로 함께 다룬다. 허브에 items 탭이 존재한 적이 없다는 V2_30 의 실측과도 정합한다.
-- 이 메뉴 행은 use_yn='N' 으로 남는다(삭제하지 않는 이유는 V2_30 의 tb_menu_crt_dtl FK 설명 참조).
--
-- [modern_route 는 그대로 둔다]
-- 세 메뉴 모두 이미 /admin/survey/hub?tab=<키> 를 가리키고 있고, 그 키가 이제 실제 탭이다.
-- 경로를 바꿀 이유가 없다.
--
-- [멱등성] 대상 menu_sn 과 현재 값(use_yn='N')을 함께 걸어 재적용 시 0 rows 로 통과한다.

UPDATE tb_menu_info
   SET use_yn = 'Y', mdfcn_dt = CURRENT_TIMESTAMP
 WHERE menu_sn IN (
         2010300,  -- 설문템플릿관리 → ?tab=templates   (SurveyTemplatesPanel)
         2010400,  -- 응답자관리     → ?tab=respondents (SurveyRespondentsClient)
         2010500   -- 질문관리       → ?tab=questions   (SurveyQuestionsPanel)
       )
   AND use_yn = 'N';
