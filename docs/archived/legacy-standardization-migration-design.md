# 레거시 시스템 표준화 이관 설계

> **보관(2026-10-19):** ADR-0029·0031이 채택을 마쳐 `docs/02-architecture/`에서 옮긴 채택 전 진단이다. 현행 결정·동작은 그 ADR과 이관 도구 설계를 따른다.

> **상태: 채택 전 진단 기록 — 결정은 [ADR-0029](../02-architecture/decisions/ADR-0029-legacy-standardization-migration.md)(2026-10-13 채택)와 그 후속 [ADR-0031](../02-architecture/decisions/ADR-0031-migration-ledger-confirmation-followup.md)(원장 확정 조건·chunk 실패 처리), 현행 동작은 [이관 도구 설계](../02-architecture/legacy-migration-tool-design.md)가 정본이다.** 이 문서는 채택 전 진단과 표준용어 식별 방법론의 설계 근거를 보존한다. §1~2의 공백, §6~8의 보강안·우선순위·검증 계획은 아래 진단 시점의 기록이며, §9의 결정 질문은 ADR-0029가 닫았다. 일부 행에 붙인 후속 정정은 전체 구현 상태표가 아니다. 현행 CLI·원장·적재 계약은 [이관 도구 설계](../02-architecture/legacy-migration-tool-design.md), 재현 가능한 미해결 항목은 [활성 gap 인덱스](../../.agent/memory/known-gaps.md)를 따른다.

- 진단 기준: `main` `0fab2c798`(2026-10-13)의 소스·문서 정적 조사. 테스트·DB 실측은 하지 않았다.
- **전제**: 이관 시 레거시 DB와 함께 **레거시 애플리케이션 소스**(SQL 매퍼·VO·화면·설정)를 입력으로 제공한다. 표준화는 이 소스의 사용처 근거를 포함해 진행한다.
- 관련 정본: [레거시 이관 도구 설계](../02-architecture/legacy-migration-tool-design.md), [DB 헌법](../../.agent/knowledge/db-standard-constitution/artifacts/constitution.md), [DB 표준화 매뉴얼](../03-guides/db-standardization-manual.md)

## 1. 목적과 문제 정의

기존 시스템 이관은 두 단계로 나뉜다.

1. **표준화**: 레거시 테이블·컬럼의 의미를 식별하고, 표준 단어·용어·도메인([DB 헌법 제2·5조](../../.agent/knowledge/db-standard-constitution/artifacts/constitution.md))에 맞춘 대상 구조를 설계한다.
2. **적재**: 승인된 매핑으로 데이터를 대상 테이블에 옮기고 정합성을 증명한다.

진단 당시 `migration-tool`은 2단계(적재)의 안전성 — 승인 계보, digest 결속, keymap·checkpoint 재개, visibility 누락 탐지 — 에 집중돼 있었다. 1단계는 사람이 도구 밖에서 끝내고 `mapping.yml`을 손으로 쓰는 것을 전제로 했다. 레거시는 **유사 기능이 서로 다른 컬럼명·코멘트를 갖거나 코멘트가 아예 없는** 경우가 많아, 이 전제가 이관 비용과 오류의 대부분을 만든다고 판단했다.

## 2. 채택 전 구현 진단 (2026-10-13)

### 2.1 DB 표준화 관점

