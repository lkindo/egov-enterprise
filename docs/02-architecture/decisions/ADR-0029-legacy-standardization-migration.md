# ADR-0029 — 레거시 표준화 이관은 도구가 후보와 근거를 만들고 사람이 용어 매핑 원장으로 확정한다

- 상태: Accepted
- 결정일: 2026-10-13
- 승인 범위: 사용자 결정(2026-10-13 — 설계 초안을 ADR 로 채택, 결정 대기 Q1~Q4, 같은 날 17:50 의 Q5 제어 테이블 변경 승인과 Q8~Q10)과
  위임 결정(Q5 의 표현 방식·Q6·Q7, 표준 스키마 메타 불일치의 gap 등록 — Claude 권고안). 인덱스는 DEC-OPS-305 다.
- 대체: 없음. [ADR-0008](ADR-0008-multi-source-approved-migration-workflow.md)의 경계 위에 표준화 단계를 더한다.
- 관련: [레거시 표준화 이관 설계](../legacy-standardization-migration-design.md)(진단·방법론 정본), [레거시 이관 도구 설계](../legacy-migration-tool-design.md),
  [DB 헌법](../../../.agent/knowledge/db-standard-constitution/artifacts/constitution.md), [ADR-0018](ADR-0018-governance-review-lifecycle-and-adoption.md),
  [ADR-0014](ADR-0014-deferred-standard-design-alignment.md)

## 맥락

`migration-tool` 은 적재 단계의 안전성 — 승인 계보, digest 결속, keymap·checkpoint 재개, visibility 누락 탐지 — 를 갖췄다. 그 앞의
표준화 단계(레거시 컬럼의 의미 식별과 표준 단어·용어·도메인 매핑)는 사람이 도구 밖에서 끝내고 `mapping.yml` 을 손으로 쓴다는
전제였다. 레거시는 같은 뜻의 컬럼이 이름·코멘트가 다르거나 코멘트가 없는 경우가 많아, 이 전제가 이관 비용과 오류의 대부분을 만든다.

2026-10-13 설계 초안이 main 소스를 정적으로 진단했고 이 ADR 을 쓰며 핵심 근거를 다시 확인했다.

- **적재 안전(P1).** 표준 ID 생성기는 UUID 를 소문자 hex 로 쓰지만 온라인 `IdGenerationUtil` 은 대문자로 만들고, `PRESERVE` 적재 뒤
  대상 시퀀스를 다시 맞추는 단계가 없다(D5). 매핑 검증은 타깃 컬럼이 코드젠 스냅샷 `db_columns.json` 에 있는지만 보고 표준 도메인의
  타입·길이와 대상 NOT NULL 을 보지 않는다(D1). raw JDBC 적재라 주민등록번호를 ARIA 로 암호화하는 `RrnoEncryptionConverter` 를
  지나지 않는데, 이 converter 는 읽을 때 과거 평문 주민번호 형식을 허용하므로 평문 적재가 조용히 동작한다(A1).
- **의미 식별 입력의 부재.** discovery 는 컬럼 코멘트를 해시로만 남기고, 값 프로파일과 레거시 애플리케이션 소스의 사용처를 읽는
  경로가 없다. 표준용어 후보·적합성 판정·확정 기록도 없다.
- **표현력.** 매핑은 테이블·컬럼 1:1 이고 내장 변환은 다섯 개다(D3·D4). 사후 검증은 행 수·checksum·target identity 중심이다(D2).
  공통코드 대조(D7)와 Oracle·Tibero 실DB 증거(A4)가 없다.

이관 때는 레거시 DB 와 함께 레거시 애플리케이션 소스(SQL 매퍼·VO·화면·설정)를 입력으로 받는다는 것이 전제다.

## 결정

1. **흐름.** 표준화 이관은 수집 → 식별 → 적합성 → 확정 → 설계 → 적재 → 대사 순서다.
   - 수집: `discover`(현행), `profile`(집계·마스킹 프로파일과 코멘트 원문), `app-scan`(레거시 소스의 사용처).
   - 식별: `term-suggest` 가 코멘트 → 데이터 순으로 후보를 만들고 코멘트·데이터·사용처를 대조해 충돌·개념 군집·등급을 보고한다.
   - 적합성: `conformance` 가 후보 도메인 대비 적합률·위반 유형·변환 가능성을 판정한다.
   - 확정: 사람이 용어 매핑 원장에 확정한다. 표준에 없는 단어·용어는 [DB 헌법 제9조](../../../.agent/knowledge/db-standard-constitution/artifacts/constitution.md)의
     등록 요청으로 보낸다.
   - 설계: 표준에 없는 업무 테이블은 DB 거버넌스 절차의 Flyway DDL 로 만든다. 도구는 DDL 을 생성·실행하지 않는다.
   - 적재·대사: 원장에서 만든 mapping 으로 현행 plan → validate → load 를 지나고, 확장한 verify 로 대사한다.
