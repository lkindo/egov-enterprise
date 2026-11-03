package nuri.api.harness;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🏛️ DB Schema Naming Standard Linter — DB 표준화 헌법 제1·3·5·6·8조의 기계 강제
 *
 * <p>[P4 거버넌스] 2026-07-16 표준화 감사에서 "명명 표준의 자동 집행 장치 0건"이 거버넌스 최대 갭으로
 * 판정되어 신설. 마이그레이션 델타 SQL 을 정적 분석하여 신규 DDL 의 명명·타입 표준을 배포 전에 차단한다.
 * (기존 check-db-standard.js 는 존재하지 않는 모듈을 스캔하던 죽은 스크립트로 본 하네스가 대체·삭제)
 *
 * <p>검사 범위: V2_2 이후 델타 + R__ 파일. V2_0(baseline 스냅샷)·V2_1(메타 시드)은 레거시 일괄 반입이라
 * 제외한다. 이 정적 범위 밖의 물리 정합은 live metadata 조회, schema-validation과
 * docs/02-architecture/db-naming-exceptions.md의 현재 예외 대장을 함께 확인한다.
 *
 * <p>예외 체계: 예외 대장(docs/02-architecture/db-naming-exceptions.md)과 동기화된 화이트리스트 +
 * 위반 라인 끝 '-- naming-linter:ignore' 지시어(사유 병기 필수).
 */
@Tag("governance-harness")
class SchemaNamingLinterTest {

    private static final Logger log = LoggerFactory.getLogger(SchemaNamingLinterTest.class);
    private static final String MIGRATION_PATH = "src/main/resources/db/migration";

    /** 레거시 일괄 반입 파일 — 델타 명명 감사 범위 밖 */
    private static final Set<String> EXCLUDED_FILES = Set.of(
            "V2_0__baseline.sql",
            "V2_1__seed_meta_standard.sql");

    /** 프레임워크/메타 소유 객체 — 예외 대장 §1~§3 (헌법 제3조 2항) */
    private static final Set<String> TABLE_WHITELIST = Set.of(
            "meta_standard_words", "meta_standard_terms", "meta_standard_domains",
            "ecopseq", "ids", "revinfo", "flyway_schema_history");

    private static final Set<String> SEQUENCE_WHITELIST = Set.of(
            "seq_meta_standard_domains", "seq_meta_standard_terms", "revinfo_seq");

    /** 프레임워크/메타 소유 제약 — 예외 대장 §1·§3. (fk_role_prgrm_map_* 2건은 2026-07-17 RENAME 정정 완료로 제거) */
    private static final Set<String> CONSTRAINT_WHITELIST = Set.of(
            "meta_standard_domains_pkey", "meta_standard_terms_pkey", "flyway_schema_history_pk");

    /** 감사컬럼(제8조) 검사 면제 테이블 — 프레임워크/메타 소유 */
    private static final Set<String> AUDIT_EXEMPT_TABLES = TABLE_WHITELIST;

    // 객체 생성 구문 — 라인 단위 매칭
    private static final Pattern CREATE_TABLE = Pattern
            .compile("(?i)\\bCREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:public\\.)?([\"\\w]+)");
    private static final Pattern CREATE_SEQUENCE = Pattern
            .compile("(?i)\\bCREATE\\s+SEQUENCE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:public\\.)?([\"\\w]+)");
    private static final Pattern CREATE_INDEX = Pattern
            .compile("(?i)\\bCREATE\\s+(?:UNIQUE\\s+)?INDEX\\s+(?:CONCURRENTLY\\s+)?(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:public\\.)?([\"\\w]+)");
    // [파서 버그 수정 2026-08-01] `DROP CONSTRAINT IF EXISTS <name>` 는 유효한 PostgreSQL 인데
    //   종전 정규식은 IF 를 제약명으로 오인식해 **거짓 위반**을 냈다(V2_33 에서 실측 3건).
    //   위 CREATE_TABLE/SEQUENCE/INDEX 가 이미 `IF NOT EXISTS` 를 흡수하는 것과 동일한 보완이며,
    //   탐지 범위를 줄이지 않는다 — 오탐만 제거한다(예외 목록 확장이 아님, AGENTS.md Evidence guardrails H2).
    private static final Pattern CONSTRAINT_NAME = Pattern
            .compile("(?i)\\bCONSTRAINT\\s+(?:IF\\s+EXISTS\\s+)?([\"\\w]+)");
    // RENAME CONSTRAINT old TO new — 구명칭은 정정 대상이므로 신명칭(TO 뒤)만 검사
    private static final Pattern RENAME_CONSTRAINT = Pattern
            .compile("(?i)\\bRENAME\\s+CONSTRAINT\\s+[\"\\w]+\\s+TO\\s+([\"\\w]+)");
    // 고정 문자형 금지(제5조 4항) — character varying / varchar 는 허용
    private static final Pattern FIXED_CHAR_TYPE = Pattern
            .compile("(?i)\\b(?:bpchar|char|character)\\s*\\(");
    private static final Pattern CHARACTER_VARYING = Pattern
            .compile("(?i)\\bcharacter\\s+varying\\s*\\(");

