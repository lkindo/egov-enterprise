# 표준 길이 24개 및 후속 6개 정합 전환 런북

최초 24개 대상과 선택은 [ADR-0013](../02-architecture/decisions/ADR-0013-standard-text-length-alignment.md), 보류 6개의 후속 설계는 [ADR-0014](../02-architecture/decisions/ADR-0014-deferred-standard-design-alignment.md)가 정본이다. 아래 최초 이행 기록은 당시 상태를 보존한다. 보류 6개도 후속 승인과 검증을 거쳐 적용했으며, 최신 OCI 상태는 마지막 절에 기록한다.

## 대상 컬럼

길이는 PostgreSQL의 문자 수 기준이다. 권한명 입력은 기존 제품 제한 60자를 유지한다.

| 테이블 | 컬럼 | 기존 → 표준 |
|---|---|---|
| `tb_adbk_manage` | `adbk_nm` | 100 → 200 |
| `tb_authrt_info` | `authrt_nm` | 300 → 100 |
| `tb_bbs_item` | `pst_ttl` | 100 → 256 |
| `tb_cmnty_info` | `cmnty_nm` | 100 → 300 |
| `tb_email_dsptch_manage` | `eml_ttl` | 100 → 256 |
| `tb_event_info` | `pic_nm` | 300 → 100 |
| `tb_extrl_hr_info` | `ogdp_inst_nm` | 100 → 200 |
| `tb_file_detail` | `orgnl_file_nm` | 100 → 300 |
| `tb_file_detail` | `strg_file_nm` | 100 → 300 |
| `tb_inst_cd` | `inst_abbr_nm` | 100 → 300 |
| `tb_inst_cd_rcptn_log` | `inst_abbr_nm` | 100 → 300 |
| `tb_menu_info` | `rel_img_nm` | 100 → 300 |
| `tb_note_info` | `note_ttl` | 100 → 256 |
| `tb_ognz_info` | `ognz_nm` | 100 → 200 |
| `tb_role_info` | `role_nm` | 100 → 300 |
| `tb_rward_manage` | `rwrd_nm` | 100 → 300 |
| `tb_schdl_info` | `schdl_nm` | 100 → 300 |
| `tb_sms_rcptn` | `rcptn_telno` | 13 → 11 |
| `tb_srvy_info` | `srvy_prps` | 1000 → 4000 |
| `tb_srvy_info` | `srvy_ttl` | 100 → 256 |
| `tb_srvy_tmplt` | `srvy_tmplt_path_nm` | 100 → 300 |
| `tb_stmp_info` | `mpng_file_nm` | 100 → 300 |
| `tb_user_info` | `daddr` | 300 → 200 |
| `tb_user_info` | `home_addr` | 300 → 200 |

ADR-0013 적용 시 보류(이후 설계는 [ADR-0014](../02-architecture/decisions/ADR-0014-deferred-standard-design-alignment.md)): `tb_prgrm_lst.prgrm_file_nm`, `tb_role_prgrm_map.prgrm_file_nm`, `tb_menu_info.prgrm_file_nm`은 100, 기관 코드·수신 로그의 `chg_tm`은 20, `tb_user_info.rrno`는 암호문 폭 256을 유지한다.

## 배포 단계

| 단계 | DB 작업 | 애플리케이션·데이터 조건 |
|---|---|---|
| 사전 확인 | 기존 Flyway 이력·백업·표준 메타·길이·SMS 중복 집계 | 변경 대상과 실제 접속 대상을 확인하고 기존 인스턴스·발송 작업 상태를 확인한다. |
| 확장 | V2_91: 일반 VARCHAR 19개 확장 | 구버전 입력은 계속 저장 가능하다. 현재 타입/표준 불일치나 잠금 경합은 즉시 실패한다. |
| 전환 준비 | DB는 V2_91에 머무른다 | 새 입력 길이·축소 제한·SMS 정규화/구키 보조 조회를 가진 코드를 배포한다. 구버전 발송 작업은 소진한다. 이 단계는 Flyway target을 2.91로 명시한다. |
| 입력 차단·동기화 | V2_92: 축소 대상 CHECK, SMS 하이픈 제거 | 초과 문자열·정규화 키 충돌은 전체 거절한다. 원래 발송 결과와 FK·감사값은 보존한다. |
| 물리 축소 | V2_93: 권한명·담당자명·주소 2개·수신번호 | 선행 CHECK가 검증된 상태이고 길이 초과가 없어야 한다. |
| 사후 확인 | 표준 길이 감사·PK/FK·행수·값 보존·Flyway history | 변경 24개는 정합, 보류 6개는 기존 길이여야 한다. API 경계와 UI 입력·발송 접수 흐름을 검증한다. |

