# 레거시 데이터 이관 도구

> **상태: PARTIAL** — `migration-tool`은 온라인 애플리케이션과 분리된 선택형 offline ETL CLI다. 여러 종류의 source DB를 위한 객체 조사·승인 계획과 PostgreSQL target 테이블 데이터 적재 골격은 구현됐지만, 실제 벤더 DB rehearsal·운영 cutover·rollback을 승인하거나 이관 성공을 보증하는 증거는 아직 없다.

## 목적과 경계

이 도구는 PostgreSQL·Oracle·Tibero·MySQL·MariaDB·Microsoft SQL Server·CUBRID 및 generic JDBC source를 위한 adapter registry를 제공한다. 그러나 자동 적재 대상은 `mapping.yml`에 선언한 **테이블 데이터**이며 target DBMS는 현재 정확히 **PostgreSQL 하나**다. 발견한 view·routine·trigger·grant 같은 객체는 누락 없이 계획에 분류하지만 DDL을 직접 변환·실행하지 않는다. 현재 프로젝트의 target schema는 계속 애플리케이션 Flyway가 소유한다.

모듈은 `foundation`이나 온라인 런타임에 의존하지 않는 독립 `bootJar`이며, 이관이 필요한 프로젝트에서만 실행한다. 직접 `--mapping=... --mode=dry-run|commit` 경로는 승인 artifact를 우회하므로 dry-run과 commit 모두 차단한다.

레거시 컬럼의 의미 식별과 표준용어 확정(표준화 단계), 그 결과를 적재에 결속하는 용어 매핑 원장과 단계별 보강(L1~L4)은 [ADR-0029](decisions/ADR-0029-legacy-standardization-migration.md)가 정한다. 이 문서의 승인 계보·redaction·INSERT-only 경계는 그대로다.

```text
mapping.yml + source DB
        │
        ▼
 discover ──> catalog inventory.json
                  │  source endpoint/driver/adapter/scope + object/visibility digest
                  ▼
 mapping.yml + target PostgreSQL fingerprint + optional review.yml
                  │
                  ▼
   plan ─────> migration plan.json ─────> validate
                  │  inventory/mapping/target/implementation digest
                  ▼
   load(dry-run|commit) ──> live source 재발견 + target 재지문 + ETL/verify
```

## 승인형 CLI와 artifact