    @Test
    @DisplayName("🏛️ Flyway 델타 SQL 스키마 명명·타입 표준 오딧 (DB 헌법 제1·3·5·6·8조)")
    void auditSchemaNamingStandards() throws IOException {
        Path migrationDir = resolveMigrationDir();

        List<String> violations = new ArrayList<>();

        HarnessSourceIndex.filesUnder(migrationDir, p -> p.toString().endsWith(".sql")).stream()
                .filter(p -> !EXCLUDED_FILES.contains(p.getFileName().toString()))
                .sorted()
                .forEach(path -> auditFile(path, violations));

        if (!violations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🏛️ [SCHEMA NAMING LINTER] DB 헌법 명명·타입 표준 위반이 차단되었습니다!\n");
            sb.append("========================================================================\n");
            for (String v : violations) {
                sb.append("❌ ").append(v).append("\n");
            }
            sb.append("\n💡 기준: .agent/knowledge/db-standard-constitution/artifacts/constitution.md (제1·3·5·6·8조)");
            sb.append("\n💡 의도된 예외는 예외 대장(docs/02-architecture/db-naming-exceptions.md) 등재 후");
            sb.append(" 위반 라인 끝에 '-- naming-linter:ignore (사유)' 를 병기하십시오.\n");
            fail(sb.toString());
        } else {
            log.info("✅ 모든 델타 스크립트가 DB 헌법 명명·타입 표준을 준수합니다.");
        }
    }