| ID | 공백 | 근거 |
|---|---|---|
| D1 | 매핑 검증은 "타깃 컬럼이 존재하는가"만 본다. `meta_standard_terms`·`meta_standard_domains`의 타입·길이 일치, 대상 NOT NULL 컬럼 커버리지, 값 길이 초과를 검사하지 않는다. 비교 원천도 live 메타가 아니라 코드젠 스냅샷 `db_columns.json`이다. | [MappingValidator](../../migration-tool/src/main/java/nuri/migration/validate/MappingValidator.java) |
| D2 | 사후 검증은 행 수·checksum·target identity 중심이다. 고아 FK, NOT NULL·UNIQUE 위반, 도메인 적합성, 집계 parity, 샘플 diff는 클래스 주석에 "남은 로드맵"으로만 있다. (2026-10-15: L4 가 load 안 대사로 행 수·NULL 계정·정확 수치 합·최소최대·코드 분포·형식 도메인·표본 재계산과 물리 FK·유일 인덱스 집행 증명, 고아 참조 대조를 구현했다. 물리 유일 인덱스 밖의 논리 UNIQUE·문자 길이 parity·새 세션 독립 재조회 표본은 미뤘다 — UNIQUE·샘플 diff 는 일부만 채운다, [DEC-OPS-324](../../.agent/memory/decisions.md).) | [MigrationVerifier](../../migration-tool/src/main/java/nuri/migration/verify/MigrationVerifier.java) |
| D3 | 매핑은 테이블 1:1·컬럼 1:1이다. 한 소스 테이블은 한 번만 선언할 수 있어 1:N 분할이 불가능하고, 조인(N:1)·컬럼 결합·분할도 없다. 정규화 이관의 핵심 패턴이 표현되지 않는다. | [MappingSpec](../../migration-tool/src/main/java/nuri/migration/model/MappingSpec.java), MappingValidator의 중복 소스 금지 |
| D4 | 내장 변환은 `trim`·`upper`·`lower`·`date`·`timestamp`뿐이다. 표준 일자 `VARCHAR(8)`(YYYYMMDD)·시각 HHmmss 문자열을 만드는 변환이 없고 `date`는 `LocalDate`를 반환한다. custom 변환은 코드 수정과 version·digest 등록이 필요하다. | [TransformerRegistry](../../migration-tool/src/main/java/nuri/migration/transform/TransformerRegistry.java), [TypeConverter](../../migration-tool/src/main/java/nuri/migration/transform/TypeConverter.java) |
| D5 | 이관 도구의 표준 ID는 주석상 foundation과 "동일한 형태"지만 실제로는 소문자 hex이고, [IdGenerationUtil](../../foundation/src/main/java/nuri/foundation/core/util/IdGenerationUtil.java)은 대문자로 만든다. `PRESERVE` 적재 뒤 대상 시퀀스를 재설정(`setval`)하는 단계가 없어, 시퀀스 기반 PK라면 온라인 앱의 첫 INSERT가 충돌할 수 있다. (정정 2026-10-13: `PRESERVE` 만이 아니다 — `remap` 과 직접 컬럼 매핑도 대상 키 값을 넣으므로 같은 충돌이 난다. L1 은 셋 모두를 재설정한다, [DEC-OPS-306](../../.agent/memory/decisions.md).) | [StandardIdGenerator](../../migration-tool/src/main/java/nuri/migration/keymap/StandardIdGenerator.java) |
| D6 | 도구는 Flyway가 이미 만든 대상 테이블에만 적재한다. 표준 모델에 없는 레거시 업무 테이블을 위한 표준 설계 보조(용어 후보·미등록 용어 보고·DDL 초안)가 없다. | [ADR-0008 §4](../02-architecture/decisions/ADR-0008-multi-source-approved-migration-workflow.md) |
| D7 | `codemaps`는 YAML 안의 독립 사전이며 대상 공통코드 원장과 대조하지 않는다. (2026-10-15: L4 가 제품 공통코드 바인딩 카탈로그, 쓰기 검증 컬럼의 쓰기 전 게이트, 적재 뒤 공통코드·메타 허용값 대사를 구현했다. 대조할 원천이 없는 코드 컬럼은 `UNRECONCILED` 로 남겨 컷오버 전에 사람이 서명한다, [DEC-OPS-325](../../.agent/memory/decisions.md).) | MappingSpec |

### 2.2 애플리케이션 이관 관점