2. **도구는 제안하고 사람이 확정한다.** 추정 매핑을 자동 적용하지 않는다. `INFERRED`·`UNKNOWN` 등급은 업무 담당자 확정이 필수다.
   코멘트가 데이터나 사용처와 어긋나면 코멘트를 따르지 않는다. "사용처 없음" 은 미사용의 증거가 아니며 자동 제외 근거가 아니다.
3. **용어 매핑 원장(Q2).** 원장은 기관 이관 저장소에서 Git 검토를 거치는 YAML/JSON 파일 하나이고 개념 식별 결과의 SSOT 다. 대상 DB 에
   `migration_control` 같은 테이블을 두지 않는다.
   - 원장 digest 를 plan 의 결속 대상(inventory·mapping·target·execution contract)에 더해 승인 뒤 변경을 탐지한다.
   - `mapping.yml` 의 모든 타깃 컬럼 매핑은 `CONFIRMED` 원장 행을 참조해야 하고, 아니면 validate 가 실패한다.
   - 원장의 표준용어·도메인은 plan 시점 live 메타(`meta_standard_terms`·`meta_standard_domains`)와 다시 대조한다.
   - `CONFIRMED` 는 변환 후 적합률 100% 이거나 승인된 예외가 기록된 행만 받는다. 원장에는 원시 행 값·접속정보를 남기지 않는다.
4. **민감 컬럼(Q1).** 이관 도구가 온라인 애플리케이션과 호환되는 암호화를 직접 구현한다.
   - 런타임에는 `foundation`·`business-core` 에 의존하지 않는다([DEC-OPS-005](../../../.agent/memory/decisions.md) 유지). 호환 증명용
     계약 시험만 온라인 converter 원본을 시험 안에서 컴파일해 쓰고, 그에 필요한 외부 라이브러리만 시험 범위에 둔다.
     Gradle 프로젝트 의존은 두지 않는다(생성 제품 검사와 이관 단독 제품의 시험 컴파일이 막는다). bootJar 런타임 클래스패스에는 들어가지 않는다.
   - 계약 시험은 도구가 만든 암호문을 온라인 `RrnoEncryptionConverter`(와 그 암호 구현)로 복호화해 같은 값임을 증명한다. 온라인 암호
     구현이 바뀌는 변경도 이 시험을 돌리도록 CI 영향 분류에 연결한다.
   - 키는 실행 시점에 secret provider 나 환경으로 주입한다. artifact·로그·inventory·plan 에 키나 키에서 파생한 값을 남기지 않는다.
   - 암호화 대상으로 표시된 컬럼에 평문이 오면 쓰기 전에 실패한다. 대상 표시는 승인 digest 에 들어간다.
   - 키 회전과 레거시 암호문 처분은 기관 채택 통제 `crypto-lifecycle`([DEC-OPS-107](../../../.agent/memory/decisions.md))에 그대로 둔다.
   - 도구가 eGovFrame 암호 라이브러리를 직접 쓰는 것도 이 범위 안이다(사용자 확인). L1 은 의존을 늘리지 않으려고 같은 암호를
     독자 구현했고, 그 라이브러리는 계약 시험 범위에만 있다([DEC-OPS-308](../../../.agent/memory/decisions.md)).
   - 주민등록번호를 이관해도 되는지의 법적 근거는 기관이 판단한다. 기관 채택 통제가 그 판단을 기록하며, 도구는 암호화 경로만 보장한다.
5. **외부 LLM 후보 생성(Q3).** `term-suggest` 의 외부 LLM 사용은 기본 꺼짐이다. 켜려면 아래를 모두 만족해야 한다.
   - 기관 이관 승인 원장([ADR-0018](ADR-0018-governance-review-lifecycle-and-adoption.md))에 외부 전송 승인(대상 서비스·범위·유효기간)이
     기록돼 있다. 승인이 없거나 만료됐으면 실행 전에 실패한다.
   - 보내는 것은 테이블·컬럼 이름과 코멘트뿐이다. 값·값 빈도·프로파일·사용처 원문·접속정보는 보내지 않는다.
   - 전송 전 검사가 보낼 내용을 확인한다. 허용 필드 밖의 항목이 있거나 코멘트에 개인정보 패턴(주민번호·전화·이메일 등)이 있으면
     그 항목을 보내지 않고 보고한다. 보낸 범위의 digest 를 후보 보고서에 남긴다.
   - LLM 결과도 제안이며 등급은 근거에 따라 정한다. 로컬 실행만으로 끝나는 후보 생성은 이 승인 대상이 아니다.
