# ⚖️ eGov Enterprise DB 표준화 헌법 (DB Standardization Constitution)

## 전문 (Preamble)
본 헌법은 `egov-enterprise` 프로젝트의 데이터 무결성을 수호하고, 전사적 데이터 거버넌스를 확립하기 위해 제정되었다. 모든 데이터 오브젝트의 생성과 변경은 본 헌법이 정한 원칙을 엄격히 준수해야 하며, 본 헌법은 프로젝트 내 모든 데이터 모델링 행위의 최상위 규범으로서 존재한다.

---

## 제1장 총칙 (General Principles)

### 제1조 (명칭의 형식)
1. 모든 오브젝트 및 컬럼의 명칭은 **소문자 Snake Case**를 사용함을 원칙으로 한다.
2. 명칭은 의미론적으로 명확해야 하며, 약어는 반드시 [표준 용어 사전](./standard_terms.md)에서 승인된 것만을 사용한다.
3. 모든 명칭은 단수형(Singular)을 사용하며, 복수형 사용을 금지한다.

### 제2조 (데이터 거버넌스의 원천)
1. 모든 데이터 명칭과 타입의 유일한 진실의 원천(Single Source of Truth)은 DB 내 **표준 메타 테이블(`meta_standard_words`, `meta_standard_terms`, `meta_standard_domains`)**이다.
2. 에이전트는 어떠한 경우에도 메타 데이터를 임의로 추측하거나 대체할 수 없으며, 반드시 실시간 조회를 통해 검증해야 한다.

---

## 제2장 오브젝트 명명 (Object Naming)

### 제3조 (유형별 접두사)
1. 오브젝트의 유형을 식별하기 위해 다음의 접두사를 명칭의 맨 앞에 반드시 부착한다.
   - **테이블**: `tb_`
   - **뷰**: `vw_`
   - **시퀀스**: `sq_`
   - **함수**: `fn_`
   - **프로시저**: `sp_`
   - **트리거**: `tr_`
2. **[메타 테이블 예외]** DB 표준 거버넌스의 원천이 되는 3대 메타 테이블(`meta_standard_words`, `meta_standard_terms`, `meta_standard_domains`)은 본 조 1항의 `tb_` 접두사 규정의 적용 대상에서 명시적으로 제외하며, 독자적인 `meta_` 접두사 체계를 유지한다. 또한 본 메타 테이블들은 표준 감사 및 점검 자체의 예외 대상으로 규정하여, 어떠한 표준성 감사도 수행하지 않는다.

### 제4조 (네이밍 구조)
1. 기본 구조는 `[접두사]_[도메인]_[주체]` 형식을 따른다.
2. 도메인은 해당 오브젝트가 속한 논리적 업무 영역(예: `auth`, `bbs`, `com`, `sys`)을 의미한다.

---

## 제3장 데이터 설계 (Data Design)

### 제5조 (도메인 기반 설계 프로세스)
모든 컬럼은 다음의 3단계 프로세스를 예외 없이 통과해야 한다.
1. **단어 조합**: `meta_standard_words`를 참조하여 의미 단위를 분해 및 조합한다.
2. **용어 확정**: 조합된 용어를 `meta_standard_terms`에서 조회하여 표준 명칭(Abbreviation)을 인출한다.
3. **도메인 강제**: 인출된 용어에 매핑된 도메인을 `meta_standard_domains`에서 조회하여 **데이터 타입 및 길이를 100% 동일하게 적용**한다.
4. **[문자형 데이터 타입 표준화]** 도메인 가이드 및 물리적 테이블 설계 시 고정 문자형인 `char` 타입의 사용은 전면 금지하며, 공백 패딩 방지 및 호환성 극대화를 위해 가변 문자형인 `varchar`(`character varying`) 타입으로 변환하여 일괄 적용해야 한다. (예: 여부 도메인은 `VARCHAR(1)`, 일자 도메인은 `VARCHAR(8)` 등)
5. **[기본키 생성 전략 표준]** 신규 `@Entity` 의 단일 기본키는 서비스 레이어 수동 채번(레거시 egov `IdGnrService`·`nextval`·`MAX+1`·수동 문자열 할당 등)이 아니라 **JPA 관리 생성(`@GeneratedValue`: `SEQUENCE`/`IDENTITY`/`UUID`)**을 사용한다. 이미 데이터가 영속된 기존 수동 PK 엔티티는 동결(grandfathered)하며, 그 생성 전략의 교체는 본 표준이 아닌 별도의 DB 설계결정으로 다룬다. 본 규범은 `api-server/src/test/java/nuri/api/harness/PkGenerationStandardLinterTest.java` 가 강제하여, 동결 베이스라인에 없는 신규 단일 `@Id` 엔티티가 `@GeneratedValue` 없이 도입되는 것을 배포 전에 차단한다(복합키·`@EmbeddedId` 는 매핑/조인 테이블의 정당한 패턴이라 면제). 이는 최근 채번 통일(레거시 `EgovIdGnrService` 전면 제거 → `IdGenerationUtil`)로 정립된 현대화 방향을 규범으로 승격한 것이다.