| ID | 공백 | 근거 |
|---|---|---|
| A1 | raw JDBC 적재라 JPA 계층의 불변식을 우회한다. 주민등록번호는 [RrnoEncryptionConverter](../../business-core/src/main/java/nuri/business/domain/common/RrnoEncryptionConverter.java)가 암호화하지만 이관 도구에는 암호화 경로가 없어 **평문 적재 위험**이 있다. 비밀번호 해시 호환은 문서 전제로만 남아 있다. | [이관 도구 설계 §mapping.yml](../02-architecture/legacy-migration-tool-design.md) |
| A2 | view·routine·trigger는 disposition으로 분류만 한다. `RECREATE_VIA_FLYWAY`·`REIMPLEMENT_IN_APP` 분류가 실제 변경 작업과 연결되지 않는다. | 이관 도구 설계 §production cutover 전 필수 보강 9 |
| A3 | 레거시 애플리케이션 자산 조사 도구가 없다. SQL 매퍼·화면 라벨·URL, 권한의 [ADR-0016](../02-architecture/decisions/ADR-0016-explicit-permissions-and-multiple-groups.md) 모델(그룹·OPERATION·NAVIGATION) 매핑, 첨부 실물 파일 이관, 기존 URL 리다이렉트가 범위 밖이다. | `migration-tool`·`scripts/` 조사 |
| A4 | Oracle·Tibero·MySQL·MariaDB·SQL Server·CUBRID adapter는 코드상 `UNVERIFIED`라 commit이 금지된다. 실제 적재 가능한 소스는 `EXPERIMENTAL` PostgreSQL뿐이다. | [OracleSourceAdapter](../../migration-tool/src/main/java/nuri/migration/adapter/OracleSourceAdapter.java), [ADR-0008 §6](../02-architecture/decisions/ADR-0008-multi-source-approved-migration-workflow.md) |
| A5 | 단일 source read transaction, 500행 직렬 적재, INSERT-only라 대용량 장시간 스냅샷·재이관·증분 동기화·cutover/rollback이 증명되지 않았다. | 이관 도구 설계 §적재, transaction과 재시작 의미 |

### 2.3 의미 식별을 위한 입력의 부재

- discovery는 컬럼 코멘트(`REMARKS`)를 읽지만 inventory에는 **해시만** 남긴다(`CatalogObject.hashOnlyDefinition`). 코멘트 문구를 매칭 근거로 재사용할 수 없다.
- 값 분포·패턴 프로파일링이 없다.
- 레거시 애플리케이션 소스를 입력으로 받는 경로가 없다. 소스를 제공해도 SQL·VO·화면 라벨의 사용처를 근거로 쓸 수 없다.
- 행정안전부 공통표준 CSV(약 1.3만 행)가 [저장소](../../.agent/knowledge/db-standard-constitution/artifacts/sources/mois-standard-terms-20251101.csv)에 있다. 동의어 성격의 열이 있는 것으로 보이나 인코딩 문제로 열 의미는 재확인이 필요하다. 규범 SSOT는 여전히 live 메타 테이블이다. (정정 2026-10-13: 인코딩 문제는 없다 — UTF-8(BOM)·14열·13,176행이고, `용어 이음동의어 목록`·`허용값`·`저장 형식`·`표현 형식`·`개정구분명` 열이 있다. live 메타에는 이 열들이 없어 ADR-0029 결정 10 이 L2 에서 더한다.)

## 3. 목표 흐름

```text
 [수집]  discover ── inventory.json (현행)
         profile  ── profile.json   (신규: 집계·마스킹 프로파일 + 코멘트 원문)
         app-scan ── app-usage.json (신규, 필수: 레거시 소스의 SQL·VO·화면 라벨·코드 상수 사용처)
              │
              ▼
 [식별]  term-suggest ── 후보 보고서 (신규: 코멘트 → 데이터 순으로 후보 추정, 사용처 대조·충돌 판정, 개념 군집·등급, 제안만)
              │
              ▼
 [적합성] conformance ── 후보 도메인 대비 데이터 적합률·위반 유형·변환 가능성 판정 (신규, §4.3)
              │  사람 검토
              ▼
 [확정]  term-ledger ── 용어 매핑 원장 (신규 SSOT, digest)
              │        └─ 미등록 용어 → 표준 등록 요청(헌법 제9조)
              ▼
 [설계]  표준 미보유 업무 → Flyway DDL (DB 거버넌스 절차, 도구가 생성·실행하지 않음)
              │
              ▼
 [적재]  mapping 생성(원장 기반) → plan → validate → load (현행 승인 계보)
              │
              ▼
 [대사]  verify 확장 — 무결성·도메인·집계 parity·샘플 diff
```

원칙:

- 도구는 **후보와 근거를 만들고, 확정은 사람이** 한다. 추정 매핑을 자동 적용하지 않는다.
- 원장과 산출물에는 원시 행 값·접속정보를 남기지 않는다(현행 redaction 원칙 유지).
- 대상 DDL 소유권은 계속 Flyway에 있다.

## 4. 표준용어 식별 방법론

### 4.1 근거 수집, 후보 추정 순서, 충돌 판정

세 가지를 구분한다. **어떤 근거를 모두 모으는가**, **후보를 어떤 순서로 만드는가**, **근거가 어긋날 때 무엇을 따르는가**다.

#### 근거 수집(모든 컬럼)

레거시 소스가 항상 제공되므로 아래 세 근거는 모든 컬럼에 대해 수집한다. 앞 근거에서 후보가 나왔다고 뒤 근거 수집을 생략하지 않는다.

| 근거 | 내용 |
|---|---|
| 코멘트 | 컬럼·테이블 코멘트 원문 |
| 데이터 프로파일 | 값 패턴·길이·카디널리티 등(아래 프로파일 항목) |
| 사용처(레거시 소스) | SQL alias·조인 조건·WHERE·CASE의 코드 리터럴, VO 필드명, 화면 라벨, 코드 상수·enum, INSERT·UPDATE에서 넣는 값(예: 현재 시각 함수 → 일시) |

#### 후보 추정 순서

| 단계 | 입력 | 추정 방식 |
|---|---|---|
| 1 | 코멘트 | 코멘트를 `meta_standard_words`로 분해해 `meta_standard_terms`에서 용어·도메인 후보를 찾는다 |
| 2 | 데이터 프로파일 | 코멘트가 없거나 후보가 안 나오면 값으로 도메인(일자·일시·여부·코드·금액·번호 등)을 먼저 추정하고, 그 도메인과 이름 토큰·사용처 라벨로 용어 후보를 좁힌다 |
| 3 | 보조 근거 | 그래도 정하지 못하면 이름 토큰 분해(`WRT_YMD` → 작성 + 년월일), 관계(다른 테이블 PK 값 집합에 포함 → FK), 구축 산출물(테이블정의서·화면설계서)을 본다. 근거가 없으면 `UNKNOWN`(§4.6) |

#### 충돌 판정

후보를 어떤 단계에서 얻었든, 세 근거를 모두 대조한 뒤 확정한다.

- 코멘트·데이터·사용처가 모두 같은 의미·도메인을 가리키면 후보의 등급(`EXACT`·`SYNONYM`)을 유지한다.
- 코멘트가 데이터나 사용처와 다르면 **코멘트를 우선하지 않는다.** 레거시 코멘트는 복사·방치된 경우가 많고, 사용처와 데이터는 현재 쓰임새를 보여 준다. `INFERRED`로 내리고 사용처와 데이터를 주된 근거로 사람이 확정한다.
- 사용처끼리 다르면(화면마다 라벨이 다르거나 한 컬럼에 여러 의미를 넣음) 한 컬럼 복수 의미 후보로 보고 §4.3의 표준화 불가 여부를 함께 판정한다.
- 정적 분석으로 보이지 않는 사용처가 있을 수 있다. 문자열 조합 SQL, 동적 컨럼, 프로시저 내부, 외부 연계가 그렇다. "사용처 없음"은 "미사용"의 증거가 아니라 후보일 뿐이다.

프로파일 항목: 선언 타입, 길이 분포, NULL 비율, distinct 수, 정규식 패턴 적합률(일자·전화·이메일·주민번호·여부 등), 저카디널리티 컬럼의 값 빈도(코드 후보), 최근 갱신 흔적. 패턴과 빈도는 **집계·마스킹값만** 기록하고 개인정보 패턴에 맞는 컬럼은 값 빈도를 남기지 않는다.

### 4.2 개념 먼저 묶고, 표준용어는 그다음

서로 다른 이름(`REG_DT`, `INS_DATE`, `WDATE`, `CRT_YMD`)을 근거로 **같은 개념 후보**에 묶은 뒤, 개념 하나에 표준용어 하나를 정한다. 다음 두 경우는 반드시 따로 판정한다.

