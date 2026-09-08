-- 제거된 화면을 가리키는 메뉴 2건을 비활성화한다 (2026-09-08 사용자 결정 PD-SRVY-001·PD-MYPG-001).
--
-- [왜 필요한가 — CI 가 잡은 실제 결함]
-- 화면·API 를 걷은 뒤 CI e2e 가 404 로 red 가 됐다:
--   [HTTP 404 GET]: http://localhost:3001/admin/workspace/my-page?_rsc=... (fetch)
-- 프런트 소스에는 그 링크가 남아 있지 않다. 메뉴가 DB 에서 오기 때문이다 —
-- tb_menu_info 의 modern_route 를 사이드바가 그대로 렌더하고, Next.js 가 RSC prefetch 를
-- 보내면서 사라진 라우트에 404 를 맞는다. 즉 **화면을 지우면 메뉴도 함께 정리해야 한다.**
--
-- [2030100 마이페이지관리 — /admin/workspace/my-page]
-- 그 라우트가 사라졌으므로 메뉴는 존재하지 않는 화면으로 보낸다(404). 화면·API·서비스·DTO·
-- 엔티티를 걷은 이유는 PD-MYPG-001 이다 — tb_indv_pg_conts 는 시드도 생성 경로도 없고,
-- 무엇보다 **그 값을 읽는 화면이 없다**(대시보드 위젯 SPI 구현 2개가 이 값을 쓰지 않는다).
-- 켜고 꺼도 어디에도 나타나지 않으므로 소비처를 먼저 정하기로 했다.
--
-- [2010400 응답자관리 — /admin/survey/hub?tab=respondents]
-- 허브는 남지만 그 탭을 걷었다. 메뉴를 그대로 두면 존재하지 않는 탭으로 보내 기본 탭으로
-- 조용히 떨어진다 — 404 보다 덜 눈에 띌 뿐 사용자를 속이는 것은 같다. 표면을 걷은 이유는
-- PD-SRVY-001 이다 — tb_srvy_rspdnt 는 성명·성별·생년월일·전화번호를 담는데 응답 결과
-- (tb_srvy_rslt)와 ID 로 연결돼 있지 않고(결과는 rspns_nm 문자열만) 행을 만드는 코드 경로가
-- 저장소에 없어 **화면이 항상 빈 목록**이었다.
--
-- ⚠ V2_42 는 정확히 반대 작업을 했다(두 메뉴를 use_yn='N' → 'Y' 로 되살림). 그때의 근거는
--   "만들어 놓고 아무도 도달할 수 없는 화면" 을 잇는 것이었고, 지금은 그 화면 자체가 제품에서
--   빠졌다. 같은 판단 기준(메뉴와 화면의 도달 경로를 일치시킨다)의 반대 방향 적용이다.
--
-- [DELETE 가 아니라 use_yn='N' 인 이유]
-- ① V2_30 이 기록한 tb_menu_crt_dtl FK 제약이 그대로다 — 메뉴 행 삭제는 그 참조 정리를 동반한다.
-- ② 되돌리기가 쉽다. 소비처가 생기거나(마이페이지) 응답자 모델이 정리되면 V2_42 와 같은 형태의
--    UPDATE 한 줄로 되살린다.
-- ③ 물리 테이블(tb_indv_pg_conts·tb_srvy_rspdnt)도 남겨 뒀다 — 파괴적 DB 변경은 별도 승인 경계다.
--
-- [멱등성] 대상 menu_sn 과 현재 값(use_yn='Y')을 함께 걸어 재적용 시 0 rows 로 통과한다.

UPDATE tb_menu_info
   SET use_yn = 'N', mdfcn_dt = CURRENT_TIMESTAMP
 WHERE menu_sn IN (
         2030100,  -- 마이페이지관리 → /admin/workspace/my-page   (라우트 제거됨 — 404)
         2010400   -- 응답자관리     → /admin/survey/hub?tab=respondents (탭 제거됨)
       )
   AND use_yn = 'Y';
