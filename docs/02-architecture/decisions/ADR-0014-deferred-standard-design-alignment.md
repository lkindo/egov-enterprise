# ADR-0014: 보류 6개 컬럼의 표준 설계 정합

- 상태: Accepted
- 결정일: 2026-09-09
- 승인: 사용자가 보류 6개 권장안을 검토하고, 변경일자가 별도 컬럼임을 확인한 뒤 권장안대로 작업 진행을 요청했다.
- 선행: [ADR-0013](ADR-0013-standard-text-length-alignment.md)

## 문제와 실측 근거

OCI Flyway 2.93을 읽기 전용으로 확인했다. 프로그램 18행, 역할 매핑 34행은 정상 연결돼 있다. 메뉴 84행의 프로그램 값은 모두 프로그램 목록과 불일치하지만, 70행은 독립적인 modern_route가 있고 14행은 자식이 있는 dir 또는 / 폴더다. 메뉴 프로그램 값은 실제 권한 매핑의 키와 같은 의미로 사용되지 않았다.

기관코드 원장과 수신 로그는 각각 0행이며, 둘 다 변경일자 chg_ymd(VARCHAR(8), 연월일C8)와 변경시각 chg_tm(VARCHAR(20), 시분초C6)을 별도 보유한다. 주민번호는 사용자 7행 모두 NULL이며 저장 경로는 ARIA/Base64 암호문이다. 표준 사전에 사용자암호화주민등록번호(USER_ENRRNO, 암호화번호V256)가 이미 존재한다.

## 결정

1. tb_prgrm_lst, tb_role_prgrm_map, tb_menu_info의 prgrm_file_nm을 표준 명V300에 맞춘다. 기존 PK 전략·식별값·역할 매핑은 유지한다.
2. 메뉴 라우트와 선택적인 프로그램 연결을 분리한다. 기존 프로그램에 일치하는 연결은 보존한다. 미일치 값은 독립 modern_route가 있거나 자식을 가진 명시적 폴더인 경우에만 NULL로 정리한다. 그 밖의 미해결 레거시 경로가 하나라도 있으면 migration을 중단한다. 메뉴→프로그램은 nullable FK, ON DELETE NO ACTION이다.
3. 메뉴 생성·수정은 등록된 프로그램만 연결할 수 있다. 메뉴 저장에 따른 암묵적 프로그램 생성을 제거한다. 게시판 마법사는 자신이 생성한 게시판의 modern_route로 메뉴를 만들며 프로그램을 자동 등록하지 않는다. 메뉴·역할에 연결된 프로그램 삭제는 409로 거부한다.
4. chg_tm은 NULL 또는 HHmmss(00:00:00~23:59:59)이며 VARCHAR(6)로 저장한다. 공백·콜론·전체 타임스탬프·범위 밖 시각은 API와 DB에서 거부한다. 외부 연계가 다른 표현을 사용하면 해당 연계의 명시적 어댑터에서 변환해야 하며 원천 형식을 추정하거나 잘라 저장하지 않는다. 날짜는 기존 chg_ymd에 둔다.
5. tb_user_info.rrno는 user_enrrno VARCHAR(256)로 전환한다. JPA 속성 rrno 및 기존 암호화 Converter는 유지하고 물리 매핑만 변경한다. 평문용 RRNO 표준을 변경하거나 감사 제외를 추가하지 않는다. 주민번호 수집 UI·권한·알고리즘은 이번 결정의 변경 대상이 아니다.

## 단계와 복구

- V2_94 Expand/Migrate: 프로그램 3개 폭 확장, user_enrrno 추가, 암호문 바이트 그대로 복사, 구·신 컬럼 양방향 동기화 trigger 설치. 충돌한 이중 쓰기는 실패한다.
- V2_95 Fence: HHmmss 검사와 CHECK, 분류 가능한 미일치 메뉴 연결 정리 및 FK 검증.
- Redirect: 새 JPA 매핑과 API/UI를 검증한다. 실제 Contract 실행 전 기존 애플리케이션을 중지하고 신규 코드 사용을 배포 조건으로 확인한다.
- V2_96 Contract: 두 암호문 컬럼 일치와 선행 CHECK 검증을 확인한 뒤 시각 2개 폭 축소, 동기화 trigger 및 구 rrno 컬럼 제거.

모든 단계는 NOWAIT 잠금과 짧은 timeout을 사용한다. OCI 적용 전 최신 전체 암호화 백업을 별도 PostgreSQL로 복원하고 동일 migration 파일로 리허설한다. 메뉴 값 정리 전후의 메뉴 번호·계층·modern_route·메뉴 권한 및 프로그램·역할 매핑을 대조한다. 주민번호는 재암호화하지 않고 암호문 보존을 확인한다.

Contract 이후 구 애플리케이션만 재배포하는 롤백은 허용하지 않는다. 백업 복원과 해당 백업에 맞는 코드·키를 함께 복구한다. 정당한 타입 변경과 Contract DDL 6줄은 ZDM-2026-0035~0040에 이 ADR, 선행 migration 및 실패 검증 근거를 결속한다.

## 검증 계약

- DeferredStandardDesignMigrationIntegrationTest: 잠금 경합, 잘못된 시간, 미해결 메뉴 경로 및 충돌한 암호문 이중 쓰기가 실패하는지 검증한다. 정상 이행 시 메뉴 경로·감사 필드·역할 매핑·암호문과 300자 멀티바이트 PK/FK를 검증한다.
- MenuIdentityMigrationIntegrationTest: IDENTITY 보존 및 선택적 FK의 잘못된 연결/연결 중 삭제 차단.
- StandardTextInputValidationTest: API 프로그램 300자 경계 및 HHmmss 범위.
- 백업·복원, 사용자 JPA 매핑, 메뉴 생성/수정/삭제와 게시판 마법사, OpenAPI/TypeScript/Zod 생성 계약을 함께 검증한다.

실행 결과와 OCI 적용 상태는 [표준 길이 정합 런북](../../04-operations/standard-length-alignment-runbook.md)에 기록한다.