- **세분성 차이**: `CHAR(8)` 일자와 `TIMESTAMP` 일시는 같은 개념이라도 표준용어·도메인이 다를 수 있다(일자 vs 일시). 일자→일시 전환은 시각을 지어내야 하므로 기본값 정책을 먼저 승인한다.
- **동음이의**: 두 테이블의 `STAT`이 서로 다른 코드 체계일 수 있다. 코드맵은 전역이 아니라 **컬럼 단위**로 확정한다. 코드값의 의미는 레거시 소스의 코드 상수·enum·CASE 분기·화면 선택 목록에서 찾는다.

### 4.3 도메인 적합성 판정과 표준화

후보 용어가 정해지면 그 표준 도메인(타입·길이·허용값)에 실제 데이터가 맞는지 판정한다. 맞지 않는 값이 있으면 **이관 변환으로 표준에 맞출 수 있는지** 확인하고, 가능할 때만 표준화한다.

| 분류 | 예 | 처리 |
|---|---|---|
| 적합 | 값 전체가 도메인을 충족 | 그대로 적재 |
| 형식 변환형(무손실) | `2024-01-31`·DATE → `20240131`, `1/0`·`T/F` → `Y/N`, CHAR 공백 패딩, 숫자 문자열 → NUMERIC, 전화번호 구분자 | versioned 변환을 제안하고, 확정되면 적재 시 적용 |
| 규칙 정제형(의미 판단 필요) | `99991231`·`00000000`·`-` 같은 대체값 → NULL, 존재하지 않는 날짜(`20240230`), 미등록 코드·대소문자 혼재, 한 컬럼 안의 형식 혼재 | 업무 담당자가 승인한 규칙만 적용하고 영향 건수를 기록 |
| 표준화 불가 | 표준 길이 초과, 코드 컬럼의 자유 텍스트, 한 컬럼에 복수 의미, 정밀도 손실 | 자동 변환 금지. 다른 용어·도메인 재선정(필요 시 표준 등록 요청), 원본 보존(§4.6)과 예외 목록, 원천 업무 정정 후 재추출 중에서 선택 |

"표준화 가능"의 기준:

- **결정적**이고 **의미를 보존**한다. 같은 입력은 늘 같은 출력이며 정보가 사라지지 않는다.
- **값을 추정·생성하지 않는다.** 절단, 누락값 채우기, 시각 지어내기는 표준화가 아니다(시각 기본값처럼 불가피한 경우는 §4.2의 별도 승인).
- 변환 후 값이 대상 도메인을 **100% 충족**해야 원장 행을 확정할 수 있다.
- 소스 DB는 수정하지 않는다. 표준화는 적재 시 변환으로만 하고, 변환 규칙·적합률·예외 건수를 원장(§5)에 남긴다.
- 적합하지 않은 행을 조용히 버리지 않는다. 예외 행은 원시 값 없이 식별자·위반 유형으로 보고하고, 행 단위 제외도 승인 사항이다(§9 Q6).

### 4.4 매칭 등급

| 등급 | 의미 | 처리 |
|---|---|---|
| `EXACT` | 표준 영문약어·용어명과 일치 | 검토 후 일괄 확정 가능 |
| `SYNONYM` | 표준사전 동의어와 일치 | 검토 후 확정 |
| `INFERRED` | 프로파일·사용처·관계 근거의 추정 | **업무 담당자 확정 필수** |
| `UNKNOWN` | 근거 부족 | 결정 대기열 |

감사 컬럼(등록일·등록자 등)과 여부·일자 패턴은 규칙으로 일괄 처리하고, 사람의 검토는 `INFERRED`·`UNKNOWN`에 집중한다.

LLM은 후보 생성에 쓸 수 있지만 결과는 제안이다. 컬럼명·코멘트·샘플을 외부 서비스로 보내는 것은 정보 반출이므로 기관 승인 없이 하지 않는다(§9).

### 4.5 표준에 없는 개념

[DB 헌법 제9조](../../.agent/knowledge/db-standard-constitution/artifacts/constitution.md)에 따라 임의 설계하지 않는다. 미등록 단어·용어를 **표준 등록 요청서**로 묶어 승인받고, 등록 후 원장 행을 확정한다.

### 4.6 의미를 끝내 확정할 수 없는 컬럼