서비스가 없는 격리 환경은 단계별 검증 후 전량 적용할 수 있다. 운영 중인 환경에서 기본 Flyway target으로 앱을 바로 시작하면 모든 미적용 migration이 함께 진행되므로 위 배포 경계를 생략하지 않는다. OCI가 2.88이면 선행 V2_89/V2_90의 블로그 퇴역 조건과 구버전 소비 제거도 별도로 확인해야 한다. 현재 요청에 포함되지 않은 새 파괴 작업을 임의 추가하지 않는다.

## 장애와 복구

- 모든 대상 테이블을 `ACCESS EXCLUSIVE NOWAIT`로 선점한다. 하나라도 잠겨 있으면 해당 migration은 실패하고 그 파일의 변경은 rollback된다. `lock_timeout=3s`, `statement_timeout=30s`를 추가로 적용한다. 여러 migration 전체의 원자성은 보장하지 않는다.
- 길이 초과·표준 metadata 불일치·SMS 키 충돌 시 데이터를 변경해 통과시키지 않는다. 원인 행은 승인된 별도 정합 절차로 처리한다. 운영 조회 결과에는 실제 전화번호·주소를 출력하지 않는다.
- 확장된 입력 저장 이후 과거 폭으로 강제 축소하지 않는다. 애플리케이션 rollback은 DB와 입력 계약의 호환성을 먼저 판정한다. SMS 데이터 변환을 복구하기 위해 문자를 재발송하지 않는다.
- 실제 backup 파일은 저장소 밖 또는 ignored 전용 경로에 접근을 제한해 저장한다. 운영 개인정보를 코드·문서·CI artifact에 담지 않는다. 복원은 원 DB가 아닌 일회용 PostgreSQL에 먼저 수행해 행수·스키마·변환 결과를 확인한다.

## 검증 증거

2026-09-09 격리 PostgreSQL에서 `StandardLengthMigrationIntegrationTest`가 성공했다. 동일 테스트는 표준 길이 불일치, 다른 세션의 테이블 잠금, 201자 주소, 하이픈 제거 후 중복 키를 의도적으로 넣어 migration이 실패하는지도 확인한다. 일반 확장 전후의 값 해시와 `pg_relation_filenode`가 같고, SMS 상태/결과/전송 관계가 보존되며 목표 길이 경계가 집행되는지를 검사한다.

OCI에서 읽기 전용으로 취득한 백업은 AES-256-GCM으로 암호화하고 현재 Windows 사용자 DPAPI로 키를 보호했다. 접근을 제한한 ignored 경로에 보관한 뒤 실제 복호화·PostgreSQL 복원에 성공했다. 복원본의 Flyway 2.88 → 2.93 리허설에서 업무 테이블 81개의 전체 행 집계 해시가 일치했다(승인된 블로그 폐기 컬럼 제외, SMS 번호만 정규화한 기대값으로 비교). SMS 115건·대기 상태 101건이 유지됐고 신규 형식 위반과 전송 FK 고아는 모두 0건이었다. 2026-09-09 12:21 KST 실제 OCI에 같은 파일로 V2_89 → V2_93을 순서대로 적용했다. V2_89/V2_90은 앞서 승인된 블로그 퇴역이며, 적용 전 블로그·멤버십·게시판 연결 데이터는 모두 0이었다. 다른 DB client 연결과 열린 transaction이 없는 상태에서 독립 Flyway runner를 사용했다. 이행 중 새 앱 기동이나 외부 발송은 실행하지 않았다.

사후 읽기 전용 실측 결과:

- Flyway 2.93, 적용 이력 검증 성공. 이번 길이 정합 24개는 모두 목표 폭이며 보류 6개는 기존 폭을 유지한다.
- 동일 감사 SQL의 길이 불일치는 30 → 6개다. 남은 6개는 위 보류 목록과 정확히 일치한다. 전체 DB 용어 매핑을 완결했다는 뜻은 아니다.
- 위와 동일한 비교 기준으로 81개 업무 테이블의 전체 행 집계 해시가 적용 전후 일치했다. 원본 파일·암호화 키는 변경 대상이 아니다.
- SMS 수신자 115건, 대기 P 101건, 성공 S 14건을 보존했다. 하이픈 번호 115건만 정규화됐으며 숫자 형식 위반·전송 FK 고아는 0건이다. 대기 이력은 자동 재발송하거나 성공·실패로 재판정하지 않았다.
- 연결된 운영 앱 인스턴스의 배포까지 완료한 것은 아니다. 이 DB를 사용하는 앱은 ADR-0013의 입력 제한·정규화가 반영된 버전으로 시작해야 한다.