6. **의미 불명 데이터(Q4).** 의미를 끝내 확정하지 못한 데이터는 대상 DB 에 넣지 않고 외부 덤프로 보관한다. 대상 DB 스키마를 바꾸지
   않는다. 원장은 `ARCHIVE` 상태와 보존 기한을 기록한다. 덤프는 원시 값을 담으므로 승인 artifact 가 아니며 저장소·로그에 두지 않고
   기관의 접근 통제·보존 정책을 따른다. 표준 테이블에 `etc1`·`rmrk2` 같은 범용 컬럼을 만들어 담지 않는다.
7. **분할·조인(Q5, 위임).** 1:N 분할과 N:1 조인은 `MappingSpec` 을 확장해 표현한다. 소스 측에 staging view 를 만들지 않는다(소스는
   읽기 전용). 분할된 각 target 은 실행 식별자를 따로 갖고, 조인은 현행 단일 source read session 안에서 읽으며, 새 구조 전체가 mapping
   digest 에 들어간다. 1:N 분할을 위해 L3 에서 도구 자신의 제어 테이블(`migration_control` 의 keymap·checkpoint)에 매핑 식별자를
   더하는 변경을 사용자가 승인했다(2026-10-13 17:50). 기존 행은 보존하는 마이그레이션으로 하며, 대상 업무 스키마 변경이 아니다.
8. **도메인에 맞지 않는 행(Q6, 위임).** 기본은 fail-closed 다 — 위반 행이 하나라도 있으면 그 테이블 적재를 멈춘다. 원장이 승인한
   예외 조건에 맞는 행만 격리해 적재에서 빼고 나머지를 진행한다. 격리 건수가 승인한 상한을 넘으면 멈춘다. 격리 행은 현행 redaction
   원칙대로 원시 값 없이 식별 근거와 위반 유형으로 보고하고, 조용히 버리지 않는다.
   - 사실(2026-10-13): L1 전에는 적재기가 변환에 실패한 행을 건너뛰고 나머지를 커밋했다. L1 PR-D([DEC-OPS-309](../../../.agent/memory/decisions.md))부터
     행 변환 실패(transform·codemap·type·fkRef·identity·보호 컬럼)는 그 행이 든 chunk 를 쓰지 않고 테이블과 run 을 멈춘다. 앞서 커밋한
     chunk 는 남고 재개는 마지막 checkpoint 다음부터다.
   - 쓰기 단계의 위반(길이·NOT NULL·CHECK)은 아직 행 단위로 격리되어 나머지가 커밋된다([GAP-ETL-001](../../../.agent/memory/known-gaps.md)).
   - 승인 예외의 원천인 원장은 L2 에 생긴다. 그 전에는 승인 예외 경로가 없어 모든 행 변환 실패가 fail-closed 다.
9. **`app-scan` 범위(Q7, 위임).** 1차 지원은 전자정부프레임워크(Spring)·MyBatis/iBATIS XML·JSP 다. 그 밖의 스택, 동적 SQL, 해석할 수
   없는 파일, 소스 없이 빌드 산출물만 있는 경우는 `PARTIAL` 로 남긴다. 입력은 읽기 전용 소스 디렉터리이며, 압축본은 운영자가 별도
   디렉터리에 풀어 준다. 설정 파일의 접속정보·비밀값은 산출물에 복사하지 않는다.
10. **표준 메타 확장(Q8, 사용자).** L2 에서 Flyway 로 표준 메타 표(`meta_standard_*`)에 동의어·허용값·폐기 여부 컬럼을 더한다. live
    메타에는 지금 이 정보가 없고, 저장소의 행정안전부 공통표준 CSV 에만 있다. 공유 OCI DB 적용은 그때 따로 승인받는다.
11. **JPA 전용 시퀀스(Q9, 사용자).** `@SequenceGenerator` 로만 쓰는 시퀀스에 지금은 `OWNED BY` 를 두지 않는다. 대상 카탈로그에
    연결이 없으므로 매핑이 `identity.targetSequences` 로 선언하고, 선언이 없으면 도구가 적재를 시작하지 않는다([DEC-OPS-306](../../../.agent/memory/decisions.md)).
12. **비 PostgreSQL 소스의 외부 드라이버(Q10, 사용자).** 번들 드라이버는 PostgreSQL 뿐이고 외부 드라이버는 격리 규칙 때문에 증거
    등급과 무관하게 COMMIT 할 수 없다. 기관 환경·라이선스가 생기면 L3 에서 외부 드라이버를 별도 프로세스로 실행하는 경로를 둔다.
    그때까지 외부 드라이버 공개 COMMIT 차단을 유지한다.

## 실행 단계(L1~L4)