### 제6조 (제약 조건 명명)
제약 조건은 가독성을 위해 다음의 규칙을 따른다.
1. **기본키(PK)**: `pk_[테이블명]`
2. **외래키(FK)**: `fk_[기준테이블]_[참조테이블]`
3. **유니크키(UK)**: `uk_[테이블명]_[컬럼명]`
4. **인덱스(IX)**: `ix_[테이블명]_[컬럼명]`
5. **체크 제약(CK)**: `ck_[테이블명]_[컬럼명]` (예: `ck_tb_bbs_item_use_yn` — 여부(`_yn`) 컬럼의 `CHECK (col IN ('Y','N'))` 값 무결성 제약)
6. **[복합키 길이 한계 보완]** 복합 컬럼으로 구성된 제약 조건의 명칭이 PostgreSQL 식별자 최대 길이(63바이트)를 초과할 우려가 있는 경우, 컬럼명을 나열하는 대신 해당 제약의 비즈니스 의미를 축약한 별칭을 사용할 수 있다. (예: `uk_tb_order_item_uniq_pair`)
7. **[UNIQUE 불변식의 엔티티 미러 의무]** 엔티티(`@Entity`)가 매핑된 테이블에 DB UNIQUE 제약(또는 UNIQUE 인덱스)을 부여할 때에는, 그 불변식을 대응 엔티티에 JPA 레벨로 미러링해야 한다 — `@Table(uniqueConstraints = @UniqueConstraint(columnNames = {...}))`(명명/다중컬럼), 단일 컬럼의 `@Column(unique = true)`, 또는 PK 컬럼셋(`@Id`)과 동일한 경우 중 하나로 표현한다. 이는 `DB → 엔티티` 로 이어지는 SSOT 계약체인(제2조)의 침묵 드리프트, 즉 애플리케이션이 인지하지 못하는 DB 전용 불변식의 발생을 차단하기 위함이다. 본 의무는 `api-server/src/test/java/nuri/api/harness/UniqueConstraintMirrorLinterTest.java` 가 마이그레이션의 `ADD CONSTRAINT ... UNIQUE` 및 `CREATE UNIQUE INDEX` 를 파싱하여, 매핑 엔티티에 JPA 미러가 누락된 경우 배포 전에 차단함으로써 기계적으로 강제한다.

---

## 제4장 무중단 데이터 진화 (Zero-Downtime Migration)

### 제7조 (무중단 스키마 진화 정책)
1. 컬럼 타입 변경, 명칭 변경, 또는 테이블 마이그레이션 등의 고위험 DDL 작업 시 서비스 중단을 막기 위해 반드시 **"확장 후 축소 (Expand-and-Contract)"** 패턴을 의무 적용한다.
2. 스키마 변경 프로세스는 다음 4단계를 예외 없이 준수해야 한다.
   - **Expand (확장)**: 구버전 애플리케이션 참조 호환성을 위해 기존 물리 구조를 보존한 채, 새로운 규격의 컬럼/테이블을 추가(DDL)한다.
   - **Sync (동기화)**: 애플리케이션 수준에서 이중 쓰기(Double-Write)를 수행하거나 배치 마이그레이션을 통해 데이터를 신규 구조와 완벽히 동기화한다.
   - **Redirect (이관)**: 모든 비즈니스 로직과 API 참조 대상을 신규 구조로 일원화하고 프론트엔드 연동 상태를 재검증한다.
   - **Contract (축소)**: 구버전 구조의 잔재(Old Columns/Tables)를 안전하게 Drop하고 인덱스/제약조건 네이밍 표준화를 영구 이행한다.
3. **[하네스 강제 연동 규범]** 본 헌법 제7조의 이행은 DDL 린터 하네스 `api-server/src/test/java/nuri/api/harness/ZeroDowntimeMigrationLinterTest.java` 가 배포 전(테스트 단계)에 기계적으로 강제한다. 본 하네스는 **환경별 차등이나 경고 전용(warn-only) 모드 없이**, 아래 파괴적 DDL 이 단 1건이라도 검출되면 로컬·CI 를 불문하고 무조건 빌드를 차단(Hard-Stop, JUnit `fail`)한다.
   - **차단 대상(파괴적 DDL)**: `DROP COLUMN`, `ALTER COLUMN ... TYPE`(**VARCHAR 길이 증가를 포함한 모든 타입 변경**), `RENAME COLUMN`·`RENAME TABLE`, `DEFAULT` 없는 `ADD ... NOT NULL`, `DROP TABLE`, `DROP SEQUENCE`, `TRUNCATE`, `ALTER SEQUENCE ... RENAME`.
   - **비대상(허용)**: `ADD CONSTRAINT`(UNIQUE·CHECK·FK 등), `CREATE INDEX`, `DROP CONSTRAINT`, `DROP NOT NULL`(NULL 제약 완화). 즉 부가적(additive)·비파괴적 변경과 제약/인덱스 조작은 자유로이 허용된다. (구 조문의 "VARCHAR 길이 증가·NULL 완화는 차단 제외" 서술은 오류였다 — NULL 완화만 허용이며 타입 변경은 VARCHAR 길이 증가를 포함해 차단된다.)
   - **전수 스캔**: 검사 대상은 baseline(`V2_0`)을 포함한 마이그레이션 디렉토리 전체 `.sql` 이며(`Files.walk`), 신규 델타에 한정하지 않는다.
   - **예외 처리(마커 기반)**: 무중단 4단계 중 Contract(축소) 릴리스 등 불가피한 파괴적 DDL 은 ① 해당 위반 라인 끝의 `-- linter:ignore`(사유 병기) 또는 ② 파일 상단의 `-- linter:disable-file` 마커로만 통과시킨다.