    private void auditFile(Path path, List<String> violations) {
        String fileName = path.getFileName().toString();
        String raw;
        try {
            raw = HarnessSourceIndex.read(path);
        } catch (IOException e) {
            fail("Failed to read migration file: " + path);
            return;
        }
        // 블록 주석 제거(라인 구조 보존을 위해 개행은 유지) 후 라인 단위 검사
        String noBlockComments = raw.replaceAll("(?s)/\\*.*?\\*/", "");
        String[] lines = noBlockComments.split("\r?\n", -1);

        String pendingTable = null; // 감사컬럼 검사 중인 CREATE TABLE 명
        StringBuilder tableBody = null;

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            String code = stripLineComment(line);
            boolean ignored = line.contains("naming-linter:ignore");

            // CREATE TABLE 본문 수집(제8조 감사컬럼 검사용) — 코드 라인만 축적
            if (pendingTable != null && tableBody != null) {
                tableBody.append(code).append('\n');
                if (code.contains(");")) {
                    checkAuditColumns(fileName, pendingTable, tableBody.toString(), violations);
                    pendingTable = null;
                    tableBody = null;
                }
            }

            if (code.isBlank() || ignored) {
                continue;
            }

            Matcher t = CREATE_TABLE.matcher(code);
            if (t.find()) {
                String name = unquote(t.group(1));
                if (!TABLE_WHITELIST.contains(name) && !SchemaConformanceRules.TABLE_NAME.matcher(name).matches()) {
                    violations.add(String.format(
                            "File [%s:%d]: 테이블명 '%s' — 헌법 제3조 tb_ 접두 + 제1조 소문자 snake_case 위반", fileName, i + 1, name));
                }
                if (!AUDIT_EXEMPT_TABLES.contains(name) && pendingTable == null) {
                    pendingTable = name;
                    tableBody = new StringBuilder(code).append('\n');
                    if (code.contains(");")) { // 한 줄 정의
                        checkAuditColumns(fileName, pendingTable, tableBody.toString(), violations);
                        pendingTable = null;
                        tableBody = null;
                    }
                }
            }

            Matcher s = CREATE_SEQUENCE.matcher(code);
            if (s.find()) {
                String name = unquote(s.group(1));
                if (!SEQUENCE_WHITELIST.contains(name) && !SchemaConformanceRules.SEQUENCE_NAME.matcher(name).matches()) {
                    violations.add(String.format(
                            "File [%s:%d]: 시퀀스명 '%s' — 헌법 제3조 sq_ 접두 위반", fileName, i + 1, name));
                }
            }

            Matcher ix = CREATE_INDEX.matcher(code);
            if (ix.find()) {
                String name = unquote(ix.group(1));
                if (!SchemaConformanceRules.INDEX_NAME.matcher(name).matches()) {
                    violations.add(String.format(
                            "File [%s:%d]: 인덱스명 '%s' — 헌법 제6조 ix_ 접두 위반", fileName, i + 1, name));
                }
            }

            Matcher rn = RENAME_CONSTRAINT.matcher(code);
            if (rn.find()) {
                // 명명 정정 구문: 신명칭만 표준 검사 (구명칭은 정정 대상이라 검사 무의미)
                String newName = unquote(rn.group(1));
                if (!CONSTRAINT_WHITELIST.contains(newName) && !SchemaConformanceRules.CONSTRAINT_NAME.matcher(newName).matches()) {
                    violations.add(String.format(
                            "File [%s:%d]: RENAME 신명칭 '%s' — 헌법 제6조 pk_/fk_/uk_/ck_ 접두 위반",
                            fileName, i + 1, newName));
                }
            } else {
                Matcher c = CONSTRAINT_NAME.matcher(code);
                while (c.find()) {
                    String name = unquote(c.group(1));
                    if (CONSTRAINT_WHITELIST.contains(name)) {
                        continue;
                    }
                    if (!SchemaConformanceRules.CONSTRAINT_NAME.matcher(name).matches()) {
                        violations.add(String.format(
                                "File [%s:%d]: 제약명 '%s' — 헌법 제6조 pk_/fk_/uk_/ck_ 접두 + 소문자 snake_case 위반",
                                fileName, i + 1, name));
                    }
                }
            }

            // 제5조 4항: 고정 문자형 char 전면 금지 (character varying 은 허용)
            String withoutVarying = CHARACTER_VARYING.matcher(code).replaceAll("");
            if (FIXED_CHAR_TYPE.matcher(withoutVarying).find()) {
                violations.add(String.format(
                        "File [%s:%d]: 고정 문자형(char/bpchar) 사용 — 헌법 제5조 4항 전면 금지, varchar 로 대체하십시오. 라인: '%s'",
                        fileName, i + 1, line.trim()));
            }
        }
    }

    /** 제8조 감사컬럼 규칙. 규칙 본문은 벤더 카탈로그 시험과 같다. */
    private void checkAuditColumns(String fileName, String tableName, String body, List<String> violations) {
        SchemaConformanceRules.auditColumnProblems(tableName, body::contains)
                .forEach(problem -> violations.add(String.format("File [%s]: %s", fileName, problem)));
    }

    /**
     * [P4 게이트 무결성] Gradle 테스트 JVM 의 workingDir 이 루트 프로젝트로 잡히는 환경에서
     * 상대경로가 해석되지 않아 린터가 "조용히 skip" 되던 false-green 결함의 방지책.
     * 모듈 기준·루트 기준 두 경로를 순차 해석하고, 둘 다 없으면 게이트 파손으로 간주해 즉시 실패한다.
     */
    static Path resolveMigrationDir() {
        Path fromModule = Paths.get(MIGRATION_PATH);
        if (Files.exists(fromModule)) {
            return fromModule;
        }
        Path fromRoot = Paths.get("api-server", MIGRATION_PATH);
        if (Files.exists(fromRoot)) {
            return fromRoot;
        }
        fail("게이트 무결성 파손: 마이그레이션 디렉토리를 찾을 수 없습니다 (workingDir="
                + Paths.get("").toAbsolutePath() + "). 조용한 skip 은 false-green 을 만들므로 실패 처리합니다.");
        return fromModule; // unreachable
    }

    private static String stripLineComment(String line) {
        int idx = line.indexOf("--");
        return idx >= 0 ? line.substring(0, idx) : line;
    }

    private static String unquote(String name) {
        return name.replace("\"", "").toLowerCase();
    }
}
