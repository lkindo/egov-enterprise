-- 워크스페이스(1000000) 하위 메뉴의 라우팅 값 중복 해소
--
-- [배경]
-- /admin/work-hub 화면은 WorkHubClient 가 tab 쿼리로 갈라 렌더한다. 지원 값은 'job' | 'report' | 'calendar'
-- 세 가지뿐이다(frontend/src/app/admin/work-hub/WorkHubClient.tsx). 그런데 메뉴 데이터 두 건이 어긋나
-- 사이드바의 활성 메뉴가 실제 클릭한 항목과 다르게 표시됐다.
--
-- [결함 1] menu_sn 1040000 '업무 보고 및 보고함' 이 부모인 1000000 '워크스페이스' 와 똑같이
--          /admin/work-hub 를 가리켰다. 쿼리로 구분되지 않아 두 메뉴가 동시에 활성으로 판정된다.
--          → 자신의 대표 화면인 ?tab=report 로 특정한다.
--
-- [의도적 미조치] 1040100 '부서 업무 관리' 와 1040200 '업무 보고 관리' 는 둘 다 ?tab=report 로 남긴다.
--          1040100 의 prgrm_file_nm 은 selectDeptJobBxList 라 기능만 보면 job 탭이 맞아 보이지만,
--          실제로 ?tab=job 으로 바꿔 검증하니 형제 1010000 '개인 및 부서 일정'(?tab=job)과 같은 위치를
--          가리키게 되고, 사이드바가 자식 매칭으로 부모를 강조하는 규칙(subtreeMatchesLocation) 때문에
--          부모 1040000 '업무 보고 및 보고함' 까지 활성으로 전파됐다. 이는 이 마이그레이션이 고치려던
--          바로 그 증상("개인 및 부서 일정을 눌러도 업무 보고 및 보고함이 선택됨")의 재발이다.
--          형제끼리 같은 탭을 공유하는 것은 사용자에게 보이는 결함이 아니므로 현 상태를 유지한다.
--          (메뉴 6건이 탭 3개짜리 화면 하나를 가리키는 구조라 1:1 대응 자체가 성립하지 않는다.
--           메뉴 트리 재설계는 제품 결정 사항으로 남긴다.)
--
-- [멱등성] menu_sn 과 기존 값을 함께 지정하므로 재적용 시 0 rows 로 무해하게 통과한다.
--          기존 마이그레이션(V2_2)을 고치면 Flyway checksum 이 깨져 기동이 막히므로 신규 파일로 분리했다.

UPDATE tb_menu_info
   SET modern_route = '/admin/work-hub?tab=report',
       mdfcn_dt     = CURRENT_TIMESTAMP
 WHERE menu_sn = 1040000
   AND modern_route = '/admin/work-hub';
