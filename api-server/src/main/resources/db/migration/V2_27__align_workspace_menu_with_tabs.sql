-- 워크스페이스 메뉴를 work-hub 의 탭 구조(job / report / calendar)에 1:1 로 정렬한다.
--
-- [배경]
-- /admin/work-hub 는 tab 쿼리로 세 화면을 렌더한다(WorkHubClient: 'job' | 'report' | 'calendar').
-- 그런데 메뉴는 다섯 개가 이 한 화면을 가리키고 있었고, 이름·탭·화면 제목이 서로 다른 어휘를 써서
-- 어느 메뉴를 눌러도 기대와 다른 화면이 열리는 것처럼 보였다.
--
--   1010000 개인 및 부서 일정   ?tab=job       ← 이름은 '일정'인데 업무함이 열린다
--   1010200 일정 관리           ?tab=calendar
--   1040000 업무 보고 및 보고함  ?tab=report
--   1040100 부서 업무 관리      ?tab=report    ← 상위와 완전히 같은 화면
--   1040200 업무 보고 관리      ?tab=report    ← 상위와 완전히 같은 화면
--
-- 1040100(selectDeptJobBxList = 부서 업무함)은 기능상 job 탭이 맞지만, 그렇게 바꾸면 형제인
-- 1010000(?tab=job)과 같은 위치를 가리키게 되고 사이드바의 '자식이 활성이면 부모도 강조' 규칙 때문에
-- 부모(1040000)까지 활성으로 전파되어, 이 정리가 없애려던 증상이 그대로 재발한다.
-- 근본 원인은 메뉴 다섯이 탭 셋에 대응하려는 구조 자체이므로 메뉴 쪽을 탭에 맞춘다.
--
-- [조치] 탭 3개 = 메뉴 3개. 이름을 화면과 일치시키고 셋을 워크스페이스 직속 형제로 둔다.
--   1010000 → '업무 워크플로우' (?tab=job)
--   1010200 → '일정 캘린더'     (?tab=calendar), 상위를 워크스페이스로 승격
--   1040000 → '업무 보고'       (?tab=report)
--   1040100 / 1040200 → use_yn='N' 으로 비활성화(중복)
--
-- [삭제하지 않는 이유] tb_user_authrt_map 등이 menu_sn 을 참조한다. 물리 삭제하면 권한 매핑까지
-- 정리해야 하고 되돌리기 어렵다. use_yn='N' 은 사이드바에서만 감춰지고 언제든 복구할 수 있다.
--
-- [멱등성] 대상 menu_sn 을 지정하고 현재 값 조건을 함께 걸어 재적용 시 0 rows 로 통과한다.

-- 1) 업무 워크플로우 — 이름을 실제로 열리는 화면(업무 워크플로우 매트릭스)과 일치시킨다.
UPDATE tb_menu_info
   SET menu_nm = '업무 워크플로우', mdfcn_dt = CURRENT_TIMESTAMP
 WHERE menu_sn = 1010000
   AND menu_nm = '개인 및 부서 일정';

-- 2) 일정 캘린더 — 이름 정정 + 워크스페이스 직속으로 승격(종전에는 1010000 의 자식이었다).
UPDATE tb_menu_info
   SET menu_nm = '일정 캘린더', up_menu_sn = 1000000, mdfcn_dt = CURRENT_TIMESTAMP
 WHERE menu_sn = 1010200
   AND menu_nm = '일정 관리';

-- 3) 업무 보고 — 이름 축약(하위 중복이 사라지므로 '및 보고함' 표기가 불필요해진다).
UPDATE tb_menu_info
   SET menu_nm = '업무 보고', mdfcn_dt = CURRENT_TIMESTAMP
 WHERE menu_sn = 1040000
   AND menu_nm = '업무 보고 및 보고함';

-- 4) 중복 메뉴 비활성화 — 둘 다 상위(1040000)와 완전히 같은 ?tab=report 를 가리킨다.
UPDATE tb_menu_info
   SET use_yn = 'N', mdfcn_dt = CURRENT_TIMESTAMP
 WHERE menu_sn IN (1040100, 1040200)
   AND use_yn = 'Y';