각 단계는 앞 단계가 병합된 뒤 시작한다. 새 검사는 의도적 위반이 붉어지는 부정 시험과 함께 둔다(AGENTS H5). 이관 커버리지 85/70 과
PIT 범위를 지키고, 새 패키지는 PIT 대상 범위([분류기](../../../scripts/ci-change-scope.mjs)·[gate registry](../../../config/governance/gates.json))에 넣는다.

| 단계 | PR 경계 | 범위 |
|---|---|---|
| L1 적재 안전 | PR 1개 | 이 ADR 채택과 기록, D5 표준 ID 규칙 일치·`PRESERVE` 뒤 시퀀스 재설정, D1 live 메타 도메인 타입·길이와 대상 NOT NULL 검사, A1 민감 컬럼 호환 암호화(결정 4), 행 변환 실패의 fail-closed 와 codemap·date 엄격화(결정 8, PR-D). 새 명령은 없다. |
| L2 수집·식별 | PR 2개 | L2a 수집 — `profile`·`app-scan`(결정 9). L2b 식별·확정 — `term-suggest`(결정 5 의 가드 포함)·`conformance`·용어 매핑 원장의 스키마·상태 전이·live 메타 대조와 plan digest 결속(결정 3), 표준 메타 확장(결정 10). |
| L3 변환·구조 | PR 1~2개 | 표준 도메인 변환기(`ymd8`·`hms6`·`yn` 등, D4), `MappingSpec` 1:N·N:1 과 제어 테이블 매핑 식별자(결정 7), 원장 → mapping 생성, 예외 행 격리(결정 8), 의미 불명 데이터 외부 덤프(결정 6), 기관 환경이 있으면 외부 드라이버 별도 프로세스 실행(결정 12). |
| L4 대사·증거 | PR 여러 개 | verify 확장(고아 FK·UNIQUE·NOT NULL·도메인 적합성·집계 parity·샘플 diff, D2), 공통코드 원장 대조(D7), Oracle·Tibero 실DB rehearsal 증거(A4, vendor 마다 PR), 권한·메뉴·첨부·비데이터 객체 이관 가이드(A2·A3). |

## 바뀌지 않는 것

- ADR-0008 의 경계 — 독립 offline `bootJar`, PostgreSQL 단일 target, Flyway 소유 대상 스키마, INSERT-only, discover → plan → validate → load
  승인 계보와 digest 결속, 직접 `--mapping` 경로 차단.
- 런타임 `foundation` 미의존(DEC-OPS-005). 소스 DB 는 읽기 전용이고 표준화는 적재 시 변환으로만 한다.
- redaction 원칙 — 원시 행 값·접속정보·키를 artifact·로그·inventory·plan·원장에 남기지 않는다.
- 증거 등급 — `UNVERIFIED` vendor 의 commit 금지와 외부 driver 공개 COMMIT 차단은 실DB 증거로만 바꾼다.
- 비목표 — 표준용어 자동 확정, 대상 DDL 자동 생성·실행, procedure·trigger 자동 번역, CDC·dual-write·무중단 cutover, 레거시
  애플리케이션 코드 자동 변환.

## 결과

- 표준화가 도구 안의 기록으로 남는다. 매핑의 근거·등급·적합률·확정자가 원장에 있고, 원장이 바뀌면 plan 승인이 깨진다.
- 사람의 검토는 `INFERRED`·`UNKNOWN` 과 규칙 정제형 변환에 모인다. 감사 컬럼과 여부·일자 패턴은 규칙으로 일괄 처리할 수 있다.
- 비용: 호환 암호화는 온라인 구현과 같은 일을 두 곳에서 한다. 계약 시험과 CI 영향 분류가 드리프트를 잡는다. 외부 LLM 을 쓰지
  않으면 후보 품질은 코멘트·프로파일·사용처 근거의 양에 달린다.
- 원장·외부 덤프·외부 전송 승인은 기관 이관 저장소와 기관 원장에 있다. 원본 저장소는 형식·검증기와 합성 fixture 만 갖는다.

## 검증과 한계

- 이 ADR 은 결정과 단계만 정한다. 각 단계의 구현·검증은 그 단계의 변경과 결정 행이 기록한다.
- 진단은 2026-10-13 main 의 정적 조사다. 테스트·DB 실측은 L1 부터 단계마다 한다.
- 설계 문서의 결정 대기(§9 Q1~Q7)와 L1 준비 중 더한 Q8~Q10 은 이 ADR 이 닫는다. 설계 문서는 진단·방법론의 정본으로 남는다.
- L1 준비 중 확인한 표준 스키마의 메타 불일치(2026-10-13 OCI 읽기 — `tb_` 컬럼 996개 중 표준 용어 없음 276, 용어 도메인과 물리 타입 다름 26)는
  위임에 따라 [GAP-STD-001](../../../.agent/memory/known-gaps.md)로 둔다. 원인은 온라인 스키마 쪽이며 이관 도구가 고칠 대상이 아니다.