---

## 제5장 이력 관리 및 삭제 규범 (Audit & Deletion Policy)

### 제8조 (Audit 컬럼 및 삭제 규범)
1. 시스템의 모든 핵심 비즈니스 데이터 및 설정 테이블은 생성자(`frst_rgtr_id`), 생성일시(`crt_dt`), 수정자(`last_mdfr_id`), 수정일시(`mdfcn_dt`)의 Audit 컬럼 4종을 반드시 포함해야 한다. 단, 비즈니스 특성상 데이터의 수정(UPDATE)이 구조적으로 발생하지 않는 **Insert-Only 성격의 테이블**(이력/로그/감사 추적/다대다 매핑 테이블 등)은 생성자(`frst_rgtr_id`)와 생성일시(`crt_dt`) 2종만 탑재하고, 수정자(`last_mdfr_id`)와 수정일시(`mdfcn_dt`)는 탑재 의무에서 면제한다.
2. **[논리 삭제 의무 제외]** 데이터 복원력과 이력관리를 위한 모든 비즈니스 테이블의 논리 삭제(`del_yn` 등) 컬럼 의무 탑재 규정은 본 헌법의 필수 요건에서 공식 제외한다. 각 비즈니스 업무 도메인의 특성과 데이터 수명 주기 정책에 맞춰 물리 삭제(`Hard Delete`)를 기본 설계로 채택할 수 있다.
3. 데이터의 복원이나 이력이 비즈니스 요구사항으로 인해 필수적인 경우에 한하여 선택적으로 논리 삭제 방식을 채택하며, 이 경우 애플리케이션 레벨(백엔드 헌법 제14조)에서의 JPA 영속성 필터링 조항과 연계하여 삭제 데이터 조회를 제어할 수 있다.
4. **[메타 테이블 감사 제외]** 3대 메타 테이블(`meta_standard_words`, `meta_standard_terms`, `meta_standard_domains`)은 데이터 표준의 기준이 되는 특수 테이블이므로, 공통 Audit 4대 컬럼 탑재 여부 및 도메인 정합성 검사 등 모든 헌법적 감사 대상에서 원천적으로 제외한다.
5. **[감사컬럼 표준의 기계 강제 및 그 한계]** 신규 테이블의 감사컬럼 표준은 스키마 명명 린터 `api-server/src/test/java/nuri/api/harness/SchemaNamingLinterTest.java`(`checkAuditColumns`)가 델타 SQL 정적 분석으로 배포 전에 강제한다. 다만 정적 분석으로는 테이블의 Insert-Only 여부(본 조 1항)를 판별할 수 없으므로, 게이트가 강제하는 범위는 ① 신규 `tb_` 테이블의 **최소 감사컬럼 2종(`frst_rgtr_id`, `crt_dt`) 탑재**와 ② 수정 감사 짝의 **대칭성**(`mdfcn_dt` 와 `last_mdfr_id` 는 둘 다 탑재하거나 둘 다 생략)에 한정한다. 따라서 가변(수정 발생) 비즈니스 테이블의 감사컬럼 **4종 완비 여부는 게이트가 아니라 설계 리뷰로 보증**하며(게이트가 4종을 자동 강제한다는 뜻이 아니다), 3대 메타 테이블은 본 검사에서 면제된다(본 조 4항). 동일 하네스는 본 헌법 제1조(소문자 snake_case)·제3조(`tb_`/`sq_` 접두)·제5조 4항(고정 문자형 `char` 금지)·제6조(제약 명명 `pk_`/`fk_`/`uk_`/`ck_` 접두)도 함께 기계 강제한다.

---

## 제6장 부칙 (Supplementary Provisions)

### 제9조 (예외 및 표준 등록)
1. 메타 데이터 테이블에 적절한 표준이 존재하지 않는 경우, 에이전트는 임의로 설계를 진행할 수 없다.
2. 이 경우 에이전트는 반드시 사용자에게 상황을 보고하고, **새로운 표준 단어 및 용어의 등록을 요청**해야 한다.

### 제10조 (시행일)
본 헌법은 공포된 즉시 효력을 발생하며, 기존의 모든 산출물에 우선하여 적용된다.