증거는 ignored `build/reports/oci-length-backup-restore.json`, `oci-length-restored-migration.json`, `oci-length-applied.json`, `oci-length-after-audit.json`, `oci-length-after-health.json`에 집계만 보관했다. 백업 본문과 DPAPI 보호 키는 `build/secure-length-backup-20260909/`에 현재 사용자와 SYSTEM만 접근하도록 제한했다. 원문 데이터나 자격증명을 저장소에 추가하지 않는다.

참고: [PostgreSQL 17 ALTER TABLE](https://www.postgresql.org/docs/17/sql-altertable.html)은 이진 호환 타입 전환의 rewrite 예외와 길이/제약 변경의 잠금·검증 동작을 설명한다. 실제 이 변경의 heap 보존 여부는 위 통합 테스트 결과를 근거로 삼는다.

## 소스·화면 검증

- 백엔드 전체 `test`, governance harness, 52개 PostgreSQL schema 테스트와 root/foundation 커버리지 검증이 통과했다. 이후 SMS 검색 보완은 별도 실제 JPA 조회 테스트와 `compileJava compileTestJava`로 재검증했다.
- 길이 변경 요청 DTO 23개 경계 조합은 최대 길이와 최대+1을 비교했고, Jackson 역직렬화와 Builder의 SMS 정규화도 확인했다. 실제 앱 OpenAPI의 관련 21개 schema에서 길이·패턴 927개 속성 비교가 일치했다. TypeScript·Zod·operation 생성물은 재생성해 동일함을 확인했다.
- 프론트엔드 type-check, lint(오류 0, 기존 경고 142), production build, bundle budget, 폼 계약 60개와 정확한 census가 통과했다. 운영 계약 테스트 531개도 통과했다.
- 격리 환경에서 게시판·주소록·메일 E2E 16개가 통과했고, 확장된 256자 메일 제목의 저장 이력을 확인했다. 별도 최신 앱 검증은 SMS의 레거시 JSON 입력·중복 제거·하이픈 검색·12자리 API 거절(400)·화면 접수와 저장을 확인했다. 이 환경의 문자 sender는 외부 발송이 비활성임을 먼저 검사했다.
- 격리 앱의 재기동 준비 전에 시작한 인증 setup은 연결 실패했다. JVM readiness와 health 200 확인 후 같은 검사를 재실행해 2개 모두 통과했다. 테스트나 인증 정책은 완화하지 않았다.
- 위 브라우저 실행은 합성 데이터가 있는 별도 DB에서만 수행했다. 검증 후 직접 생성한 앱 프로세스와 DB 컨테이너(OCI 복원본 포함)는 소유 식별자를 확인하고 정리했다.

프론트엔드 최종 전수 검사: 311개 테스트 파일·2,613개 테스트 전부 성공, skip 0. 커버리지는 statements 73.51%, branches 65.98%, functions 66.29%, lines 75.64%로 기존 기준을 충족했다. 검사 중 발견한 이전 길이·이전 census 기대값은 실제 새 계약에 맞춰 갱신한 뒤 전수 검사를 다시 완료했다.

## ADR-0014 후속 6개 적용 결과

사용자가 권장 설계대로 진행하도록 승인한 뒤, 2026-09-09 13:28 KST OCI에 V2_94 → V2_95 → V2_96을 순서대로 적용했다. 13:33 KST 읽기 전용 재조회에서도 Flyway 2.96과 아래 상태를 확인했다.

| 대상 | 최종 DB·애플리케이션 계약 |
|---|---|
| 프로그램·역할 매핑·메뉴의 `prgrm_file_nm` 3개 | VARCHAR(300). 프로그램 PK와 역할 매핑을 보존하고 메뉴에는 선택적 FK를 적용했다. |
| 기관코드·수신 로그의 `chg_tm` 2개 | VARCHAR(6), NULL 또는 `HHmmss`. 날짜는 기존 `chg_ymd` VARCHAR(8)에 별도 저장한다. API와 DB 모두 잘못된 시각을 거부한다. |
| 사용자의 암호화 주민번호 1개 | `user_enrrno` VARCHAR(256). 기존 암호화 Converter와 Java 속성은 유지하고 구 물리 컬럼 `rrno`를 제거했다. |

메뉴 84건은 등록된 프로그램과 일치하지 않던 연결 값만 NULL로 정리했다. 독립 경로 70건과 자식이 있는 폴더 14건의 메뉴 번호·계층·경로·권한은 보존했다. 화면에서는 등록된 프로그램을 선택하거나 연결 없이 저장할 수 있다. 연결 중인 프로그램 삭제는 409로 거부하며, 게시판 마법사는 생성한 게시판 경로로 메뉴를 만든다.

실측 결과:

- 동일 표준 길이 감사 SQL의 불일치는 6 → 0건이다. 이는 정확한 표준 약어가 매칭되는 VARCHAR 길이 비교 범위의 결과이며, 모든 용어·타입의 전수 정합을 뜻하지 않는다.
- 프로그램 18건, 역할 매핑 34건, 메뉴 84건, 사용자 7건을 유지했다. 메뉴 프로그램 고아는 0건이며 신규 FK와 시간 CHECK 2개는 모두 검증된 상태다.
- 기관코드 원장과 수신 로그는 각각 0건이고, 사용자 암호화 주민번호는 모두 NULL이다. 날짜와 시간의 실제 저장·조회, 비어 있지 않은 암호문의 전환 보존은 격리 DB의 합성 데이터로 별도 검증했다.
- 81개 업무 테이블의 전체 행 집계 해시가 승인된 변환을 반영한 기대값과 일치했다. 메뉴의 승인된 연결 해제와 암호화 컬럼명 전환을 비교 기준에 반영했으며 나머지 값은 변경하지 않았다.

적용 전 OCI 전체 백업을 AES-256-GCM과 Windows DPAPI로 보호하고 별도 PostgreSQL에 복원했다. 복원본에서 동일 파일의 2.93 → 2.96 이행 및 81개 테이블 보존 검증을 통과한 뒤 실제 적용했다. 각 단계 전에 다른 DB client 연결이 없음을 확인했고, 2.95와 2.96 사이에는 rollback되는 합성 쓰기로 신·구 암호화 컬럼의 동기화를 확인했다. 전체 단계 종료 후 Flyway 이력 검증도 통과했다.

검증 범위:

- 백엔드 영향 테스트 105건과 `compileJava compileTestJava`, PostgreSQL 전체 schema 검증 53건(47개 클래스)이 통과했다. migration은 잠금 경합·잘못된 시각·미해결 메뉴 경로·충돌한 암호문 이중 쓰기를 의도적으로 넣었을 때 실패하는지도 확인했다.
- governance harness는 신규 migration 클래스와 승인된 DDL 근거를 등록하고 manifest를 대조했다. 기존 harness 검사 후 변경된 baseline·registry 계약을 다시 통과시켰으며 검사 예외를 늘리거나 테스트를 건너뛰지 않았다.
- 프론트엔드 영향 테스트, TypeScript 검사, lint(오류 0, 기존 경고 142), production build와 폼 census가 통과했다. 300자 프로그램 키의 실제 메뉴 저장 검증에서 발견한 수동 조합 schema의 100자 제한도 수정하고 300자 허용·301자 거부 회귀 검사를 통과시켰다.
- OpenAPI·TypeScript·Zod를 갱신했으며 기존 API 경로와 operation ID를 보존했다. 격리 환경의 인증 준비·게시판 마법사·메뉴 E2E 5건과 실제 300자 프로그램 선택·저장, 연결 중 삭제 거부(409), 연결 해제 후 삭제, 기관 날짜·시간 API 왕복 및 잘못된 시간 거부(400)를 확인했다.

OCI DB와 현재 소스의 전환은 완료했다. 운영 애플리케이션 배포는 실행하지 않았으므로 이 DB를 사용하는 앱은 ADR-0013·ADR-0014가 모두 반영된 버전으로 시작해야 한다. Contract 이후 구 `rrno`를 참조하는 앱만 되돌려 배포할 수 없으며, 장애 복구는 해당 백업에 맞는 DB·코드·키를 함께 복구한다. 확인되지 않은 외부 연계 시각을 임의 변환하는 어댑터는 추가하지 않았다.

집계 증거는 ignored `build/reports/oci-deferred-backup-restore.json`, `oci-deferred-rehearsal.json`, `oci-deferred-applied.json`, `oci-deferred-post-audit.json`, `oci-deferred-post-health.json`, `oci-deferred-post-state.json`, `deferred-runtime-probe.json`에 보관한다. 암호화 백업과 DPAPI 보호 키는 현재 사용자와 SYSTEM만 접근 가능한 `build/secure-deferred-backup-20260909/`에 유지한다. 원문 데이터나 자격증명은 저장소에 추가하지 않는다.

검증 후 이번 작업에서 만든 JVM·프론트엔드 프로세스와 격리 DB·OCI 복원본 컨테이너는 PID 실행 경로와 전용 label을 확인하고 정리했다. 암호화 백업은 복구용으로 보존했다.