| 명령 | 입력과 출력 | fail-closed 경계 |
|---|---|---|
| `discover` | `mapping.yml`과 source connection으로 요청한 catalog/schema/44개 object kind를 조사하고 canonical JSON inventory를 atomic write | source·target `endpointId` 존재를 요구하고, source endpoint digest·adapter product/version preflight·JDBC read-only signal·driver evidence·discovery scope를 inventory에 결속한다. raw DDL·JDBC URL·username/password는 artifact에 기록하지 않는다. |
| `mapping-generate` | 사람이 쓴 skeleton·검토한 용어 매핑 원장·승인 inventory 로 `--mapping` 에 mapping.yml 을 atomic write([원장에서 mapping 만들기](#원장에서-mapping-만들기)) | DB 에 접속하지 않고 접속 자리표시를 치환하지 않는다. 원장은 출력 mapping 디렉터리 안에 있어야 하고, 원장 검증·소스 단위 완전성·자격·개인정보 값 검사·정적 검증을 모두 지나야 쓴다. 출력은 입력 파일과 다른 경로여야 한다. |
| `plan` | inventory, mapping, 현재 target PostgreSQL schema fingerprint와 선택적 `review.yml`을 결합해 schema v3 plan을 atomic write | inventory의 source endpoint·driver·adapter·scope, mapping digest, target fingerprint, migration-tool 구현 bytes·핵심 class·adapter read-session·선택 transformer 계약을 digest로 묶는다. 발견 객체 전부가 검토·분류되지 않거나 visibility finding이 남으면 `commitReady=false`다. live 대상 계약·표준 사전 검증([표준 계약 검증](#표준-계약-검증))에 실패하면 표·컬럼 이름을 밝히고 plan을 쓰지 않는다. mapping 이 용어 매핑 원장을 선언하지 않았거나 원장 검증에 실패하면 plan 을 쓰지 않는다(DEC-OPS-317). 조회 조인이 읽기만 하는 표는 `review.yml` 이 `LOOKUP_INPUT` 으로 밝혀야 한다([조회 조인](#조회-조인adr-0029-l3d)). |
| `validate` | plan 한 개를 읽어 `commitReady`를 검사 | 승인 workflow는 정확히 plan schema v3만 허용한다. 이 명령은 live DB를 다시 읽거나 새 artifact를 만들지 않는다. |
| `load` | mapping·inventory·plan과 동일 discovery scope로 source를 다시 조사하고 `dry-run` 또는 `commit` 실행 | source endpoint/driver/scope/inventory, mapping, target PostgreSQL fingerprint, 실행 구현 계약을 모두 다시 exact-match한다. 불일치·미승인 adapter/driver/freeze·검증 WARN/FAIL은 non-zero 종료다. 원장 선언·원장 검증도 실행 직전에 다시 본다. COMMIT 은 조회 표의 조회 키 유일성을 행을 읽기 전에 증명한다. plan 옆의 고유 실행 JSON에 `STARTED`를 먼저 저장하고 `PASS`/`FAILED`로 갱신한다. |

Workflow 파일은 UTF-8 regular file, 최대 16 MiB, symlink 금지 계약을 적용한다. 출력은 같은 디렉터리의 임시 파일을 `fsync`한 뒤 atomic replace하며 atomic move를 지원하지 않으면 실패한다. Inventory는 raw native definition 대신 definition hash만 보존하고, artifact redaction guard는 JDBC URL·credential·private key 형태를 차단한다.

### 수집 명령(ADR-0029 L2a)

표준화 단계의 근거를 모으는 두 명령이다. 둘 다 소스와 대상 DB 에 쓰지 않고, 만든 산출물은 승인 계보(plan·load)에 들어가지 않는다 — L2b 의 후보 생성과 사람의 검토가 읽는 입력이다([DEC-OPS-311](../../.agent/memory/decisions.md)).

| 명령 | 입력과 출력 | fail-closed 경계 |
|---|---|---|
| `profile` | `mapping.yml`·inventory 와 같은 discovery scope 로 source 를 다시 조사한 뒤, inventory 의 테이블을 한 읽기 전용 트랜잭션으로 훑어 `--profile` 에 canonical JSON 을 쓴다. `--profile-row-limit` 로 테이블마다 읽을 행을 줄일 수 있고 잘린 테이블은 `truncated` 다. | source endpoint·driver evidence·scope 가 inventory 와 같아야 하고 live 재조사 digest 가 inventory semantic digest 와 같아야 한다(소스가 바뀌었으면 쓰지 않는다). 산출물은 그 digest 에 결속된다. SQL 오류로 읽지 못한 테이블은 `FAILED`·SQLSTATE 로 남기고 산출물을 쓴 뒤 non-zero 로 끝난다. |
| `app-scan` | `--app-source` 디렉터리(읽기 전용)를 훑어 `--app-usage` 에 canonical JSON 을 쓴다. DB 에 접속하지 않는다. | 심볼릭 링크를 따라가지 않고 설정 파일(properties·yml·env·키 저장소)은 내용을 읽지 않는다. 동적 SQL·문자열 조합 SQL·해석하지 못한 XML·압축본·소스 없는 빌드 산출물은 `PARTIAL` 과 그 이유로 남긴다. |

- **profile 이 싣는 것**: 컬럼마다 선언 정보(inventory 그대로), 행·NULL·공백 수, 값 종류(문자·숫자·일시·LOB·기타) 수, 문자 길이 최소·최대·합, 끝 공백 수, distinct 수(1,000 상한), 값 모양별 개수(`YMD8`·`HMS6`·`YN`·`PHONE`·`RRN` 등, 앞뒤 공백 제거 기준), 달력에 없는 8자리 날짜 수, 연도 범위, 코멘트다.
- **값 빈도**: 개인정보 모양이 한 번도 없고, 값이 모두 문자·숫자이며, 서로 다른 값이 20개 이하이고, 모든 값이 대문자·숫자·`_.:-` 12자 이하인 컬럼만 싣는다. 그래도 5번 미만으로 나온 값은 행 수만 합친다. 소문자가 섞인 값(계정 ID 가 흔히 그렇다)은 싣지 않는다. 빠진 이유는 `frequencyOmittedReason` 이 말한다.
- **코멘트**: JDBC `REMARKS` 로 다시 읽어 inventory 에 해시로 남은 코멘트와 대조한다(`MATCH`·`MISMATCH`·`NOT_IN_INVENTORY`·`INVENTORY_ONLY`·`ABSENT`). 개인정보로 보이는 부분은 `[REDACTED:종류]` 로 가리고, 자격처럼 보이는 코멘트는 원문을 싣지 않는다(`withheld`). Oracle 처럼 드라이버가 `REMARKS` 를 돌려주지 않으면 `INVENTORY_ONLY` 다.
- **app-scan 이 싣는 것**: 컬럼(대문자 스네이크로 맞춘 이름)별 사용처 — SELECT 별칭, 조인 조건, 문자열 리터럴 비교·IN 목록, CASE·DECODE 의 코드 값과 라벨, INSERT·UPDATE 의 현재 시각 함수, 파라미터 바인딩, resultMap, VO 필드와 바로 앞 주석, 화면 라벨·목록 머리글·선택 목록 — 과 SQL 이 참조한 테이블, 코드 상수·enum, 요청 경로, 보안 설정의 경로별 접근 규칙이다. 파일 경로는 스캔 루트 아래 상대 경로다.
- **판정하지 않는 것**: 사용처가 보이지 않는 컬럼을 미사용·제외로 판정하지 않는다(ADR-0029 결정 2). 산출물에 그런 필드가 없다.
- **두 산출물의 공통 경계**: 쓰기 전에 자격 검사와 개인정보 값 검사(주민등록번호·전화번호·이메일)를 모두 지난다. 생성기가 거른 뒤에도 남은 것이 있으면 산출물을 만들지 않는다. 컬럼·테이블 이름은 JSON 키로 쓰지 않는다.
- **한계**: 따옴표가 필요한 식별자(한글·공백·대소문자 혼합)의 테이블은 읽지 않고 `SKIPPED_IDENTIFIER` 로 남긴다 — 적재기와 같은 제한이다. app-scan 은 파서가 아니라 패턴이라 놓치는 사용처가 있다. MySQL 은 행을 하나씩 흘려 읽고, PostgreSQL 은 autocommit 을 끄고 500행씩 읽는다.

```powershell
./gradlew :migration-tool:bootRun --args="--command=profile --mapping=mapping.yml --inventory=inventory.json --profile=profile.json --source-adapter=postgresql-pg-catalog --schemas=legacy"
./gradlew :migration-tool:bootRun --args="--command=app-scan --app-source=D:/legacy/src --app-usage=app-usage.json"
```

### 용어 매핑 원장(ADR-0029 L2b-1)

레거시 컬럼이 어느 표준 용어·대상 컬럼으로 가는지와 그 확정 이력을 담는 기관 이관 저장소의 검토 파일(YAML/JSON)이다([DEC-OPS-312](../../.agent/memory/decisions.md)). 원시 행 값·접속정보는 담지 않으며, 읽을 때 자격 검사와 개인정보 값 검사를 지나야 한다.

```yaml
schemaVersion: 2
entries:
  - id: L1
    source: {table: legacy.legacy_user, column: END_YMD}
    target: {table: public.tb_user_info, column: end_ymd}
    term: {name: 종료일자, engAbbr: END_YMD, domain: 연월일C8}   # 비표준 대상이면 nonStandardTarget: {reason: ...}
    grade: EXACT            # EXACT·SYNONYM·INFERRED·UNKNOWN
    status: CONFIRMED       # PROPOSED·REVIEWED·CONFIRMED·APPROVED_IGNORE·ARCHIVE·REGISTRATION_REQUESTED·REJECTED
    load: {transform: ymd8, nullify: [{violation: PLACEHOLDER_DATE, maxRows: 12}]}   # 확정 행에 필수, {} = 변환 없음
    conformance:
      rate: 99.6            # 참고값. 셀 수 없었으면 비우고 unmeasured 에 이유를 적는다
      transform: transform:ymd8
      violations: [{type: PLACEHOLDER_DATE, rows: 12}]
    note: 9999-12-31 은 종료일 없음의 자리표시다
    history:
      - {to: REVIEWED, by: 검토자, at: "2026-10-01"}
      - {to: CONFIRMED, by: 업무담당, at: "2026-10-02"}
```

- **mapping 결속**: mapping.yml 에 `ledger: {path: term-ledger.yml, sha256: <원장 파일 바이트의 SHA-256>}` 를 선언한다. path 는 mapping 파일 디렉터리 기준이고 그 디렉터리 밖(`..`)을 가리키면 멈춘다. 원장 digest 가 mapping digest 에 들어가므로 plan 뒤에 원장이 바뀌면 load 가 멈춘다. 원장을 선언하지 않은 옛 artifact 의 digest 계산은 그대로지만, plan·load 는 원장 없는 mapping 을 받지 않는다(아래 필수화 시점).
- **전이 이력**: `history` 는 `PROPOSED` 에서 지금 상태까지의 합법 전이여야 한다(`PROPOSED→REVIEWED→CONFIRMED` 등). 날짜는 거꾸로 갈 수 없고, 확정·이관 제외·외부 보관은 도구 이름(`term-suggest`·`migration-tool` 등)으로 기록할 수 없다.
- **상태별 필수 항목(형식 2, [DEC-OPS-316](../../.agent/memory/decisions.md))**: 확정(`CONFIRMED`)은 표준 용어·대상 컬럼(표준 영문약어와 같은 이름)·`load` 가 필요하다. 형식 1 원장은 읽지 않는다. 적합률은 참고값이다 — 확정하려면 적합률이나, 셀 수 없었던 이유(`unmeasured`, 추정기 코드)와 사유(`note`)가 있어야 하고 `SAMPLED` 로는 확정하지 않는다. 적합률이 100 미만이면 기록된 위반이나 승인 예외가 있어야 한다(위반 기록을 지워 확정하지 못하게). 기록된 위반마다 실행 시점 처리가 있어야 한다(`BLANK`·`PLACEHOLDER_DATE` 는 `nullify` 나 승인 예외 — `BLANK` 는 `unmapped: fail` codemap 이 공백의 표준 코드를 정하거나 멈추는 것으로도 된다, `INVALID_DATE`·`FORMAT` 은 그 값을 멈추는 load 와 승인 예외, `NOT_ALLOWED` 는 `unmapped: fail` codemap 만). 셀 수 없었던 위반에는 행 단위 판정이 있어야 한다(표준 도메인 변환기나 `type` — 문자 `type` 도 이진·XML·구조·배열·참조·ROWID·스트림 객체는 거부하고 문자로 읽은 LOB 만 받는다). 한 소스 컬럼은 대상 컬럼마다 확정 행을 둘 수 있고(유일 키에 대상 컬럼이 들어간다), 한 대상 컬럼은 mapping 의 컬럼 항목 하나만 채운다(mapping 정적 검증). 승인 예외는 `maxRows` 1~1000·사유·격리할 수 있는 코드만이며 격리 실행은 L3b 다. 날짜·일시·시각·여부 도메인은 표준 변환기(`ymd8`·`ymd8-truncate`, `ymdhms14`, `hms6`, `yn` 또는 codemap)를 load 에 둬야 하고, 값을 규칙으로 바꾸는 load(시각 버림·자정 붙임·`nullify`)에는 사유가 필요하다. `UNKNOWN` 은 확정할 수 없다(비표준 대상은 예외). 이관 제외는 사유, 외부 보관은 보존 기한, 표준 등록 요청은 요청할 용어 이름이 필요하다. 판정 표는 [LoadCapabilities](../../migration-tool/src/main/java/nuri/migration/validate/ledger/LoadCapabilities.java)다.
- **비표준 대상(U1, [DEC-OPS-317](../../.agent/memory/decisions.md))**: 표준 용어가 없는 대상 컬럼은 `term` 대신 `nonStandardTarget: {reason}` 으로 확정한다. plan·load 가 대상 schema 의 `meta_standard_terms` 에 그 컬럼 이름의 용어가 없음을 확인할 때만 받는다(폐기 용어도 있다고 본다). 이 행에는 conformance 를 두지 않고 도메인 대조가 없으며, 물리 타입 검사([표준 계약 검증](#표준-계약-검증))는 그대로다.
- **허용값을 확인하지 못한 코드(U3)**: `ALLOWED_VALUES_UNVERIFIED` 인 코드·여부 컬럼은 사유가 있으면 codemap 없이 확정한다. 허용값 대사는 L4 가 맡는다. 허용값을 읽을 수 있으면 codemap 이 내는 표준 코드(쓰이는 대체값 포함)는 그 안이어야 한다.
- **mapping 대조(coverage)**: 원장과 mapping 의 소스 표를 승인 inventory 의 표·컬럼으로 해석해(표기가 달라도 같은 표) 세 가지를 본다. 정방향 — mapping 이 소스 컬럼에서 옮기는 모든 컬럼(상수 제외, fkRef 포함)이 같은 소스·같은 매핑 id·대상의 확정 행을 가리키고 transform·type·codemap·nullify 가 그 행의 `load` 와 정확히 같다. 원장 행의 `mapping` 을 생략하면 그 소스의 기본 매핑(id 없음)이다. 역방향 — 확정 행은 모두 mapping 에 있다. 확정 행의 매핑 id 가 mapping 에 없거나 mapping 이 읽지 않는 소스 표의 확정 행이면 오류다. 소스 단위 완전성 — mapping 이 읽는 소스 표의 모든 inventory 컬럼은 확정 행이 하나 이상이거나 이관 제외·외부 보관 행이 정확히 하나다. 외부 보관 행은 실행할 수 없어 L3e 전까지 멈춘다. 기본이 아닌 `mapping` 행은 L3c 부터 그 id 의 매핑([매핑 식별자와 분할](#매핑-식별자와-분할adr-0029-l3c))으로, `via` 행은 L3d 부터 그 매핑 id 의 별칭으로 조회하는 컬럼([조회 조인](#조회-조인adr-0029-l3d))으로 실행한다. `via` 행에는 `mapping` 을 두지 않는다 — 그 컬럼을 읽는 매핑은 `via.mapping` 이다.
- **live 메타 대조**: plan·load 때 확정 행의 표준 용어가 대상 schema 의 `meta_standard_terms` 에 있고 이름·도메인이 같으며 폐기되지 않았는지 본다. 같은 영문약어라도 schema 마다 다른 용어로 본다. 폐기 여부·허용값 컬럼(V2_128)이 없는 DB 에서는 대조를 멈춘다.
- **필수화 시점**: L3a-2 부터 plan·load 는 원장을 선언한 mapping 만 받는다(DEC-OPS-317). 원장 없는 mapping 은 "mapping 은 용어 매핑 원장을 선언해야 합니다 — mapping-generate 로 만드세요" 로 멈춘다. 원장 `load` 는 내장 변환기만 받으므로 프로젝트 변환기는 workflow 에서 쓰지 못한다.

V2_128 은 `meta_standard_terms` 에 `synonyms`(용어 이음동의어 목록)·`allowed_values`(허용값)·`deprecated_yn`(폐기 여부)을 더하고, 저장소의 행정안전부 공통표준용어 CSV(2025-11 판) 값으로 5,683행을 채운다. CSV 에서 같은 영문약어가 서로 다른 값으로 두 번 나오는 TXPR_NM·BZMN_NM·CONM 은 근거가 없어 비운다. 공유 OCI DB 적용은 별도 승인이다.

### 용어 후보(ADR-0029 L2b-2)

`term-suggest` 는 수집 산출물과 대상 DB 의 표준 사전으로 레거시 컬럼마다 표준 용어 후보를 만든다([DEC-OPS-313](../../.agent/memory/decisions.md)). 대상 DB 는 읽기만 하고 소스에는 접속하지 않는다. 결과는 원장 검토의 입력일 뿐 plan·load 의 승인 계보에 들어가지 않는다.

```powershell
./gradlew :migration-tool:bootRun --args="--command=term-suggest --mapping=mapping.yml --profile=profile.json --app-usage=app-usage.json --suggestions=suggestions.json --ledger-draft=term-ledger.draft.yml"
```

- **입력**: `--profile`(필수)과 `--app-usage`(선택)는 envelope 형식·본문 digest·자격·개인정보 검사를 다시 지난다. 표준 사전은 mapping 의 target 에서 `--meta-schema`(기본 `public`)의 `meta_standard_terms`·`meta_standard_words`·`meta_standard_domains` 를 읽는다. 동의어·허용값·폐기 여부 컬럼(V2_128)이 없으면 멈춘다.
- **근거와 등급**: 컬럼 이름이 표준 영문약어와 같거나 코멘트가 용어명과 같으면 `EXACT`, 코멘트가 이음동의어면 `SYNONYM` 이다. 코멘트를 표준 단어로 끝까지 나눠 영문약어가 되거나(가장 긴 단어부터, 대표 단어 우선) 화면 라벨·목록 머리글·VO 라벨이 용어를 가리키면 `INFERRED` 다. 비교 전에 괄호 안 설명, 첫 `:`·`,`·`;` 뒤, 공백·밑줄을 지운다. 폐기 용어는 후보로 내지 않고, 후보가 없으면 `UNKNOWN` 이다.
- **충돌**: 이름·코멘트·라벨이 함께 가리키는 용어가 없으면 `SOURCES_DISAGREE`, 데이터 모양이 후보 도메인과 맞지 않으면(예: 시분초 값에 연월일 도메인) `DATA_DOMAIN:<영문약어>` 를 남기고 그 후보를 `INFERRED` 로 낮춘다. 데이터 모양은 프로파일 값의 95% 이상이 같은 모양일 때만 정하고, 8자리·14자리 숫자는 달력에 있는 값이 그만큼일 때만 날짜·일시로 본다. 6자리 숫자는 시각·연월·금액이 같은 모양이고 0·1 은 건수일 수도 있어, 그런 모양은 날짜·시각 도메인과만 어긋난다고 본다. 숫자형 시각(`NUMBER(6)`)은 앞자리 0 이 사라져 시분초 모양으로 세지 않는다 — 충돌은 내지 않지만 적합률이 낮게 나온다.
- **적합성 추정**: 후보마다 프로파일 집계로 도메인 적합률·위반·필요한 변환을 추정한다. 변환 힌트는 mapping 어휘 그대로다([DEC-OPS-316](../../.agent/memory/decisions.md)) — `transform:<내장 변환기>`·`type:<type>`·`codemap`·`mixed`(모양마다 다른 변환이 필요)·없음. 날짜(`연월일C8`)·일시(`연월일시분초C14`)·시각(`시분초C6`) 도메인은 모양과 상관없이 `transform:ymd8`·`transform:ymdhms14`·`transform:hms6` 이고, 여부 도메인은 Y·N 만 있으면 `transform:yn`, 1·0·true·false 가 섞이면 `codemap` 이다. 그 밖의 날짜 컬럼은 문자 날짜면 `transform:date-text`, 일시 컬럼은 날짜만 있으면 `transform:timestamp-from-date`, 일시면 `transform:timestamp-text` 다. 경과: L3a-1 까지는 `custom:*` 어휘였다. 같은 이름으로 프로젝트 변환기를 등록하면 그 이름은 도메인 변환기가 아니게 되어 위반 코드와 `nullify` 를 잃는다(거부가 `TRANSFORM_FAILED` 가 된다). 달력에 없는 날짜·자리표시 날짜·형식 밖 값·공백·허용값 밖 코드는 행 수를 센다. 적합률의 분모는 공백 문자열을 포함하고, 공백은 자유 문자 도메인이 아니면 위반이다. 달력 검사는 8자리·14자리 숫자 모양에만 있고, 자리표시 날짜는 8자리(`99991231`·`00000000`)와 하이픈(`9999-12-31`·`0000-00-00`) 형태만 센다 — 슬래시·점·일시·14자리 자리표시는 유효 값으로 들어간다. 길이·자릿수 초과(숫자형 값은 소스 선언 자릿수로 판정한다), 잘렸거나 코드 목록으로 읽을 수 없는 허용값, 집계로 확인할 수 없는 허용값, LOB·시각 전용 값, 행 수 제한으로 일부만 읽은 표가 있으면 적합률을 내지 않는다. 행 단위 판정과 예외 격리는 L3 다.
- **출력**: 후보는 컬럼마다 최대 5개이고, 첫 후보가 같은 컬럼은 개념 군집으로 묶는다. 표 이름은 mapping 의 소스 표 표기(schema 가 있으면 `schema.table`, 없으면 `table`)다. catalog 는 넣지 않는다 — MySQL·MariaDB 는 catalog 가 늘 `def` 라 세 부분 이름을 거부하고, PostgreSQL·SQL Server 의 catalog 는 DB 이름이라 일반 식별자가 아닐 수 있다. 원장 coverage 와 생성기는 이 표기를 승인 inventory 의 표로 해석하므로 mapping 과 표기가 달라도 같은 표면 된다. 산출물은 입력 digest(inventory·profile·app-usage)를 싣는다. `--ledger-draft` 를 주면 컬럼마다 `PROPOSED` 행(대상 비움)을 담은 원장 초안 YAML(형식 2)을 쓴다. 적합률을 셀 수 없었어도 힌트·센 위반·이유를 남기고, 힌트가 내장 변환기 하나로 정해지면 `load` 를 미리 채운다. 이 초안은 원장 로더·검증기를 그대로 지난다. 따옴표가 필요한 식별자의 테이블(`SKIPPED_IDENTIFIER`)은 초안에서 빼고, 대소문자(또는 catalog)만 다른 소스 컬럼이 있으면 초안을 만들지 않는다. 후보와 초안은 둘 다 만들고 검사한 뒤에 쓰므로, 초안에서 멈추면 어느 파일도 새로 쓰지 않는다. 두 출력 경로는 서로 다르고 입력 파일과도 달라야 한다.
- **프로파일 판**: term-suggest 는 프로파일 판 2 만 받는다. 판 2 는 숫자형 값을 숫자 모양 문자(`INTEGER_TEXT`·`DECIMAL_TEXT`)로 다시 세지 않고, 하이픈 자리표시 날짜(`PLACEHOLDER_DATE_TEXT`)·하이픈 일시(`DATETIME_DASHED`)·14자리 일시의 달력 위반(`ymdhms14Invalid`)을 따로 센다. 판이 다르면 profile 을 다시 실행한다.
- **외부 LLM**: 쓰지 않는다. 결정 Q3 의 승인 기록·전송 전 검사 가드는 LLM 경로를 둘 때 함께 만든다.

### 원장에서 mapping 만들기

`mapping-generate` 는 사람이 쓴 skeleton 과 검토한 원장으로 mapping.yml 을 만든다([DEC-OPS-316](../../.agent/memory/decisions.md), [생성기](../../migration-tool/src/main/java/nuri/migration/generate/MappingGenerator.java)). 만든 mapping 은 plan 이 다시 독립 검증한다 — 생성은 승인이 아니고 `--check` 같은 별도 대조 명령도 없다.

```powershell
./gradlew :migration-tool:bootRun --args="--command=mapping-generate --skeleton=skeleton.yml --ledger=term-ledger.yml --inventory=inventory.json --mapping=mapping.yml"
```

- **skeleton**: `ledger` 와 생성분 컬럼이 빠진 mapping.yml 이다. 접속·run·표(source·target·orderBy·idStrategy·identity·foreignKeys)·codemaps 와, `columns` 에는 `const`·`fkRef` 항목만 둔다. fkRef 항목의 변환은 원장이 정한다. 접속 값은 `${NAME}` 자리표시여야 하고 평문 비밀번호는 거부한다(mapping 로더와 같은 검사).
- **트리 방식**: 생성기는 skeleton YAML 트리에서 `tables[i].columns`(덧붙이기와 fkRef 항목의 load)와 `ledger` 노드만 바꾼다. 그래서 접속 자리표시가 글자 그대로 남고, 같은 입력은 같은 바이트를 낸다. skeleton 의 주석·따옴표 표기는 남지 않으므로 검토자는 skeleton 원문과 생성물을 따로 본다.
- **해석과 완전성**: skeleton 표와 원장의 모든 행을 승인 inventory 의 표·컬럼으로 해석한다(플래너·coverage 와 같은 [규칙](../../migration-tool/src/main/java/nuri/migration/discovery/InventoryTables.java)). 찾지 못하거나 모호하거나, 표에 COLUMN 객체가 없거나, 대소문자만 다른 컬럼이 있으면 멈춘다. skeleton 표의 모든 inventory 컬럼은 확정 행이 하나 이상이거나 이관 제외·외부 보관 행이 정확히 하나여야 한다 — 키로만 쓰는 컬럼은 이관 제외와 사유로 적는다.
- **컬럼 만들기**: skeleton 표(매핑 id)마다 그 id 의 확정 행마다 `{source: inventory 컬럼 이름, target, load}` 를 덧붙이고, 보호 컬럼이면 `encrypt` 를 정한다. 이관할 수 없는 보호 컬럼으로 확정했으면 멈춘다. skeleton fkRef 항목은 같은 소스 컬럼의 확정 행 load 를 받되 키 정규화(`trim`·`upper`·`lower`·문자 type)만 받는다. skeleton 표가 `lookups` 를 선언하면 그 매핑 id·별칭의 조회 경로(`via`) 확정 행마다 `{source: <별칭>.<조회 표 컬럼>, target, load}` 를 덧붙이고, 조회만 하는 표도 소스 단위 완전성을 받는다. 한 대상 컬럼은 const·fkRef·확정 행 중 하나만 채운다 — plan 의 mapping 정적 검증도 같은 대상 컬럼을 두 컬럼 항목이 채우면 거부한다. 만든 mapping 은 plan 과 같은 원장 대응 검사(coverage)를 한 번 더 지난다.
- **거부**: skeleton 에 없는 소스 표의 확정 행, 그 매핑 id 를 읽는 skeleton 표가 없는 확정 행, 원장 행이 없는 skeleton 표, 같은 (소스, 매핑 id) 가 둘이거나 keymap 을 만드는 표가 둘인 skeleton, 외부 보관(L3e 전), 선언한 skeleton 표가 없거나 다른 표를 읽는 조회 경로(`via`), 확정되지 않은 컬럼. 문구는 행 ID·표·컬럼·상태와 고정 어휘이고 20건까지 보인다. 이관해야 할 데이터를 이관 제외로 돌려 생성기를 지나가지 않는다([복구 런북](../04-operations/migration-recovery-runbook.md)).
- **출력**: `ledger: {path: <출력 디렉터리 기준 상대 경로>, sha256: <원장 바이트>}` 를 쓴다. 원장은 출력 mapping 디렉터리 안에 있어야 한다. 쓰기 전에 tables·codemaps 에 자격·개인정보 값 검사를, 다시 읽은 본문에 같은 값 확인과 mapping 정적 검증(`db_columns.json` 필요)을 한다.

### 결속되는 실행 의미

- **Endpoint**: source inventory는 `endpointId`와 credential을 제거한 JDBC 위치 digest를 결속한다. Mapping digest에는 source/target `endpointId`가 포함된다.
- **Driver**: bundled driver는 실제 driver class/code-source bytes, 외부 driver는 승인한 local JAR들의 SHA-256과 class를 결속한다.
- **Discovery scope**: adapter ID, catalog/schema, system-object 포함 여부, 44개 object kind의 `REQUESTED`·`NOT_REQUESTED`·`NOT_APPLICABLE` manifest를 inventory에 고정한다.
- **Implementation**: plan은 migration-tool module class/resource bytes, 핵심 ETL·validator·verifier·load-surface class, adapter identity/read-session policy와 선택 transformer digest를 고정한다.
- **Target**: mapping이 참조하는 PostgreSQL table·column·PK metadata, DB product/version, 자격증명을 제거한 설정·연결 JDBC 위치, cluster system identifier, DB OID·이름·기본 스키마, 허용 스키마 목록을 fingerprint한다. v3부터 매핑 표의 `information_schema` 컬럼 계약과 같은 schema 표준 사전의 용어·도메인 대조 결과도 함께 결속한다. [TargetEndpointBinding](../../migration-tool/src/main/java/nuri/migration/artifact/TargetEndpointBinding.java)과 [fingerprintBound](../../migration-tool/src/main/java/nuri/migration/postgres/PostgresTargetSchemaFingerprinter.java)가 정본이며 identity 조회 실패 시 중단한다. 업무 테이블은 허용된 스키마를 명시해야 한다.
- **Review**: 선택적 `review.yml`은 inventory·target·mapping·execution contract 네 digest에 결속되고, 객체 stable ID별 disposition과 검토 여부를 선언한다.

> **첫 차단 요소 해소(2026-09-05):** [`MappingLoader.resolveDbConfig()`](../../migration-tool/src/main/java/nuri/migration/model/MappingLoader.java)는 환경 변수 치환 뒤에도 source/target `endpointId`를 보존한다. [`MappingLoaderEndpointBindingTest`](../../migration-tool/src/test/java/nuri/migration/model/MappingLoaderEndpointBindingTest.java)는 literal·환경 변수 `endpointId`를, [`MigrationWorkflowRunnerTest`](../../migration-tool/src/test/java/nuri/migration/MigrationWorkflowRunnerTest.java)는 실제 YAML 파일을 읽는 `discover` 경로와 inventory의 source endpoint binding을 회귀 검증한다. 이는 파일 loader 연결 결함을 닫은 증거이며 실제 DB rehearsal이나 production cutover 준비 완료를 뜻하지 않는다.

## Source adapter와 discovery 범위

`SourceAdapterRegistry`는 vendor adapter를 먼저 선택하고 마지막에 portable JDBC metadata adapter를 둔다. JDBC product/version이 명시 adapter와 맞지 않으면 실패한다. 각 adapter는 44개 `ObjectKind`마다 `OBJECTS`, `PARTIAL_PROBE`, `NOT_APPLICABLE`, `UNSUPPORTED` 중 하나의 종료 경로를 갖는다.

객체가 0건이라는 사실과 볼 수 없다는 상태를 구분한다. `UNREADABLE`, `UNSUPPORTED`, `PARTIAL`, `QUERY_FAILED` visibility finding은 plan blocker이며 `NOT_APPLICABLE`만 정상적인 비대상이다. PostgreSQL adapter는 `pg_catalog`와 JDBC metadata를 결합하고 요청 schema의 visibility를 확인한다. 다른 vendor adapter의 catalog SQL도 제품별로 분리돼 있으며, 실제 DB 검증 범위는 [이관 실측 기록](../04-operations/readiness-followups.md)에 명시한다.

| Source 경로 | 구현 상태 | load 경계 |
|---|---|---|
| PostgreSQL `postgresql-pg-catalog` | `pg_catalog` 보강과 schema visibility census가 구현된 `EXPERIMENTAL` adapter | commit은 exact `--ack-adapter=postgresql-pg-catalog`와 `--ack-source-freeze`가 필요하다. 실제 버전/권한 범위는 별도 rehearsal 대상이다. |
| Oracle·Tibero·MySQL·MariaDB·SQL Server | vendor별 catalog query, snapshot/streaming 정책 선언이 있는 `UNVERIFIED` adapter | dry-run도 adapter 승인과 source freeze가 필요하며 commit은 코드가 차단한다. 실제 vendor/version/driver 검증 전 지원 완료로 간주하지 않는다. |
| CUBRID | 전용 adapter의 자격은 `UNVERIFIED`·`MANUAL_ONLY`다. 11.4.6/JDBC 11.3.1의 owner-scoped discovery와 작은 BLOB/CLOB dry-run·내부 COMMIT rehearsal 범위는 [CUBRID 실측 기록](../04-operations/readiness-followups.md#이관-cubrid-실행-환경과-검증-경계)에서 구분한다. | 공개 COMMIT은 차단한다. 완전성·SELECT-only 증명에는 원천 SELECT와 `_db_class`·`_db_auth` SELECT가 필요하며 source freeze도 필수다. |
| Generic JDBC metadata | account-scoped portable metadata의 `EXPERIMENTAL` fallback | 일관 source snapshot을 증명하는 read-session policy가 없어 load는 차단된다. discovery·plan의 완전성도 자동 증명하지 못한다. |
| 명시적 외부 JDBC JAR | absolute local regular JAR만 격리 classloader로 열고 symlink·network path·glob·중복·manifest classpath를 거부 | inventory에 JAR digest를 결속하고 dry-run load에는 exact `--ack-source-driver=<digest>`가 필요하다. isolated in-process driver commit은 금지된다. |

원천 연결에는 JDBC `setReadOnly(true)`를 요청하지만 이는 권한 증명이 아니다. Microsoft JDBC `13.6.0.0`은 이 요청을 지원하지 않아 신호가 false다. SQL Server preflight는 제품·드라이버가 실측 조합과 정확히 일치하고, 현재 catalog와 `DB_NAME()`이 같은 비시스템 DB에서 `DATABASEPROPERTYEX(...,'Updateability')=READ_ONLY` 단일행을 확인했을 때만 누락 신호를 대체한다. 신호는 false로 기록하며 쓰기 가능한 DB와 불완전한 증거는 차단한다. 운영에서는 원천 계정의 SELECT-only 최소 권한, DB 상태 전환, 격리 수준과 maintenance-window freeze를 별도로 승인해야 한다.

## `mapping.yml` 계약

속성명은 `MappingSpec`의 camelCase 계약을 그대로 사용한다. `${NAME}`은 DB 연결 필드의 **전체 값**일 때만 환경 변수로 치환하며 누락 값, 부분 치환, 비어 있지 않은 평문 password, 알 수 없는 속성, 중복 YAML key는 실패한다.

```yaml
source:
  url: ${SOURCE_DB_URL}
  username: ${SOURCE_DB_USER}
  password: ${SOURCE_DB_PASSWORD}
  driver: org.postgresql.Driver
  endpointId: legacy-crm-prod

target:
  url: ${TARGET_DB_URL}
  username: ${TARGET_DB_USER}
  password: ${TARGET_DB_PASSWORD}
  driver: org.postgresql.Driver
  endpointId: egov-postgresql-stage

run:
  runId: crm-cutover-20260831
  sourceNamespace: legacy-crm

tables:
  - source: legacy.legacy_user
    target: tb_user_info
    where: "use_yn = 'Y'"
    orderByKeys: [user_no]
    targetKey: esntl_id
    idStrategy:
      column: esntl_id
      generator: USR_
      sourceKey: user_no
    columns:
      - { source: user_id, target: user_id, transform: trim }
      - { source: password_hash, target: pswd }
      - { source: user_nm, target: user_nm, transform: trim }
      - { source: reg_dt, target: crt_dt, type: timestamp }
      - { source: stat, target: user_stts_cd, codemap: user_status }
      - { target: frst_rgtr_id, const: MIGRATION }

codemaps:
  user_status:
    values:              # 레거시 코드 → 표준 코드. 표준 코드(값)는 따옴표로 감싼다
      "1": "P"
      "0": "D"
    # unmapped: fail(기본) | passthrough | fallback(+ fallback: "<표준 코드>")
    # nullAs: keep(기본, NULL 은 NULL) | fallback(NULL 도 fallback 값으로)
```

이 예시는 source의 `password_hash`가 현재 `EgovPasswordEncoder`와 호환된다는 사전 검증을 전제로 한다. 해시 형식이 다르면 원문 비밀번호를 복호화·재해시하지 말고, 별도의 강제 재설정/계정 활성화 정책과 매핑을 승인한 뒤 이관해야 한다. `pswd`는 target의 NOT NULL 컬럼이므로 정책 없이 생략할 수 없다.

온라인 앱이 값을 암호화해 저장하는 컬럼은 mapping에 같은 보호 방식을 `encrypt`로 선언해야 한다(DEC-OPS-308). 대상 DB에는 암호문 컬럼 표시가 없어 이관 도구가 [보호 목록](../../migration-tool/src/main/java/nuri/migration/protect/ProtectedTargetColumns.java)을 갖는다. 지금은 두 컬럼이다: `tb_user_info.user_enrrno`(주민등록번호, `RrnoEncryptionConverter`의 eGov ARIA-256 — `encrypt: aria-egov-v1`)와 `tb_auth_otp_cert.otp_secret_encpt_cn`(MFA 비밀, `MfaSecretCipher`의 AES-256-GCM — 이관하지 않고 사용자가 다시 등록한다). 비밀번호·복구 코드·리프레시 토큰처럼 해시로 저장하는 값은 암호화가 아니라 이 목록에 없다.

```yaml
    columns:
      - { source: jumin_no, target: user_enrrno, transform: trim, encrypt: aria-egov-v1 }
```

이관 도구는 같은 암호문을 스스로 만든다. 실행 시 foundation·business-core·eGovFrame 라이브러리에 의존하지 않는다(DEC-OPS-005). ARIA-256은 독자 구현이고(RFC 5794 시험 벡터), 온라인 `ARIACipher`와 같이 키 문자열을 32자에서 자르고 UTF-8 바이트를 ANSI X.923 변형으로 32바이트까지 채운다. 데이터도 같은 방식으로 16바이트 블록을 채우고, ECB(IV 없음, 같은 키·값이면 같은 암호문)로 암호화해 표준 Base64로 쓴다. 키는 실행 때 환경 변수 `MIGRATION_ALGORITHM_KEY`(온라인 앱 `ALGORITHM_KEY`와 같은 값)로만 받고 mapping·plan·inventory·실행 JSON·로그에 쓰지 않는다.

다음 경우는 행을 읽거나 실행 상태를 만들기 전에 멈춘다. mapping 검증과 적재 시작이 같은 판정을 쓴다.

- 목록의 컬럼을 `encrypt` 없이 매핑했다(스키마 한정 이름·대소문자로 피할 수 없다).
- 목록에 없는 컬럼에 `encrypt`를 선언했다.
- 방식이 다르거나, 이관할 수 없는 방식이다.
- `const`·`codemap`·`type`·`fkRef`와 함께 쓰거나, 식별자·참조 키로 쓴다.
- 암호화할 소스 컬럼을 정렬 키(`orderBy`·`orderByKeys`)·`idStrategy.sourceKey`·identity·복합 FK의 source component·`fkRef` 컬럼의 소스로도 쓴다. 이 값은 평문 그대로 `tb_migration_checkpoint.source_key`·`tb_migration_key_map.legacy_key`에 남기 때문이다. 주민번호만 키인 레거시 테이블은 지금 적재할 수 없다([GAP-MIG-002](../../.agent/memory/known-gaps.md)).
- 키가 없다(dry-run 포함).

값은 하나씩 확인한다. 문자열(LOB 를 읽은 문자열 포함)만 암호화한다. 숫자·날짜 값은 `toString` 이 앞자리 0 이나 표기를 바꿔(Oracle `NUMBER(13)` 의 `0501013234567` → `501013234567`) 다른 값을 암호화하므로 그 행에서 멈춘다 — 내장이 아닌 정규화 변환기로 문자열을 넘긴다. 다만 L3a-2 부터 원장 `load` 는 내장 변환기만 받으므로 이 경로는 승인 workflow(plan·load)에서 쓰지 못한다([GAP-MIG-002](../../.agent/memory/known-gaps.md)). plan 도 문자열이 아닌 소스(내장 변환기를 거쳐도)를 거부한다. 온라인 변환기처럼 빈 값은 NULL로 둔다. 그 밖의 값은 암호화한 뒤 세 가지를 본다.

- 같은 키로 되읽으면 원래 값이 나온다. 온라인 복호화가 채움으로 오인해 걷어 내는 값은 여기서 걸린다. 키가 온라인 키와 같은지는 이 확인으로 알 수 없다.
- 쓰려는 값이 주민번호 평문 형태가 아니다.
- 쓰려는 값이 16바이트 배수의 표준 Base64다.

하나라도 어긋나면 다른 행 변환 실패와 같이 그 행이 든 chunk를 쓰지 않고 적재를 멈춘다(아래 적재 절, DEC-OPS-309). 오류는 `ROW_TRANSFORM_FAILED:PROTECTED_COLUMN(<고정 사유>)` 단계로 남고 값과 키는 남기지 않는다.

호환은 [계약 시험](../../migration-tool/src/test/java/nuri/migration/protect/OnlineRrnoConverterContractTest.java)이 증명한다. 이 시험은 Gradle 프로젝트 의존 없이 온라인 원본(변환기·`CryptoUtil`·`ProjectCryptoConfig`)을 시험 안에서 컴파일한다. 그리고 온라인과 같은 Spring 설정으로 돌려 세 가지를 본다: 두 구현의 암호문이 같고 서로 되읽는지, 적재 경로의 결과를 온라인 변환기가 읽는지, 보호 목록이 온라인 엔티티의 `@Convert`·서비스 암호 컬럼과 정확히 같은지. 시험 범위 의존은 그 원본이 쓰는 외부 라이브러리(eGovFrame 암호·JPA API·Lombok)뿐이다. 프로젝트 의존을 쓰지 않은 이유는 생성 제품의 이관 모듈 독립 검사와 이관 단독 제품의 시험 컴파일이 깨지기 때문이다. 이관 단독 제품에서는 이 대조만 건너뛰고, eGov 구현으로 만든 고정 벡터 시험은 돈다.

남은 경계: 키가 온라인 앱과 같은지는 도구가 확인하지 않는다. 다른 키로 쓴 암호문은 앱이 원래 값으로 읽지 못한다. 기관 이관 통제 `mapping-schema-driver`가 그 확인과 주민번호 이관의 법적 근거를 근거 파일로 요구한다([검토 수명 가이드](../03-guides/governance-review-lifecycle.md)). 재개 대조 오류의 키 digest 는 이 프로세스에서만 쓰는 무작위 키의 HMAC 이라, 경우의 수가 적은 키도 digest 로 되찾을 수 없다. 레거시가 이미 암호문을 갖고 있으면 그 값을 평문으로 보고 다시 암호화하므로, 먼저 복호화 경로를 정해야 한다(아직 없다).

### 표준 도메인 변환기와 nullify

ADR-0029 L3a-1 의 내장 변환기는 값 하나를 표준 도메인 표기로 바꾸거나 위반 코드로 거부하는 [순수 함수](../../migration-tool/src/main/java/nuri/migration/domain/DomainValues.java)다. 모양 판정은 적합성 추정기와 같은 `ValuePattern` 을 쓴다. 숫자형 값은 프로파일러와 같은 문자 표기로 바꿔 판정한다. 그래서 추정기가 위반으로 센 값은 실행도 같은 코드로 거부한다. 실행이 더 엄격한 경우는 `DomainValues` 문서의 목록뿐이고 [동치 시험](../../migration-tool/src/test/java/nuri/migration/domain/DomainParityTest.java)이 그 목록을 고정한다.

| 변환기 | 쓰는 값 | 받는 소스(inventory 선언) | 거부 코드 |
|---|---|---|---|
| `ymd8` | 문자 8자 `yyyyMMdd` | 문자·정수·소수·날짜·일시 | `BLANK`·`PLACEHOLDER_DATE`·`INVALID_DATE`·`TIME_PRESENT`·`FORMAT` |
| `ymd8-truncate` | 같음, 일시 객체의 시각을 버린다 | 같음 | `TIME_PRESENT` 없음 |
| `ymdhms14` | 문자 14자 | 문자·정수·소수·일시 | `BLANK`·`INVALID_DATE`·`FORMAT` |
| `hms6` | 문자 6자 `HHmmss` | 문자·정수·소수·시각 | `BLANK`·`FORMAT` |
| `yn` | `Y`·`N` | 문자·논리값 | `BLANK`·`FORMAT` |
| `date-text` | 날짜 | `ymd8` 과 같다(자정인 일시 문자 포함) | `ymd8` 과 같다 |
| `date-truncate`(v2) | 날짜, 시각을 버린다 | 같음 | `TIME_PRESENT` 없음 |
| `timestamp-text` | 일시 | 문자·정수·소수·일시 | `BLANK`·`PLACEHOLDER_DATE`·`INVALID_DATE`·`FORMAT`(날짜만 있는 값) |
| `timestamp-from-date` | 그날 00:00 일시 | `ymd8` 과 같다 | `ymd8` 과 같다 |

모든 변환기는 LOB·이진 값을 `UNSUPPORTED_VALUE_TYPE` 으로, 시간대를 정해야 날짜가 정해지는 객체를 `FORMAT` 으로 거부한다. `yn` 은 `1`·`0`·`T`·`F` 를 받지 않는다 — 극성은 사람이 codemap 으로 정한다. 자리표시 날짜는 8자리·하이픈 표기(`99991231`·`9999-12-31` 등)와 같은 표기의 숫자형이다. `date-truncate` 는 v2 가 되며 계약 id 가 바뀌었다. v1 로 승인한 plan 은 다시 승인해야 하고, v1 이 그대로 적재하던 자리표시 날짜를 이제 거부한다.

거부된 행은 `ROW_TRANSFORM_FAILED:DOMAIN_VIOLATION(<코드>)` 로 그 chunk 를 쓰지 않고 멈춘다(아래 적재 절). 값은 싣지 않는다. 사용자 변환기가 같은 예외를 던지면 위반 코드로 인정하지 않고 `TRANSFORM_FAILED` 다. 비문자 `type`(정수·날짜 등)에 오는 공백 문자도 type 변환 앞에서 `DOMAIN_VIOLATION(BLANK)` 로 멈춘다. 종전에는 `TypeConverter` 가 조용히 NULL 로 적재했다. 공백은 프로파일러와 같이 `isBlank` 로 가린다. NUL 채움처럼 제어 문자만 있는 값은 공백이 아니라 `DOMAIN_VIOLATION(FORMAT)` 이다 — 프로파일러·추정기·도메인 변환기가 모두 형식 위반으로 보며, `nullify` 로 NULL 이 되지 않는다. 내장 `date`·`timestamp` 가 문자·숫자 값의 표기를 읽지 못하면 `TRANSFORM_FAILED(FORMAT)` 이다. 사용자 변환기와 그 밖의 값 종류의 실패는 사유 없이 `TRANSFORM_FAILED` 다.

**격리 어휘 대응표.** 승인 행 격리(L3b)가 쓰는 대응을 여기서 정한다. 실행 오류의 `<단계>(<사유>)` 를 원장 위반 코드로 옮긴다. 표에 없는 실패(사유 없는 `TRANSFORM_FAILED`, `UNSUPPORTED_VALUE_TYPE`, `CODEMAP_UNDEFINED`·`CODEMAP_INPUT_INVALID`, `FK_REF_*`, `IDENTITY_FAILED`, `PROTECTED_COLUMN`, `NULLIFY_CAP_EXCEEDED`, 쓰기 단계 오류)는 격리할 수 없다.

| 실행 실패 | 격리 코드 |
|---|---|
| `DOMAIN_VIOLATION(<코드>)` (`UNSUPPORTED_VALUE_TYPE` 제외) | `<코드>` |
| `TYPE_CONVERSION_FAILED` | `FORMAT` |
| `TRANSFORM_FAILED(FORMAT)` (내장 `date`·`timestamp`) | `FORMAT` |
| `CODEMAP_UNMAPPED` | `CODEMAP_UNMAPPED` |

`nullify` 는 선언한 위반만 NULL 로 바꾸는 규칙 정제다.

```yaml
    columns:
      - { source: end_ymd, target: end_ymd, transform: ymd8, nullify: [ { violation: PLACEHOLDER_DATE, maxRows: 12 } ] }
      - { source: qty, target: qty, type: integer, nullify: [ { violation: BLANK, maxRows: 3 } ] }
```

- 위반은 `BLANK`·`PLACEHOLDER_DATE` 뿐이고, 위반마다 한 번, `maxRows` 는 1 이상이다. loader 는 `violation` 을 위반 이름 글자로만, `maxRows` 를 정수로만 읽는다 — `violation: 1`(enum 순서)·`maxRows: 2.7` 처럼 검토자가 본 글자와 승인 digest 가 뜻하는 값이 갈리는 표기는 거부한다.
- 그 컬럼의 load 가 실제로 낼 수 있는 위반이어야 한다. `BLANK` 는 도메인 변환기나 비문자 `type` 이 낸다. `PLACEHOLDER_DATE` 는 날짜 변환기(`ymd8`·`ymd8-truncate`·`date-text`·`date-truncate`·`timestamp-from-date`·`timestamp-text`)만 낸다. const 컬럼은 아무것도 내지 않는다.
- 대상 컬럼이 NULL 을 받아야 한다. INSERT 는 매핑한 컬럼의 NULL 도 명시해 바인딩하므로 기본값이 있어도 NOT NULL 컬럼은 거부한다(아래 표준 계약 검증).
- 실행마다 표 전체를 다시 읽으므로 끝까지 적재한 실행의 집계가 곧 표 집계다. 건수가 `maxRows` 를 넘으면 그 chunk 를 롤백하고 `NULLIFY_CAP_EXCEEDED(<코드>)` 로 멈추며, 상한을 넘긴 행은 세지 않는다. 적재 결과(`TableResult.nullified`)와 실행 JSON 의 `nullified` 에 대상 테이블·컬럼별 행 수만 남기고 바꾼 값은 남기지 않는다. 멈춘 실행의 수는 `transformed` 처럼 변환한 행까지의 수라 롤백한 chunk 의 앞선 행도 들어 있다.
- 도메인 변환기는 같은 컬럼의 `type`·`codemap` 과 함께 쓸 수 없고 `encrypt` 컬럼에도 쓸 수 없다. mapping 검증이 이 규칙을 모두 확인하고, 적재 시작은 nullify 의 위반 종류·상한·중복을 연결을 열기 전에 다시 확인한다.

### 값 변환 순서와 codemap

컬럼 값은 `transform → codemap → type → fkRef` 순서로 만들고, 보호 컬럼은 그 뒤 `encrypt` 로 암호화한다(위 절). 표준 도메인 변환기는 codemap·type 과 함께 쓰지 않으므로 그 컬럼의 값은 변환기 하나가 정한다. 비문자 type 의 공백 판정은 codemap 뒤, type 변환 앞이다. `nullify` 는 위반이 난 자리(도메인 변환기의 거부·type 앞 공백 판정)에서 값을 NULL 로 바꾸고, 뒤 단계는 NULL 을 그대로 넘긴다. `trim` 같은 정리가 코드 대조보다 먼저라 CHAR 원천의 공백 채움 때문에 코드가 어긋나지 않는다(2026-10-13 [DEC-OPS-309](../../.agent/memory/decisions.md), 종전 순서는 `codemap → transform → type`). 순서가 바뀌었으므로 codemap 결과를 transform 으로 다듬던 매핑(예: `unmapped: passthrough` 뒤 `upper`)은 이제 transform 결과로 코드를 찾고 codemap 결과에는 transform 이 적용되지 않는다 — 옮길 때 대응표를 다시 확인한다.

- codemap 은 `values`(레거시 코드 → 표준 코드)와 `unmapped` 정책을 갖는다. **기본은 `fail`** 이다 — `values` 에 없는 코드가 오면 그 행 변환이 실패한다. 그대로 통과는 `unmapped: passthrough`, 대체값은 `unmapped: fallback` 과 `fallback` 으로 명시할 때만 쓴다. `values` 가 비었거나 정책과 `fallback` 이 어긋나면 validate 가 오류를 내고 실행기도 같은 판정으로 거부한다.
- 레거시 코드값 `default` 는 이제 평범한 코드다. 대체값을 `default` 키로 두던 **옛 평면 형식은 읽지 않는다**. 같은 파일을 새 의미로 조용히 다르게 해석하지 않으려고 loader 가 codemap 이름과 옮겨 쓸 방법을 밝혀 거부하고, 승인 workflow 는 그 문구로 gate 한다. 그 문구는 바뀐 의미 둘(아래 NULL, 위 적용 순서)도 함께 알린다. `values` 가 맵인 새 형식에 모르는 필드가 섞이면 옛 형식이 아니라 알 수 없는 필드로 알린다(이름은 식별자 형식일 때만 싣는다).
- **표준 코드(`values` 의 값)와 `fallback` 은 문자열이어야 한다.** Jackson YAML(2.21.7 실측)은 따옴표 없는 `yes`·`true` 를 boolean, `01` 을 정수 1 로 읽는다. 이런 값은 형식 오류로 거부한다(`Y`·`N` 은 문자열로 남는다). 레거시 코드(`values` 의 키)는 따옴표가 없어도 적은 그대로 읽는다 — `01`·`1.0`·`yes` 는 그 글자 그대로의 코드다.
- NULL 은 코드가 아니므로 기본으로 NULL 로 둔다. 옛 평면 형식의 `default` 는 NULL 도 대체값으로 바꿨으므로, 그 의미가 필요하면 `nullAs: fallback` 과 `fallback` 을 명시한다(`unmapped` 정책과 따로 정한다). 숫자 원천값은 표기를 정규화해 찾는다 — `NUMBER(5,1)` 의 `1.0` 과 `NUMBER(1)` 의 `1` 은 같은 코드 `"1"` 이다. 문자열 원천은 그대로 찾으므로 `"01"` 과 `"1"` 은 다른 코드다. 숫자 열에 쓰는 codemap 의 키는 정규형(`1`, `-3`, `2.5`)으로 적는다. 숫자처럼 보이지만 정규형이 아닌 키(`1.0`·`01`)는 숫자 열에서 닿지 않으므로 validate 가 경고한다(문자열 열의 정상 코드일 수 있어 오류는 아니다. 경고는 키 값 대신 위치만 밝힌다).
- `type: date` 는 자정이 아닌 시각이 붙은 값을 거부한다. 종전에는 시각을 조용히 버렸다. 시각을 버리는 것이 의도면 `transform: date-truncate` 로 밝힌다. 선택한 변환기는 실행 계약 digest 에 결속돼 승인 대상이 된다. `date-truncate`(v2, ADR-0029 L3a-1)는 ISO 날짜·ISO 일시·8자리 `yyyyMMdd` 와 함께 `ymd8` 이 받는 슬래시·점 날짜, 14자리 일시, 같은 표기의 숫자형, 날짜·일시 객체도 받으므로, 표기가 섞인 컬럼도 이 변환기 하나로 옮긴다. 자리표시 날짜는 `PLACEHOLDER_DATE` 로 거부한다(`nullify` 로 NULL 로 바꿀 수 있다). 오프셋이 붙은 값은 어느 날짜인지 정할 수 없어 `date-truncate` 도 거부한다.

Commit에는 `run.runId`, `run.sourceNamespace`, 모든 table의 결정적 `orderBy` 또는 `orderByKeys`, checkpoint 검증에 사용할 target identity가 필요하다. order tuple은 source transaction 안에서 유일성을 먼저 검사하며 이후 keyset pagination에 사용한다. `where`의 주석·세미콜론·DDL/DML token과 잘못된 식별자를 차단하지만, 신뢰된 mapping 작성과 독립 리뷰를 대체하지 않는다.

Identity는 두 계약을 지원한다.

- 기존 단일 문자열 `idStrategy`는 target ID를 생성하고 `fkRef`로 자식 FK를 번역한다. 생성 ID는 온라인 앱 [`IdGenerationUtil`](../../foundation/src/main/java/nuri/foundation/core/util/IdGenerationUtil.java)과 같은 `접두사 + 대문자 hex` 형식이며, `generator`는 접두사만 주므로 접두사를 포함해 20자다. 온라인의 20자 호출(`USR_`·`ORGNZT_`·`BBSMSTR_`)과 같고 `GROUP_`(온라인 16자)만 다르다. 형식 동등성은 foundation 원본을 시험 안에서 컴파일해 두 구현을 대조하는 [계약 시험](../../migration-tool/src/test/java/nuri/migration/keymap/StandardIdGeneratorTest.java)이 고정한다. migration-tool은 실행 시에도 Gradle 상으로도 foundation에 의존하지 않는다(DEC-OPS-306). plan 은 생성 ID 길이(접두사 + hex)를 대상 컬럼·표준 도메인과 대조하고, 접두사가 길어 hex 가 온라인 최소(`GROUP_` 뒤 10자)보다 짧으면 거부한다. 부모의 생성 ID 를 받는 `fkRef` 값도 같은 길이로 대조한다.
- typed/composite `identity`는 `preserve`, `remap`, `target_generated` 정책과 TEXT·정수·decimal·boolean·UUID·시간·binary 타입을 명시한다. 복합 자식 FK는 `foreignKeys`에서 source/target component를 완전하게 선언한다. `target_generated`는 PostgreSQL `INSERT ... RETURNING`으로 행별 생성값을 얻는다.

mapping 이 대상 키 값을 넣는 `preserve`·`remap`이나 직접 컬럼 매핑이 identity·serial·`nextval` 기본값 컬럼에 값을 넣으면, 적재가 끝난 뒤 그 시퀀스를 넣은 키의 최댓값 뒤로 옮긴다(아래 적재 절). 시퀀스는 COMMIT 적재가 행을 쓰기 전에 대상 카탈로그로 정한다. `preserve`·`remap` 정수 키가 카탈로그로 연결된 시퀀스가 없으면 온라인 앱이 `@SequenceGenerator` 전용 시퀀스(예: `sq_answer_no`)로 채번하는지 알 수 없으므로 적재를 시작하지 않는다(사용자 결정 Q9). 이때는 `identity.targetSequences`에 시퀀스 이름이나 `none`을 선언한다. 선언은 `preserve`·`remap`의 target component에만, 시퀀스 이름은 정수 키에만 쓸 수 있다. 이 판정은 plan·validate·dry-run 에서는 하지 않는다 — 대상 시퀀스를 읽는 것은 COMMIT 시작뿐이라, 선언 누락은 plan 이 `commitReady` 여도 COMMIT 이 행을 쓰기 전에 드러난다.

```yaml
    identity:
      policy: preserve
      sourceComponents: [ { column: ANSWER_NO, type: signed_integer } ]
      targetComponents: [ { column: answer_no, type: signed_integer } ]
      targetSequences: { answer_no: sq_answer_no }
```

한 소스 표를 여러 대상으로 나누는 표 매핑의 `id` 와 keymap 소유 규칙은 [매핑 식별자와 분할](#매핑-식별자와-분할adr-0029-l3c)에, 다른 소스 표를 단일 키로 조회해 그 컬럼을 읽는 `lookups` 와 `alias.COLUMN` 은 [조회 조인](#조회-조인adr-0029-l3d)에 둔다. 복합 identity와 기존 `idStrategy`는 함께 선언할 수 없다. Typed tuple은 versioned canonical encoding으로 keymap/checkpoint에 저장하며 partial-null 복합 FK, 타입·arity 불일치, 고아 FK는 실패한다. 단일 self-reference는 부모 ID를 먼저 예약하는 2-pass를 지원하지만 typed composite self-reference는 차단한다.

## 적재, transaction과 재시작 의미

Load는 adapter가 승인한 격리 수준으로 **source connection 하나와 read transaction 하나**를 열고 부모 우선 순서의 모든 table을 그 세션에서 읽는다. Source freeze가 필요한 adapter는 `--ack-source-freeze` 없이는 실행하지 않는다. Commit은 500행 keyset page/chunk를 기본 단위로 target에 적재한다.

Target에는 migration-tool 전용 Flyway가 `migration_control` schema와 다음 상태를 생성·검증한다.

- `tb_migration_key_map`: `(run_id, source_namespace, source_table, legacy_key)`별 typed/legacy key 대응
- `tb_migration_checkpoint`: 같은 run/source/table/매핑(`mapping_id`, 기본 매핑은 빈 문자열)의 source identity, target identity, transformed-row SHA-256 — 제어 스키마 V2([매핑 식별자와 분할](#매핑-식별자와-분할adr-0029-l3c))
- `tb_migration_run`: `RUNNING`, `LOADED`, `COMPLETED`, `FAILED` 상태
- `tb_migration_schema_history`: migration-tool runtime schema 전용 Flyway history

INSERT는 매핑한 대상 컬럼을 모두 나열하고 NULL 값도 명시해 바인딩한다. 그래서 매핑한 컬럼에는 DB 기본값(DEFAULT)이 적용되지 않는다. NULL 인 컬럼을 INSERT 에서 빼서 DEFAULT 를 쓰는 방식은 쓰지 않는다. 기본값은 매핑하지 않은 컬럼만 채운다(아래 표준 계약 검증의 NOT NULL·`nullify` 판정이 이 전제를 쓴다).

일반 chunk는 target data INSERT, 신규 keymap, durable checkpoint를 **같은 target connection/transaction**에 기록한다. JDBC batch `updateCounts`가 각 1행을 증명하지 못하거나 하나라도 실패하면 chunk를 rollback하고 행 단위로 재변환·재시도한다. `target_generated`는 처음부터 행별 `INSERT ... RETURNING`·keymap·checkpoint transaction을 쓴다. Commit 또는 rollback 결과가 불확정하면 자동 재시도를 중단한다.

원본 키를 쓴 컬럼의 시퀀스는 모든 table을 적재한 뒤 재설정한다(DEC-OPS-306). 시퀀스가 다음에 내줄 번호 묶음(다음 값 − 증가폭 + 1 부터 다음 값까지 — Hibernate pooled optimizer 가 쓰는 범위)에 `max(컬럼)` 이하 값이 있을 때만 `setval`로 옮기고 이미 앞에 있으면 건드리지 않으므로, 다시 실행해도 같은 상태이며 시퀀스를 뒤로 돌리지 않는다. 오류가 난 table도 앞선 chunk가 남으므로 재설정한다. 실행 JSON의 `sequenceResets`에는 table·컬럼·시퀀스 이름과 결과(`ADVANCED`·`ALREADY_AHEAD`·`EMPTY_TABLE`·`DECLARED_NONE`)만 남기고 키 값은 남기지 않는다. 다음 경우는 행을 쓰기 전에 멈춘다: 기본값이 `nextval`인데 시퀀스를 찾지 못함, 연결된 시퀀스가 둘 이상, `GENERATED ALWAYS` identity, 선언한 시퀀스가 없거나 카탈로그와 다름, 이관 계정에 시퀀스 SELECT·UPDATE 권한이 없음, 위의 연결 없는 `preserve`·`remap` 정수 키. 재설정 자체가 실패하면(시퀀스 상한 초과) 그 table의 오류가 되어 run이 `FAILED`다. 적재·재설정하는 동안 온라인 앱이 같은 table·시퀀스를 쓰지 않아야 한다 — 도구는 이 전제를 강제하지 않으며, 최댓값 조회와 `setval` 사이에 온라인 `nextval`이 앞서 가면 시퀀스가 뒤로 돌아갈 수 있다(복구 런북의 cutover 조건). 카탈로그는 PostgreSQL 대상에서만 읽는다. 승인 workflow의 대상은 언제나 PostgreSQL이며, 그 밖의 대상(단위 시험의 H2)에서는 `preserve`·`remap` 정수 키를 `none`으로 선언해야 진행한다.

**행 변환 실패는 격리하지 않는다**(2026-10-13 [DEC-OPS-309](../../.agent/memory/decisions.md), Q6 위임 결정). transform·codemap·type·fkRef·identity·보호 컬럼(`encrypt`) 중 하나라도 실패한 행이 있으면 — 표준 도메인 변환기의 거부(`DOMAIN_VIOLATION(<코드>)`)와 `nullify` 상한 초과(`NULLIFY_CAP_EXCEEDED(<코드>)`)도 같다 — 그 chunk 는 한 행도 쓰지 않고, 이 chunk 에서 새로 만든 keymap 도 버린 뒤 테이블과 run 을 멈춘다. `target_generated` 도 chunk 의 모든 행을 먼저 변환한 뒤에 쓴다. 남은 테이블은 읽지 않고 `RUN_STOPPED_BY_ROW_FAILURE` 로 결과에 남긴다. dry-run 도 같은 행에서 멈춰 commit 이 어디서 멈출지 보여 준다. **예외**: `target_generated` 부모는 dry-run 에서 DB 생성 identity 가 없어 keymap 을 등록하지 않는다. 그래서 그 부모를 복합 FK(`foreignKeys`)로 참조하는 자식은 dry-run 에서 FK 값이 있는 첫 행에서 고아(`FK_REF_FAILED`)로 멈추고 뒤 테이블은 `RUN_STOPPED_BY_ROW_FAILURE` 로 남는다. commit 에서는 부모 행이 `INSERT ... RETURNING` 으로 등록돼 같은 자식 행이 통과하므로, 이런 매핑의 dry-run 결과는 commit 이 멈출 위치가 아니고 그 뒤 테이블의 변환 검사도 하지 않은 것이다. 오류는 `행 변환 실패(<원천 테이블>, column=<타깃 컬럼>, row=<원천 정렬 순서의 위치>): ROW_TRANSFORM_FAILED:<단계>` 형식이며 값·키·예외 원문을 담지 않는다. 검증 보고서와 load gate 는 첫 실패를 이 문구로 밝힌다. 종전에는 실패 행만 건너뛰고 나머지를 커밋해 승인 없는 누락이 남았다. 승인된 예외 행만 격리하는 경로(L2 원장)는 아직 없으므로 지금은 모든 행 변환 실패가 fail-closed 다. **쓰기 단계의 오류도 격리하지 않는다**(2026-10-14 [DEC-OPS-310](../../.agent/memory/decisions.md)). batch 가 실패하면 같은 chunk 를 한 transaction 안에서 행마다 다시 쓴다 — 드라이버가 batch 결과를 증명하지 못한 경우처럼 행마다 쓰면 모두 성공하는 chunk 는 그대로 한 번에 커밋한다. 한 행이라도 SQL 오류(`ATOMIC_WRITE_FAILED` — 길이·NOT NULL·CHECK·UNIQUE·대상 FK·일시 오류)나 재변환 실패(`ROW_RETRY_TRANSFORM_FAILED`)가 나면 chunk 전체를 롤백하고 테이블과 run 을 멈춘다. `target_generated` 도 chunk 를 한 transaction 으로 커밋하고, `INSERT ... RETURNING`·keymap·checkpoint 중 하나라도 실패하면(`TARGET_GENERATED_WRITE_FAILED`) chunk 전체를 롤백한다. 오류는 `행 쓰기 실패(<원천 테이블>, target=<대상 테이블>, row=<원천 정렬 순서의 위치>): <코드>(SQLSTATE=<5자리>)` 형식이고 처음 실패한 행만 밝힌다. 예외 원문은 값이 들어갈 수 있어 싣지 않는다. keymap·checkpoint 기록 실패처럼 특정 행이 아니면 `row=-` 이다. 승인된 예외 행만 격리하는 경로는 ADR-0029 L3 에서 L2 원장과 함께 만든다.

재실행은 같은 `runId + sourceNamespace`의 keymap/checkpoint를 preload한다. 행 변환 실패로 멈춘 run 은 원인을 고친 mapping(다시 승인한 plan)으로 같은 run 을 재개하면 마지막으로 커밋된 checkpoint 다음 행부터 적재한다([PostgreSQL 회귀](../../migration-tool/src/test/java/nuri/migration/EtlPartialLoadRecoveryPostgresIntegrationTest.java)). 동일 source identity의 target identity와 transformed-row checksum이 같으면 이미 완료된 행으로 인정하고, checksum·target identity·target table이 달라지면 실패한다. 사후 verifier도 run-scoped checkpoint 수, target identity 유일성, target 행 재조회 checksum을 대조한다.

### 매핑 식별자와 분할(ADR-0029 L3c)

한 소스 표를 여러 대상으로 나눌 수 있다(1:N 분할, [DEC-OPS-319](../../.agent/memory/decisions.md)). 판정은 한 곳([MappingIndex](../../migration-tool/src/main/java/nuri/migration/mapping/MappingIndex.java))이 하고 정적 검증·실행 순서·실행기·플래너·생성기가 같은 규칙을 쓴다.

```yaml
tables:
  - source: legacy.user_mst            # 기본 매핑 — keymap 을 만든다
    target: public.tb_user_info
    orderBy: USER_SN
    idStrategy: {column: esntl_id, generator: USRCNFRM_, sourceKey: USER_SN}
    columns: [...]
  - source: legacy.user_mst            # 같은 표기를 쓴다
    id: user_addr
    target: public.tb_user_addr
    orderBy: USER_SN
    targetKey: esntl_id
    columns:
      - {source: USER_SN, target: esntl_id, fkRef: legacy.user_mst}   # 소유 매핑의 대리키를 함께 쓴다
      - {source: ADDR, target: addr}
```

- **매핑 id**: `id` 는 `[a-z][a-z0-9_]{0,62}` 이고 mapping 전체에서 유일하다. 같은 소스에서 id 를 생략할 수 있는 매핑은 하나뿐이고 그 실효 id 는 빈 문자열이다. 분할한 매핑은 소스 표를 같은 표기로 적는다 — 플래너는 같은 inventory 표를 다르게 적은 매핑을 막는다(제어 테이블의 `source_table` 이 갈리기 때문이다). id 를 생략한 mapping 의 digest 는 종전과 같다.
- **keymap 소유 규칙**: 같은 소스에서 keymap 을 만드는 매핑(`idStrategy`·`identity`)은 많아야 하나다. `fkRef`·`foreignKeys` 의 부모 소스는 그 소유 매핑으로 풀린다. 소유 매핑이 아닌 매핑이 자기 소스를 `fkRef` 로 가리키면 자기참조가 아니라 소유 매핑에 대한 일반 간선이다(1:1 확장 표의 대리키 공유) — 확장 쪽 checkpoint 의 target key 는 `targetKey` 로 정한다. keymap 은 소스 표 단위 그대로라, 이 규칙이 같은 소스에서 서로 다른 생성 ID 가 조용히 갈리는 경로를 막는다. where 로 행을 나눈 분할에서 두 대상이 모두 생성 키를 요구하는 경우도 이 규칙이 정적으로 거부한다.
- **실행 순서**: 노드는 (소스, 매핑 id) 이고 간선은 소유 매핑으로 잇는다. 형제 매핑을 거치는 의존은 소스 단위로는 순환처럼 보여도 매핑 단위로는 DAG 다. 분할한 매핑마다 같은 읽기 세션 안에서 소스를 따로 읽는다. 결과·보고·실행 증거는 기본 매핑을 종전 이름 그대로, 나눈 매핑을 `source#id` 로 가린다(실행 증거의 `tables[].mapping`).
- **제어 스키마 V2**: `tb_migration_checkpoint` 에 `mapping_id` 를 더하고 PK 를 `(run_id, source_namespace, source_table, mapping_id, source_key)` 로, 대상 키 색인을 `mapping_id` 포함으로 다시 만든다([V2](../../migration-tool/src/main/resources/db/migration-tool/V2__add_mapping_id_to_checkpoint.sql)). 기존 행은 기본 매핑(`''`)으로 채우고 채운 뒤 DEFAULT 를 지워 `mapping_id` 를 빠뜨린 INSERT 가 바로 실패한다. V1 이 만든 이름과 다른 PK 를 가진 표면 적용이 멈춘다. keymap 은 바꾸지 않는다.
- **업그레이드 확인**: 대상에 이미 있는 제어 스키마(적용된 버전이 있거나 checkpoint 표가 있다)에 이 도구가 적용할 버전이 남았으면, COMMIT 은 `--ack-control-schema-upgrade` 없이는 실행 증거도 남기지 않고 시작 전에 멈춘다(`CONTROL_SCHEMA_UPGRADE_UNACKNOWLEDGED`). 처음 만드는 대상은 확인이 필요 없다. 확인은 run 과 run 사이에, 진행 중인 run 이 없을 때 한다 — 적용은 Flyway 이력 잠금 아래 한 번에 하고 PostgreSQL 에서는 실패하면 통째로 되돌아간다. 실행 증거의 `controlSchema: {before, after}` 가 적용 전후 버전을 남긴다(처음 만든 대상은 `before: none`). 기관 실행 wrapper 는 선택 항목 `ackControlSchemaUpgrade` 로 넘긴다.
- **재개 가드**: COMMIT 은 시작할 때 이 run 의 checkpoint 에 있는 (소스, 매핑 id) 가운데 mapping 에 같은 소스는 있는데 그 id 가 없거나, 그 id 의 매핑이 checkpoint 에 기록된 것과 다른 대상 표에 쓰는 것이 있으면 run 상태를 바꾸거나 행을 쓰기 전에 멈춘다(`MAPPING_ID_CHANGED`) — 바꾼 id 의 매핑이 이미 적재한 행을 다시 쓰기 때문이다. 기본 id 를 다른 대상의 매핑에 넘기고 원래 매핑에 새 id 를 주는 개명도 같다. id 를 되돌리거나 새 runId 로 적재한다. V1 run 은 V2 로 올린 뒤 기본 매핑으로 같은 run 을 이어서 재개한다.
- **원장**: 확정 행의 `mapping` 이 그 id 의 매핑을 가리킨다. 생성기는 skeleton 표(매핑 id)마다 그 id 의 확정 행으로 컬럼을 만들고, 소스 단위 완전성은 매핑을 합쳐 본다.

### 조회 조인(ADR-0029 L3d)

여러 소스 표의 값을 한 대상 표로 모을 때 주 표의 행마다 다른 소스 표를 단일 키로 조회한다(N:1, [DEC-OPS-320](../../.agent/memory/decisions.md)). 규칙은 [LookupRules](../../migration-tool/src/main/java/nuri/migration/lookup/LookupRules.java), 짝 판정은 [LookupResolver](../../migration-tool/src/main/java/nuri/migration/lookup/LookupResolver.java) 한 곳이고 정적 검증과 실행기가 같은 판정을 쓴다. 제어 테이블은 바꾸지 않는다.

```yaml
tables:
  - source: legacy.orders
    id: orders                     # 조회를 쓰는 매핑에는 id 가 필요하다(원장 via.mapping)
    target: public.tb_order
    orderByKeys: [ORDER_NO]        # 조회를 쓰면 모드와 무관하게 필수
    targetKey: order_no
    lookups:
      - alias: cust
        source: legacy.customer
        where: "USE_YN = 'Y'"      # 조회 표에만 거는 읽기 조건
        key: {from: CUST_NO, to: CUST_NO}
        cardinality: exactly_one   # 또는 at_most_one + maxMissing
    columns:
      - {source: ORDER_NO, target: order_no}
      - {source: cust.CUST_NM, target: cust_nm}
```

- **선언**: 별칭은 `[a-z][a-z0-9_]{0,62}` 이고 매핑 안에서 유일하다. 키는 단일 컬럼 하나씩이다(복합 키는 받지 않는다). `at_most_one` 은 0 이상의 `maxMissing` 이 필요하고 `exactly_one` 에는 둘 수 없다. 컬럼 항목의 `alias.COLUMN` 은 선언한 별칭만 가리키고 `fkRef` 로 번역할 수 없다. 어떤 컬럼도 읽지 않는 조회는 거부한다. 조회를 선언하지 않은 mapping 의 digest 는 종전과 같다.
- **순서 키가 필요한 이유**: 순서 없는 dry-run 은 결과를 연 채 chunk 를 처리하고, MySQL 은 열린 스트리밍 결과가 있는 동안 다른 문장을 거부한다. 조회는 keyset page(최대 500행)를 다 읽어 결과를 닫은 뒤 보낸다.
- **실행**: page 마다 같은 연결·같은 읽기 트랜잭션에서 `SELECT <키>, <읽는 컬럼> FROM <조회 표> WHERE (<where>) AND <키> IN (?…)` 를 500개 키씩(Oracle IN 목록 1,000·SQL Server 파라미터 2,100 아래) 보낸다. 조회한 값은 행에 `alias.column` 으로 넣고 그 뒤 변환 순서는 일반 컬럼과 같다. 행 checksum 에 조회 값이 들어가므로 첫 실행 뒤 조회 표의 값이 바뀌면 재개가 checksum 불일치로 멈춘다.
- **키 비교**: 계열(가변 길이 문자·정수/고정소수)과 정규화한 글자로 비교한다 — 수는 뒤 0 을 지워 BIGINT 10 과 NUMERIC 10.0 이 같은 키다. 문자는 공백·대소문자를 고치지 않는다. 빈 문자열도 키다 — 짝은 DB 가 정한다(Oracle 은 '' 를 NULL 로 저장해 읽으면 NULL 이다). live 검증은 두 키 컬럼이 같은 계열인지 보고, CHAR 키(공백 채움 비교가 DBMS 마다 다르다)와 그 밖의 타입을 거부한다. DB 의 비교 의미(대소문자를 무시하는 collation, 뒤 공백을 무시하는 비교)가 이 비교와 다르면 키가 있는 행을 모두 `LOOKUP_KEY_MISMATCH` 로 멈춘다 — DB 가 돌려준 조회 행의 키가 요청한 키와 정규화해 같지 않을 때, 그리고 정확히 같은 글자의 짝이 없는 키를 같은 읽기 세션에서 다시 물어 DB 가 행을 돌려줄 때다. 다시 묻지 않으면 'abc' 행만 있는 조회 표를 'abc'·'ABC' 가 함께 든 page 로 물을 때 'ABC' 가 짝 없는 행이 되어 판정이 page 구성에 따라 갈린다.
- **멈춤**: 같은 키의 조회 행이 둘 이상이면 `LOOKUP_FANOUT`, `exactly_one` 인데 짝이 없거나 키가 NULL 이면 `LOOKUP_MISSING`, 키 값이 문자·정수·고정소수가 아니면 `LOOKUP_KEY_TYPE` 이다. `at_most_one` 은 짝이 없으면(키가 NULL 이어도) 읽는 컬럼에 NULL 을 넣고 별칭마다 세며, 표 전체에서 `maxMissing` 을 넘으면 `LOOKUP_MISSING_CAP_EXCEEDED` 다. 모두 행 변환 실패와 같이 그 chunk 를 쓰지 않고 run 을 멈추며 격리하지 않는다(`행 변환 실패(<원천>#<id>, column=<별칭>, row=N): ROW_TRANSFORM_FAILED:LOOKUP_*`). COMMIT 은 시작할 때 조회 표(where 적용)의 NULL 아닌 키가 DB 비교 의미로 유일한지 증명하고, 증명하지 못하면 행을 읽기 전에 `LOOKUP_KEY_UNIQUENESS_UNPROVEN(<별칭>)` 으로 멈춘다. 짝 없는 행 수는 결과와 실행 증거의 `lookupMisses` 에 남는다(값·키 없음).
- **plan**: 조회만 하는 표는 플래너가 자동으로 검토 표시를 달지 않는다. `review.yml` 이 그 표의 처분을 `LOOKUP_INPUT` 으로 밝혀야 하고, 조회하지 않는 표에 `LOOKUP_INPUT` 을 달거나 조회하는 표를 다른 처분(이관 제외 등)으로 두면 막는다. 조회 표를 inventory 에서 찾지 못하거나 모호하면 막는다. 적재 표면 검사는 조회 키와 조회 컬럼의 형식 증거도 보고, 조회 행은 한 번에 읽으므로 조회 컬럼의 LOB 는 adapter 가 흘려 읽을 수 있어도 막는다.
- **보호 컬럼**: 조회 키(주 표의 `key.from`, 조회 표의 `alias.key.to`)도 키로 센다 — 암호화할 소스 값으로 다른 표를 찾지 않는다. 키가 아닌 조회 컬럼은 `encrypt` 로 암호화할 수 있다.
- **원장**: 조회 컬럼은 `via: {mapping, lookup}` 이 있는 확정 행이다(원장 행의 `source` 는 조회 표의 컬럼). 같은 컬럼을 직접 매핑과 조회 매핑에서 함께 써도 다른 행이다. 조회만 하는 표도 소스 단위 완전성을 받으므로 조회 키처럼 옮기지 않는 컬럼은 이관 제외와 사유로 적는다 — 원장 행이 없는 조회 표 컬럼이 있으면 plan 이 멈춘다.
- **범위 밖**: 복합·CHAR 키 조회, 여러 단계 조인, 조회 표의 LOB, 별도 매핑 둘이 같은 대상으로 들어가는 N:1 합집합.

다음 경계는 원자적이지 않다.

- 전체 run이 아니라 target chunk/row 단위로 commit하므로 뒤 chunk 실패 시 앞선 성공 chunk는 유지된다.
- 단일 self-reference 2-pass는 data 적재 전에 예약 keymap을 별도 commit한다.
- run 상태 갱신과 최종 report 판정은 data chunk transaction과 별도다.
- 시퀀스 재설정은 모든 table 적재 뒤 별도 transaction이다. 그 전에 끝난 run은 재실행이 다시 맞춘다.
- 현재 쓰기 정책은 INSERT-only이며 upsert·source delete 반영·CDC·전체 rollback은 없다.

## 실행 예시

아래 예시의 실제 YAML `endpointId` loader 경로는 회귀 테스트로 고정돼 있다. 다만 명령은 승인된 비운영 rehearsal 환경과 SELECT-only source 계정이 준비된 뒤에만 사용한다. `plan`과 `load`에는 `discover`와 같은 adapter/catalog/schema/object-kind/system-object scope를 반복해야 한다.

```powershell
./gradlew :migration-tool:bootRun --args="--command=discover --mapping=mapping.yml --inventory=inventory.json --source-adapter=postgresql-pg-catalog --schemas=legacy"
./gradlew :migration-tool:bootRun --args="--command=plan --mapping=mapping.yml --inventory=inventory.json --plan=plan.json --review=review.yml --source-adapter=postgresql-pg-catalog --schemas=legacy"
./gradlew :migration-tool:bootRun --args="--command=validate --plan=plan.json"
./gradlew :migration-tool:bootRun --args="--command=load --mapping=mapping.yml --inventory=inventory.json --plan=plan.json --source-adapter=postgresql-pg-catalog --schemas=legacy --ack-adapter=postgresql-pg-catalog --ack-source-freeze --mode=dry-run"
```

Commit은 같은 load 계약에서 `--mode=commit`을 명시한다. 외부 source driver는 discover/load 양쪽에 같은 repeatable `--source-driver-jar=<absolute-local.jar>`와 `--source-driver-class=<class>`를 주고 dry-run load에 inventory가 기록한 exact `--ack-source-driver=<sha256>`를 추가한다. 접속정보는 환경 변수나 승인된 secret provider adapter로 주입하고 mapping, artifact, 로그, 명령행에 평문 저장하지 않는다.

배포용 JAR은 `./gradlew :migration-tool:bootJar`로 만들고 `migration-tool/build/libs/`의 실제 산출물 이름을 사용한다. 온라인 UI 없이 테스트·bootJar를 함께 검증하는 진입점은 `npm run verify:migration`이다.

## 기관 도입과 실행 승인

[ADR-0018](decisions/ADR-0018-governance-review-lifecycle-and-adoption.md)은 이관 제품의 기술 검증·기관 환경 승인·실제 load 승인을 구분한다. `npm run review:migration`은 제품 범위와 상태를 보고하며 온라인 URL·UI 원장을 이관 검증의 전제 조건으로 가져오지 않는다.

`config/governance/migration-adoption-review.json`은 `product: migration-tool`, `profile: null`, `status: pending`으로 시작한다. 기관은 실제 source/target identity, mapping·schema·driver, 복구·cutover와 실행 artifact를 검토하고 소스 범위 digest·유효기간·근거를 기록한다. 원본 프로젝트의 운영 승인이나 온라인 원장을 복제하여 이관 승인을 대신하지 않는다.

프런트·온라인 모듈을 포함하지 않는 별도 소스 제품은 `npm run migration:export -- --output build/migration-product/<새-디렉터리>`로 생성한다. [생성기](../../scripts/generate-migration-product.mjs)는 migration-tool만 포함하는 Gradle settings와 전용 검증·hook·workflow를 만들고 기관 원장을 pending으로 초기화한다. 생성은 기술 검증을 대신하지 않으므로 출력 디렉터리에서 `npm run verify`와 `npm run test:operational-contracts`를 실행한다. 새 저장소의 required CI 설정과 운영 도입 승인은 별도로 연결한다.

`npm run adoption:check -- --execution config/governance/execution.json --environment <기관-환경-ID>`는 기관 승인과 실행 descriptor를 확인하고 이관 기술 검증 후 다시 확인한다. 기본 동작은 검사다. 명시적 `--execute`에서만 검토된 JAR·mapping·inventory·plan과 mode로 기존 `--command=load`를 호출한다. 이 wrapper는 현재 built-in PostgreSQL adapter·명시 source schema·source freeze 확인을 요구한다. 실제 적재에서는 이 문서의 inventory·plan·live identity 경계도 모두 다시 검사한다.

원장과 descriptor 작성은 [검토 수명 가이드](../03-guides/governance-review-lifecycle.md), 실패·재개는 [복구 런북](../04-operations/migration-recovery-runbook.md)을 따른다. 파일 hash는 제출한 근거와 실행물을 묶을 뿐 실제 운영 검증이나 작성자 신원을 자동 증명하지 않는다.

### 표준 계약 검증

`plan`과 `load`는 정적 검증(코드젠 스냅샷 `db_columns.json`의 컬럼 존재) 뒤에 승인 digest에 결속된 live 대상 계약으로 매핑을 다시 검증한다([TargetStandardValidator](../../migration-tool/src/main/java/nuri/migration/validate/TargetStandardValidator.java), DEC-OPS-307).

- **live 계약**: 매핑 표의 `information_schema.columns`(타입·길이·정밀도·소수 자릿수·NULL 허용·기본값·identity·생성 컬럼)를 [읽고](../../migration-tool/src/main/java/nuri/migration/postgres/PostgresTargetStandardReader.java) JDBC metadata의 컬럼 집합과 대조한다. 권한으로 가려진 컬럼이 있거나 읽지 못하면 실패하며 코드젠 스냅샷으로 대신하지 않는다.
- **표준 사전**: 대상 표와 같은 schema에 `meta_standard_terms`·`meta_standard_domains`가 있으면 컬럼 이름(영문약어)의 용어와 도메인을 찾는다. 존재는 권한과 무관한 `pg_class`로 판정한다. 하나만 있거나 읽지 못하거나 용어·도메인이 모호하거나 해석할 수 없으면 실패한다. 둘 다 없으면 도메인 대조만 경고 없이 생략한다 — 사전은 대상 표와 같은 schema 에서만 찾으므로, 업무 표를 사전과 다른 schema 에 두면 도메인 대조가 조용히 빠진다. 용어가 없는 컬럼의 경고는 검증 결과에만 있고 지금 workflow 출력으로는 나가지 않는다. 물리 타입이 도메인과 다른 종류면(숫자 도메인의 문자 컬럼 등) 실패하고, 같은 종류면 물리 컬럼과 도메인 중 좁은 한계를 적용한다. 일련번호 `NUMERIC` 도메인의 `bigint`처럼 현대화한 정수 컬럼은 같은 종류로 본다.
- **값 종류**: const(type 힌트 없이 문자열로 바인딩), fkRef(생성 ID 문자열), 소스 inventory 선언, 내장 변환기, codemap, type 힌트 순서로 정한다(적재와 같은 순서). codemap 은 표준 코드와 정책이 쓰는 대체값의 길이로 정하고, 앞 단계 값의 길이는 `unmapped: passthrough` 일 때만 남는다. 형식이 조용히 바뀌거나 값이 손실되는 조합(날짜·논리값→문자, 시각→날짜, 날짜→일시, 근사 수치→정확 수치, 문자→숫자·날짜)은 실패한다. 내장이 아닌 변환기는 출력 계약을 그 변환기가 소유하므로 검사하지 않는다.
- **표준 도메인 변환기**(ADR-0029 L3a-1): 변환기가 쓰는 값은 소스 길이와 무관하게 선언한다 — `ymd8`·`ymd8-truncate` 문자 8자, `ymdhms14` 14자, `hms6` 6자, `yn` 1자, `date-text`·`date-truncate` 날짜, `timestamp-text`·`timestamp-from-date` 일시. 그래서 `NUMBER(8)` 소스(문자로 쓰면 9자)도 `ymd8` 로 `varchar(8)` 에 쓴다. 변환기마다 받는 소스 종류([표](#표준-도메인-변환기와-nullify))를 inventory 의 JDBC 타입으로 판정해 받지 않는 종류(모든 행이 거부되는 조합)와 선언을 확인할 수 없는 소스는 실패한다.
- **날짜→일시**: 날짜 값(날짜 소스·`type: date`·`date`·`date-text`·`date-truncate`)은 timestamp 컬럼에 쓰지 않는다. PostgreSQL 은 받지만 checkpoint 는 날짜(`2024-01-31`)로, verify 는 되읽은 일시(`2024-01-31 00:00:00.0`)로 checksum 을 만들어 맞지 않는다([PostgreSQL 재현](../../migration-tool/src/test/java/nuri/migration/StandardDomainTransformPostgresIntegrationTest.java)). 그날 00:00 일시로 쓰려면 `transform: timestamp-from-date` 를 선언한다 — 오류 문구가 그 변환기를 안내한다.
- **비시간 소스→날짜·시각 컬럼**(ADR-0029 L3a-2): 날짜·일시가 아닌 소스(문자·숫자 등)는 `type: date|timestamp|datetime` 이나 내장 `date`·`timestamp` 로 날짜·시각 컬럼에 옮기지 않는다 — 이 경로는 `99991231` 같은 자리표시를 날짜로 받고 값마다 위반을 판정하지 않는다. 값마다 판정하는 `date-text`·`timestamp-text`·`timestamp-from-date`·`date-truncate` 만 받는다. 원장에 기록된 위반이 낡았거나 비어 있어도 막도록 구조로 거부한다.
- **시간대 소스**: 시간대가 있는 소스는 실행 환경(JVM·세션)의 시간대로 날짜·시각이 정해지므로 변환하지도, 시간대 없는 컬럼에 그대로 옮기지도 않는다. JDBC 타입(TIME·TIMESTAMP WITH TIMEZONE, Oracle `-101`·`-102`, SQL Server `-155`)이나 드라이버 타입 이름(`timestamptz`·`timetz`·`timestampltz`·`datetimetz`·`datetimeltz`·`datetimeoffset`, `with time zone`·`with local time zone` 을 담은 이름)으로 가린다 — PostgreSQL 드라이버는 `timestamptz`·`timetz` 를 TIMESTAMP·TIME 으로 알린다. MySQL·MariaDB 의 `TIMESTAMP` 는 UTC 로 저장하고 세션 `time_zone` 으로 바꿔 돌려주므로, 소스 제품이 MySQL·MariaDB 이고 타입 이름이 `TIMESTAMP` 이면 시간대가 있는 값으로 본다(`DATETIME` 은 아니다). 이런 소스는 내장 변환기·`type`·`codemap` 을 쓰면 실패하고, 그대로는 시간대 있는 컬럼(`timestamptz`·`timetz`)에만 옮길 수 있다 — 시간대 없는 `timestamp`·`time` 컬럼에 그대로 옮기는 매핑도 값 타입 불일치로 같은 안내와 함께 실패한다(종전에는 `timestamptz`→`timestamp`, `timetz`→`time` 이 통과했다). 거꾸로 시간대 없는 일시·시각을 `timestamptz`·`timetz` 컬럼에 쓰는 것도 막는다. 시간대 없는 표준 컬럼에 옮겨야 하면 시간대를 정하는 프로젝트 변환기를 계약 버전·구현 digest 와 함께 등록해 선언한다 — 그 변환기는 출력 계약을 스스로 지므로 이 검사를 받지 않는다. 다만 L3a-2 부터 원장 `load` 는 내장 변환기만 받으므로 이 경로는 승인 workflow(plan·load)에서 쓰지 못한다. 도구 안에는 시간대를 정하는 내장 변환기가 없다.
- **여부·논리값 codemap**: 여부 도메인(도메인 이름이 `여부`·`유무` 로 시작 — 적합성 추정기와 같은 판정) 컬럼의 codemap 은 표준 코드와 쓰이는 대체값이 `Y`·`N` 이어야 하고 `unmapped: passthrough` 를 쓸 수 없다. 논리값 소스를 찾는 codemap 의 키는 원천 Boolean 의 표기 그대로다 — 변환 없이·`trim`·`lower` 뒤에는 정확히 `true`·`false`, `upper` 뒤에는 `TRUE`·`FALSE`. 그 밖의 내장 변환기 뒤에는 codemap 키를 정할 수 없어 실패한다.
- **길이·정밀도**: inventory의 소스 선언 길이, 정밀도와 소수 자릿수가 타깃 한계를 넘으면 실패한다. 선언을 확인할 수 없어도 실패한다. 다만 타깃이 길이 제한 없는 `text`·`numeric`이면 통과한다. 소수 자릿수 초과는 PostgreSQL이 오류 없이 반올림하므로 특히 막는다. 값을 줄여야 하면 내장이 아닌 변환기를 선언한다 — 다만 L3a-2 부터 원장 `load` 는 내장 변환기만 받으므로 이 경로는 승인 workflow 에서 쓰지 못한다([GAP-MIG-002](../../.agent/memory/known-gaps.md)).
- **보호 컬럼·생성 ID**: `encrypt` 컬럼은 평문이 아니라 Base64 암호문 길이로 대조한다(평문 N자 → 최대 4·⌈16·⌈4N/16⌉/3⌉자, 13자 주민번호 → 88자, 48자 → 256자). 소스가 문자열이 아니면(내장 변환기를 거쳐도) 실패한다. `idStrategy` 컬럼과 그 부모를 가리키는 `fkRef` 값은 생성 ID 길이(접두사 + hex, 기본 20자)로 물리 컬럼·도메인 중 좁은 쪽과 대조한다.
- **NOT NULL**: 기본값·identity·생성식이 없는 NOT NULL 컬럼은 매핑·const·`idStrategy`·identity·복합 FK 중 하나가 채워야 한다. `GENERATED ALWAYS` 생성 컬럼과 `GENERATED ALWAYS` identity에는 쓸 수 없다. 기본값은 매핑하지 않은 컬럼에만 쓰인다 — 매핑한 컬럼은 NULL 도 명시해 바인딩한다(적재 절). 그래서 `nullify` 는 NULL 을 받는 컬럼에만 선언할 수 있고, 기본값이 있는 NOT NULL 컬럼도 거부한다.
- **결속과 메시지**: 이 계약은 target schema digest(fingerprint v3)에 들어간다. plan 뒤에 스키마나 표준 사전이 바뀌면 load가 digest 불일치로 멈추고, load는 실행 직전에 같은 검증을 다시 한다. 오류는 앞의 20건을 보여 주며 표·컬럼 이름과 타입·길이만 싣는다. 행 값·const·codemap 값은 싣지 않는다.

## production cutover 전 필수 보강

다음 항목이 닫히기 전에는 plan의 `commitReady=true`나 load의 PASS를 운영 이관 승인으로 사용하지 않는다.

1. **완료(2026-09-05):** `MappingLoader`가 source/target `endpointId`를 보존하도록 수정하고, [loader 회귀](../../migration-tool/src/test/java/nuri/migration/model/MappingLoaderEndpointBindingTest.java)와 [실제 YAML `discover` 회귀](../../migration-tool/src/test/java/nuri/migration/MigrationWorkflowRunnerTest.java)를 추가했다.
2. **구현 완료:** target 접속 위치·cluster/DB identity·허용 스키마를 승인 digest에 결속한다. 실제 도입 환경의 identity 조회 권한과 복제본·접속 경로는 별도로 확인한다. 이전 스키마 전용 digest의 plan은 다시 작성·승인한다.
3. PostgreSQL source/target과 Oracle·Tibero·MySQL·MariaDB·SQL Server·CUBRID adapter를 지원 버전·실제 driver·최소권한 계정으로 검증한다. 현재 vendor query 정의와 H2/mock 테스트는 실 DB 증거가 아니다.
4. charset/collation/timezone, quoted identifier, LOB와 vendor-specific type, 대용량 스트리밍을 익명화된 대표 데이터로 rehearsal한다.
5. **JSON 구현 완료:** 실행별 승인·mapping·target digest, 모드, 시각, 테이블별 건수·검증 상태를 보존한다. 원시 행·키·접속정보는 기록하지 않는다. `STARTED` 잔류는 결과 미확정이며 `DRY_RUN/PASS`는 실제 적재 완료가 아니다. 운영 승인자·백업·점검 창과의 결속은 배포 절차로 확보한다.
6. [부분 적재 복구 런북](../04-operations/migration-recovery-runbook.md)과 PostgreSQL 회귀가 마련돼 있다. 실제 프로세스 종료 후 체크포인트 재개·무중복·변조 탐지도 검증했다. self-reference 예약 keymap, commit ambiguity와 운영 백업 복원·cutover는 인수 환경에서 별도 승인·실증한다.
7. 기존 target 행 충돌·재실행·source 변경/삭제 정책을 정하고, 필요한 경우 staging 기반 제한적 upsert를 별도 설계한다. 현재 INSERT-only를 자동 overwrite로 확장하지 않는다.
8. 초기 이관 뒤 증분 동기화가 필요하면 watermark/CDC, 순서·중복·삭제·cutover freeze와 재처리 의미를 별도 구현·검증한다.
9. view·routine·trigger·grant 등 비데이터 객체의 `RECREATE_VIA_FLYWAY`·`REIMPLEMENT_IN_APP`·`EXTERNALIZE` disposition을 실제 Flyway/application 변경 및 owner 승인과 연결한다.

스키마 자체의 Expand-and-Contract 절차는 [zero-downtime-migration.md](zero-downtime-migration.md)의 영역이며, 데이터 cutover와 같은 것으로 간주하지 않는다.

표준화 단계(레거시 컬럼의 의미 식별·표준용어 매핑)와 이 도구의 공백 진단·보강 제안은 [레거시 표준화 이관 설계(Draft)](legacy-standardization-migration-design.md)에 둔다.

## 검증 증거와 한계

```powershell
npm run verify:migration
```

현재 테스트 목록은 [migration-tool/src/test/java](../../migration-tool/src/test/java)와 실행 보고서가 정본이다. Mapping/artifact/adapter/discovery/visibility/plan binding, 실제 YAML endpoint binding, 외부 driver 격리, typed·composite·generated identity, 단일 source read session, chunk/row data-keymap-checkpoint 원자성, durable resume/checksum, PostgreSQL target 환경 결속과 strict 종료를 검사한다. [프로세스 종료 회귀](../../migration-tool/src/test/java/nuri/migration/EtlCrashRecoveryPostgresIntegrationTest.java)는 격리 PostgreSQL의 1,501행·30MB 초과 text/bytea를 사용해 실제 자식 JVM 종료, 500행 체크포인트 재개, 재실행 무중복·변조 탐지를 검증한다. Docker가 필요한 경로와 로컬 실행 결과의 범위는 [검증 기록](../04-operations/readiness-followups.md#이관-프로세스-종료와-큰-필드)을 따른다. 다른 source vendor·운영 규모·권한·cutover/rollback 증거는 별도로 필요하다.

---
*조회 조인·`via`·`LOOKUP_INPUT`·조회 키 유일성 사전 검사 검토: 2026-10-15. 매핑 식별자·1:N 분할·keymap 소유 규칙·제어 스키마 V2·업그레이드 확인·재개 가드 검토: 2026-10-15. 원장 형식 2·원장에서 mapping 만들기·원장 필수화·비표준 대상·비시간 소스→날짜·시각 검토: 2026-10-15. 표준 도메인 변환기·nullify·격리 어휘 대응표·날짜→일시 차단·시간대 소스 검토: 2026-10-15. 표준 계약 검증 도입·보호 컬럼 암호화·표준 ID 형식·시퀀스 재설정·값 변환 순서·codemap·행 변환 실패 의미 검토: 2026-10-13. 기관 도입·검증 진입점 검토: 2026-09-14. Target binding·실행 JSON·PostgreSQL 복구 검토: 2026-09-10. 운영 적용 여부는 별도 증거를 요구한다.*