| 상태 | 처리 |
|---|---|
| 전부 NULL·상수, 레거시 소스에서 사용처 미발견, 장기 미갱신 | 업무 담당자 확인 후 이관 제외(`APPROVED_IGNORE`) + 원본 아카이브. 사용처 미발견만으로 자동 제외하지 않는다(§4.1 충돌 판정) |
| 데이터는 있으나 의미 불명 | 원본 구조 그대로 아카이브 스키마/덤프에 보관, 기한을 정해 업무 확인 후 2차 이관 |
| 금지 | 표준 테이블에 `etc1`·`rmrk2` 같은 범용 컬럼을 만들어 담는 것 |

## 5. 용어 매핑 원장

개념 식별 결과의 SSOT다. `mapping.yml`은 원장에서 생성하거나 원장과 대조한다.

| 필드 | 설명 |
|---|---|
| `sourceColumn` | 소스 stable ID(endpoint·schema·table·column) |
| `conceptId` | 같은 의미 군집 ID |
| `standardTerm` / `domain` | 표준 용어명·영문약어·도메인(live 메타 조회값) |
| `target` | 대상 테이블·컬럼, 또는 `ARCHIVE`·`IGNORE` |
| `transform` / `codemap` | 표준 도메인으로의 변환과 컬럼 단위 코드맵 |
| `inferenceSource` | 후보 추정 출발점: `COMMENT`·`DATA_PROFILE`·`SUPPLEMENTARY`(§4.1) |
| `grade` | `EXACT`·`SYNONYM`·`INFERRED`·`UNKNOWN` |
| `conformance` | 변환 전·후 도메인 적합률, 위반 유형, 처리 분류(§4.3), 예외 건수 |
| `usage` | 레거시 소스 사용처 요약(파일·위치·유형, SQL·화면 라벨의 의미 요약)과 동적 SQL 등 정적 분석 한계 표시 |
| `evidence` | 근거 유형과 요약, 충돌 여부(원시 값 금지) |
| `status` | `CONFIRMED`·`PENDING`·`PENDING_STANDARD`·`PENDING_CLEANSING`·`ARCHIVE`·`IGNORE` |
| `confirmedBy` / `confirmedAt` | 확정자 역할·일시 |

결속 규칙:

- `mapping.yml`의 모든 타깃 컬럼 매핑은 `CONFIRMED` 원장 행을 참조해야 하며, 아니면 validate가 실패한다.
- 원장 digest를 plan의 결속 대상(inventory·mapping·target·execution contract)에 추가해 승인 후 변경을 탐지한다.
- 원장의 `standardTerm`·`domain`은 plan 시점 live 메타와 다시 대조한다.
- `CONFIRMED`는 변환 후 적합률 100%이거나 승인된 예외 처리가 기록된 경우에만 허용한다. 규칙 정제형 변환은 승인 근거가 없으면 `PENDING_CLEANSING`에 머문다.

## 6. 채택 당시 도구 보강안

| 항목 | 내용 | 대응 공백 |
|---|---|---|
| `profile` 명령 | 읽기 전용, 동일 read session에서 집계·마스킹 프로파일과 코멘트 원문을 canonical JSON으로 저장 | §2.3 |
| `app-scan` 명령(필수 입력) | 제공된 레거시 소스를 읽기 전용으로 분석해 컬럼별 사용처(SQL alias·조인·코드 리터럴, VO 필드, 화면 라벨, 코드 상수·enum)와 메뉴·URL·권한 목록을 추출한다. 동적 SQL·해석 불가 파일은 `PARTIAL`로 남기고, 설정 파일의 접속정보·비밀값은 산출물에 복사하지 않는다 | A3, §2.3 |
| `term-suggest` 명령 | 코멘트 → 데이터 순으로 후보를 추정하고 세 근거(코멘트·데이터·사용처)를 대조해 충돌·개념 군집·등급 보고서를 만든다. 자동 적용 없음 | §1, §4.1 |
| `conformance` 분석 | 후보 도메인 대비 적합률·위반 유형을 집계하고, 변환 후보 적용 시의 적합률과 예외 행(식별자·위반 유형만)을 보고 | §4.3 |
| 원장 검증 | 원장 스키마·상태 전이·live 메타 대조, 원장→mapping 생성과 미확정 참조 차단 | D1, D6 |
| validator 강화 | live 메타 도메인 타입·길이, 대상 NOT NULL 커버리지, 소스 최대 길이 대비 초과 사전 점검 | D1 |
| 표준 도메인 변환기 | `ymd8`(YYYYMMDD), `hms6`(HHmmss), `yn`(여부) 등 versioned builtin | D4 |
| 분할·조인 매핑 | 1:N 분할(같은 소스의 다중 target 선언, 실행 식별자 분리)과 N:1 조인 projection DSL | D3 |
| 대사 확장 | 고아 FK·UNIQUE·NOT NULL 스캔, 도메인 적합성, 집계 parity, 샘플 diff | D2 |
| ID·시퀀스 | foundation 생성 규칙과 일치시키고 계약 테스트로 고정, 대상 키 값을 넣는 적재(`preserve`·`remap`·직접 컬럼) 후 시퀀스 재설정 단계 | D5 |
| 민감 컬럼 | 암호화·재설정 정책을 원장 필드로 강제하고, 평문 패턴이 암호화 대상 컬럼에 들어가면 실패 | A1 |
| 공통코드 대조 | 코드맵 결과값을 대상 공통코드 원장과 대조 | D7 |
| 벤더 증거 | Oracle 실DB rehearsal로 표준화 파이프라인(수집·원장·mapping 생성·DRY_RUN·엔진 COMMIT)을 실측한다(L4-B, Free 23.26.3·합성 데이터). 증거 등급과 공개 commit 차단은 기관의 실제 버전·계정·규모·드라이버로 리허설한 뒤 따로 정한다([DEC-OPS-323](../../.agent/memory/decisions.md)). Tibero 는 라이선스가 없어 하지 않는다 | A4 |

## 7. 채택 당시 우선순위

| 순위 | 항목 | 이유 |
|---|---|---|
| P1 | 민감 컬럼 처리(A1) | 개인정보 사고 예방 |
| P1 | ID 규칙 일치·시퀀스 재설정(D5) | 이관 직후 앱 장애 예방, 범위가 작고 검증이 쉬움 |
| P1 | validator의 live 메타 도메인·NOT NULL 검사(D1) | "표준화 이관" 목적의 최소 보장 |
| P2 | `profile`·`app-scan`·`term-suggest`·`conformance`·원장(§4~5) | 매핑 작성 비용과 오류의 주된 원인, 비표준 값의 조기 발견. 레거시 소스가 필수 입력이므로 `app-scan`을 함께 둔다 |
| P2 | 표준 도메인 변환기·분할/조인(D3·D4) | 정규화 이관 가능 |
| P2 | 대사 확장(D2) | 업무 수준 정합성 증명 |
| P2 | Oracle·Tibero 증거 상향(A4) | 공공 레거시 실사용 |
| P3 | 권한·메뉴·첨부 이관 가이드와 비데이터 객체 재구현 연결(A2·A3) | 애플리케이션 의미 이관. `app-scan`의 메뉴·URL·권한 목록을 입력으로 쓴다 |

## 8. 채택 당시 검증 계획

- 각 보강은 TDD로 진행하고, 새 검사는 의도적 위반이 red가 되는 부정 테스트를 함께 둔다(AGENTS H5).
- D5: foundation `IdGenerationUtil`과 형식(prefix·길이·대소문자) 동등성 계약 테스트, 시퀀스 재설정 PostgreSQL 통합 테스트.
- A1: 암호화 대상 컬럼에 평문 패턴이 오면 load가 쓰기 전 실패하는 테스트.
- D1: 길이 초과·NOT NULL 누락·도메인 불일치 매핑이 validate에서 실패하는 테스트, live 메타 조회 실패 시 fail-closed.
- `profile`: 산출물에 원시 값·개인정보 패턴 값이 없음을 redaction guard로 검사.
- `app-scan`: 설정 파일의 접속정보·비밀값이 산출물에 나오지 않는지, 동적 SQL이 `PARTIAL`로 표시되는지, 사용처 미발견 컬럼이 자동으로 `IGNORE`가 되지 않는지 검사.
- `term-suggest`: 코멘트가 있으면 코멘트 후보가, 없으면 데이터 기반 후보가 나오고, 코멘트가 데이터나 사용처와 충돌하면 코멘트를 따르지 않고 `INFERRED`로 내려가는지 검사.
- `conformance`: 형식 변환형 변환이 무손실(왕복 또는 원값 복원 근거)인지, 길이 초과 값이 절단되지 않고 예외로 보고되는지, 예외 행이 조용히 빠지지 않는지 검사.
- 실행 경로는 기존 `npm run verify:migration`과 이관 CI scope에 연결한다.

## 9. 채택 전 결정 질문 (ADR-0029로 결정됨)

> [ADR-0029](../02-architecture/decisions/ADR-0029-legacy-standardization-migration.md)가 Q1~Q7 을 닫았다. L1 준비 중 사용자에게 따로 물은 Q8~Q10(표준 메타 확장·JPA 전용 시퀀스·외부 드라이버 실행)은 이 표에 없고 ADR 결정 10~12 에 있다. 아래 표는 채택 전 질문 그대로다.

| ID | 질문 | 선택지 |
|---|---|---|
| Q1 | 민감 컬럼 암호화를 어디서 하나 | (a) 이관 도구에 호환 암호화 구현 + secret provider 키 주입 — 구현 중복·드리프트 위험 (b) 평문을 격리 staging에 두고 온라인 앱 배치가 JPA로 재저장 — 평문 체류 위험 (c) 이관 도구가 foundation 암호 모듈만 의존 — [DEC-OPS-005](../../.agent/memory/decisions.md)의 foundation 미의존 경계 변경 |
| Q2 | 원장의 형식·위치 | YAML/JSON 파일(Git 검토) vs 대상 DB `migration_control` 테이블 |
| Q3 | LLM 후보 생성 허용 범위 | 금지 / 로컬 모델만 / 기관 승인 후 외부 허용(컬럼명·코멘트만, 값 금지) |
| Q4 | 의미 불명 데이터 아카이브 | 대상 DB 별도 스키마 vs 외부 덤프 보관, 보존 기한 |
| Q5 | 1:N·N:1 DSL | `MappingSpec` 확장 vs 사전 staging view(소스 측 읽기 전용) 활용 |
| Q6 | 도메인에 맞지 않는 행의 기본 처리 | 해당 테이블 적재 중단(현행 fail-closed와 일관) vs 승인된 예외 목록으로 격리하고 나머지 진행 — (정정 2026-10-13: 당시 적재기는 fail-closed 가 아니었다. 변환에 실패한 행을 건너뛰고 나머지를 커밋했다. L1 이 행 변환 실패를 fail-closed 로 바꿨고, 쓰기 단계 오류는 아직 행 단위로 격리된다 — [GAP-ETL-001](../../.agent/memory/known-gaps.md).) |
| Q7 | `app-scan`이 지원할 레거시 스택과 소스 제공 형식 | 예: 전자정부프레임워크(Spring)·MyBatis/iBATIS·JSP를 1차 범위로 두고 그 밖은 `PARTIAL`. 소스는 저장소 vs 아카이브 파일, 빌드 산출물만 있는 경우 처리 |

## 10. 비목표

- 표준용어의 자동 확정, 대상 DDL의 자동 생성·실행
- 소스 procedure·trigger의 자동 번역, CDC·dual-write·무중단 cutover
- 레거시 애플리케이션 코드의 자동 변환

---
*작성 2026-10-13, DRAFT. 같은 날 코멘트 우선 후보 추정, 도메인 적합성 판정, 레거시 소스 필수 입력 전제와 충돌 판정 원칙(§4.1·§4.3)을 반영했다. 같은 날 [ADR-0029](../02-architecture/decisions/ADR-0029-legacy-standardization-migration.md)로 채택했고, [이관 도구 설계](../02-architecture/legacy-migration-tool-design.md)와 공용 gap 인덱스는 L1 변경이 갱신했다. 2026-10-15 L4-B 가 §6 벤더 증거 행을 실측 범위로 정리했다(등급 상향은 하지 않았다).*
