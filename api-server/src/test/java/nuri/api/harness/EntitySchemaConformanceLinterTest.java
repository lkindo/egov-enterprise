package nuri.api.harness;

import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embedded;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;

import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🧬 엔티티 ↔ 물리 스키마 정합 린터 — "그린 ≠ 안전" 의 구조적 원인을 제거한다.
 *
 * <p>[근거] 2026-07-26 사고: 엔티티 69종에 {@code @GeneratedValue(UUID)} 가 일괄 부착됐고
 * <b>컴파일·테스트가 모두 그린</b>이었다. 36자 UUID 를 {@code character varying(7)} PK 에 넣는 변경인데도
 * 검출되지 않은 이유는 구조적이다 — 테스트 프로파일이 <b>H2 + {@code ddl-auto: create-drop}</b> 이라
 * Hibernate 가 엔티티 정의대로 스키마를 새로 만든다. 즉 <b>테스트는 운영 스키마를 본 적이 없다.</b>
 *
 * <p>이 린터는 <b>Flyway 델타를 정적으로 재생(replay)</b>해 유효 스키마를 구성하고, 엔티티 매핑과 대조한다.
 * DB 연결·Docker 없이 결정론적으로 동작하므로 pre-push 에서 돌릴 수 있다(§0.7-H5).
 * 라이브 DB 와 마이그레이션의 괴리는 별개 문제이며 Flyway validate 의 영역이다 — 여기서는
 * <b>저장소가 선언한 스키마</b>를 기준으로 삼는다.
 *
 * <p>검사 항목
 * <ol>
 *   <li><b>PK 전략 적합성</b> — {@code @GeneratedValue}(UUID/IDENTITY/SEQUENCE) 가 물리 컬럼 타입·길이에
 *       수용되는가. <i>사고를 직접 잡는 규칙이다.</i></li>
 *   <li><b>길이 초과</b> — {@code @Column(length=N)} 이 물리 {@code varchar(M)} 보다 큰 경우(N&gt;M):
 *       런타임 {@code value too long} 위험</li>
 *   <li><b>부재</b> — 매핑된 테이블/컬럼이 마이그레이션에 존재하지 않음</li>
 * </ol>
 *
 * <p>기존 드리프트는 {@link #KNOWN_DRIFT} 로 동결하고 신규 유입만 차단한다(하네스 관행).
 * 이 목록의 편집은 {@code HarnessBaselineIntegrityTest} 매니페스트에 다시 잡힌다.
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 테스트(SQL 파싱 + 클래스패스 스캔·리플렉션).
 */
class EntitySchemaConformanceLinterTest {

    private static final Logger log = LoggerFactory.getLogger(EntitySchemaConformanceLinterTest.class);

    private static final String MIGRATION_PATH = "src/main/resources/db/migration";
    private static final String ENTITY_SCAN_BASE = "nuri";

    /**
     * [동결 베이스라인] 린터 최초 실행 census 로 확인된 기존 드리프트. <b>신규 추가 금지</b> —
     * 신규 매핑은 물리 스키마와 일치시키거나 마이그레이션을 추가한다.
     * 형식: {@code 엔티티#필드:사유코드}
     */
    private static final Set<String> KNOWN_DRIFT = new TreeSet<>(Arrays.asList(
            // 최초 실행 census 로 채운다.
            ));

    // ── SQL 파서 패턴 ────────────────────────────────────────────────────────────
    private static final Pattern CREATE_TABLE = Pattern.compile(
            "(?is)^\\s*CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:public\\.)?\"?(\\w+)\"?\\s*\\((.*)\\)\\s*$");
    private static final Pattern DROP_TABLE = Pattern.compile(
            "(?is)^\\s*DROP\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?(?:public\\.)?\"?(\\w+)\"?");
    private static final Pattern ALTER_TABLE = Pattern.compile(
            "(?is)^\\s*ALTER\\s+TABLE\\s+(?:ONLY\\s+)?(?:IF\\s+EXISTS\\s+)?(?:public\\.)?\"?(\\w+)\"?\\s+(.*)$");
    private static final Pattern ADD_COLUMN = Pattern.compile(
            "(?is)^ADD\\s+COLUMN\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?\"?(\\w+)\"?\\s+(.+)$");
    private static final Pattern DROP_COLUMN = Pattern.compile(
            "(?is)^DROP\\s+COLUMN\\s+(?:IF\\s+EXISTS\\s+)?\"?(\\w+)\"?");
    private static final Pattern ALTER_COLUMN_TYPE = Pattern.compile(
            "(?is)^ALTER\\s+COLUMN\\s+\"?(\\w+)\"?\\s+(?:SET\\s+DATA\\s+)?TYPE\\s+([^,]+?)(?:\\s+USING\\s+.*)?$");
    private static final Pattern RENAME_COLUMN = Pattern.compile(
            "(?is)^RENAME\\s+COLUMN\\s+\"?(\\w+)\"?\\s+TO\\s+\"?(\\w+)\"?");
    private static final Pattern RENAME_TABLE = Pattern.compile(
            "(?is)^RENAME\\s+TO\\s+\"?(\\w+)\"?");
    /** {@code character varying(20)} / {@code varchar(20)} / {@code numeric(2)} 등 */
    private static final Pattern TYPE_LEN = Pattern.compile("\\((\\d+)(?:\\s*,\\s*\\d+)?\\)");
    /** 멱등 래퍼 {@code DO $tag$ … $tag$} — 본문에 실제 컬럼 DDL 이 들어 있다 */
    private static final Pattern DO_BLOCK = Pattern.compile("(?is)^\\s*DO\\s+\\$(\\w*)\\$(.*)\\$\\1\\$\\s*$");
    /** PL/pgSQL 제어문({@code IF … THEN}, {@code EXECUTE '…'}) 뒤에 붙은 DDL 시작 지점 */
    private static final Pattern INNER_DDL_START = Pattern.compile("(?is)\\b(?:ALTER|CREATE|DROP)\\s+TABLE\\b");
    /** 달러 인용 여는 태그 {@code $$} / {@code $tag$} */
    private static final Pattern DOLLAR_TAG = Pattern.compile("\\$\\w*\\$");

    private static final int VARCHAR_UNBOUNDED = Integer.MAX_VALUE;
    /** {@code @Column} 의 length 기본값 — 명시 여부를 구분할 수 없으므로 길이 검사에서 제외 */
    private static final int JPA_DEFAULT_LENGTH = 255;

    @Test
    @DisplayName("🧬 엔티티 매핑 ↔ Flyway 물리 스키마 정합 — PK 전략 적합성·길이 초과·부재 차단 (§0.7-H1)")
    void auditEntityMappingMatchesPhysicalSchema() throws IOException {
        Map<String, Map<String, String>> schema = replayMigrations();

        // 게이트 무결성(false-green 방지): 파싱이 조용히 붕괴하면 모든 대조가 무의미해진다
        if (schema.size() < 50) {
            fail("게이트 무결성 파손: 마이그레이션 재생 결과 테이블 수(" + schema.size() + ")가 예상 하한(50) 미만 — SQL 파서/경로 파손 의심.");
        }

        List<String> violations = new ArrayList<>();
        int entities = 0;
        int checkedColumns = 0;

        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(Entity.class));
        for (var bd : scanner.findCandidateComponents(ENTITY_SCAN_BASE)) {
            Class<?> clazz;
            try {
                clazz = Class.forName(bd.getBeanClassName());
            } catch (ClassNotFoundException | NoClassDefFoundError ex) {
                log.warn("[EntitySchemaLinter] 엔티티 로드 실패(스캔 제외): {}", bd.getBeanClassName());
                continue;
            }
            entities++;

            String table = tableNameOf(clazz);
            Map<String, String> columns = schema.get(table);
            if (columns == null) {
                violations.add(String.format("%s → 물리 테이블 '%s' 없음 — 마이그레이션 누락 또는 @Table 오타",
                        clazz.getSimpleName(), table));
                continue;
            }

            for (Field field : persistentFields(clazz)) {
                String column = columnNameOf(field);
                String physicalType = columns.get(column);
                String key = clazz.getSimpleName() + "#" + field.getName();

                if (physicalType == null) {
                    if (!KNOWN_DRIFT.contains(key + ":missing-column")) {
                        violations.add(String.format("%s → %s.%s 물리 컬럼 없음 (필드 %s)",
                                clazz.getSimpleName(), table, column, field.getName()));
                    }
                    continue;
                }
                checkedColumns++;

                // ① PK 전략 적합성 — 사고를 직접 잡는 규칙
                GeneratedValue gv = field.getAnnotation(GeneratedValue.class);
                if (field.isAnnotationPresent(Id.class) && gv != null) {
                    String problem = pkStrategyProblem(gv.strategy(), field, physicalType);
                    if (problem != null && !KNOWN_DRIFT.contains(key + ":pk-strategy")) {
                        violations.add(String.format("%s → %s.%s [PK 전략 부적합] %s (물리: %s)",
                                clazz.getSimpleName(), table, column, problem, physicalType));
                    }
                }

                // ② 길이 초과 — 엔티티가 물리보다 길면 런타임 'value too long'
                Column col = field.getAnnotation(Column.class);
                if (col != null && col.length() != JPA_DEFAULT_LENGTH && field.getType() == String.class) {
                    int physicalLen = lengthOf(physicalType);
                    if (col.length() > physicalLen && !KNOWN_DRIFT.contains(key + ":length")) {
                        violations.add(String.format("%s → %s.%s [길이 초과] 엔티티 length=%d > 물리 %s",
                                clazz.getSimpleName(), table, column, col.length(), physicalType));
                    }
                }
            }
        }

        if (entities < 20 || checkedColumns < 200) {
            fail("게이트 무결성 파손: 엔티티 " + entities + "종 / 대조 컬럼 " + checkedColumns
                    + "건 — 스캔 파손 의심(예상 하한 20종·200건).");
        }

        if (!violations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🧬 [ENTITY↔SCHEMA LINTER] 엔티티 매핑과 물리 스키마의 불일치가 차단되었습니다!\n");
            sb.append("========================================================================\n");
            violations.stream().sorted().forEach(v -> sb.append("❌ ").append(v).append("\n"));
            sb.append("\n💡 테스트 그린은 안전의 증거가 아닙니다 — 테스트 프로파일(H2 + create-drop)은 엔티티 정의대로\n");
            sb.append("   스키마를 새로 만들기 때문에 운영 PostgreSQL 과의 불일치를 원리적으로 검출하지 못합니다.\n");
            sb.append("   해소: ① 매핑을 물리 스키마에 맞추거나 ② Flyway 델타를 추가해 물리 스키마를 바꾸십시오.\n");
            sb.append("   (GEMINI.md §0.7-H1 — db-bridge 실측 결과를 증적으로 제시할 것)\n");
            fail(sb.toString());
        }

        log.info("✅ 엔티티↔물리 스키마 정합 OK — 테이블 {}개 재생, 엔티티 {}종 / 컬럼 {}건 대조(동결 {}건).",
                schema.size(), entities, checkedColumns, KNOWN_DRIFT.size());
    }

    // ── 마이그레이션 재생 ────────────────────────────────────────────────────────

    /** {@code 테이블 -> (컬럼 -> 타입)} — V* 델타를 버전 순으로 적용한 유효 스키마 */
    private Map<String, Map<String, String>> replayMigrations() throws IOException {
        Path dir = resolveMigrationDir();
        List<Path> files;
        try (Stream<Path> paths = Files.walk(dir)) {
            files = paths.filter(Files::isRegularFile)
                    .filter(p -> p.getFileName().toString().matches("V\\d+_\\d+__.*\\.sql"))
                    .sorted(Comparator.comparing(EntitySchemaConformanceLinterTest::versionKey))
                    .collect(Collectors.toList());
        }
        if (files.size() < 20) {
            fail("게이트 무결성 파손: 마이그레이션 파일 " + files.size() + "건 — 경로/명명 파손 의심 (" + dir.toAbsolutePath() + ").");
        }

        Map<String, Map<String, String>> schema = new TreeMap<>();
        for (Path file : files) {
            String sql = Files.readString(file, StandardCharsets.UTF_8);
            for (String stmt : splitStatements(stripSqlComments(sql))) {
                applyStatement(schema, stmt);
            }
        }
        return schema;
    }

    private static void applyStatement(Map<String, Map<String, String>> schema, String stmt) {
        String s = stmt.trim();
        if (s.isEmpty()) {
            return;
        }
        // 멱등 래퍼 DO $$ … $$ 안에도 실제 컬럼 DDL 이 들어 있다(ADD/DROP/RENAME COLUMN, ALTER COLUMN TYPE).
        // 통째로 건너뛰면 재생 스키마가 조용히 틀려져 대조 자체가 거짓이 되므로 본문을 파고든다.
        Matcher dollar = DO_BLOCK.matcher(s);
        if (dollar.find()) {
            for (String inner : splitStatements(dollar.group(2))) {
                Matcher ddl = INNER_DDL_START.matcher(inner);
                if (ddl.find()) {
                    applyStatement(schema, inner.substring(ddl.start()).replaceAll("'\\s*$", ""));
                }
            }
            return;
        }
        Matcher ct = CREATE_TABLE.matcher(s);
        if (ct.find()) {
            Map<String, String> cols = schema.computeIfAbsent(ct.group(1).toLowerCase(Locale.ROOT),
                    k -> new LinkedHashMap<>());
            for (String part : splitTopLevel(ct.group(2))) {
                String def = part.trim();
                if (def.isEmpty()) {
                    continue;
                }
                String first = def.split("\\s+")[0].replace("\"", "").toUpperCase(Locale.ROOT);
                if (Set.of("CONSTRAINT", "PRIMARY", "UNIQUE", "FOREIGN", "CHECK", "EXCLUDE", "LIKE").contains(first)) {
                    continue;
                }
                int sp = def.indexOf(' ');
                if (sp > 0) {
                    cols.put(def.substring(0, sp).replace("\"", "").toLowerCase(Locale.ROOT),
                            def.substring(sp + 1).trim());
                }
            }
            return;
        }
        Matcher dt = DROP_TABLE.matcher(s);
        if (dt.find()) {
            schema.remove(dt.group(1).toLowerCase(Locale.ROOT));
            return;
        }
        Matcher at = ALTER_TABLE.matcher(s);
        if (at.find()) {
            String table = at.group(1).toLowerCase(Locale.ROOT);
            Map<String, String> cols = schema.get(table);
            if (cols == null) {
                return; // 미지 테이블(메타/프레임워크) — 대조 대상 아님
            }
            for (String action : splitTopLevel(at.group(2))) {
                applyAlterAction(schema, table, cols, action.trim());
            }
        }
    }

    private static void applyAlterAction(Map<String, Map<String, String>> schema, String table,
                                         Map<String, String> cols, String action) {
        Matcher m = ADD_COLUMN.matcher(action);
        if (m.find()) {
            cols.put(m.group(1).toLowerCase(Locale.ROOT), m.group(2).trim());
            return;
        }
        m = DROP_COLUMN.matcher(action);
        if (m.find()) {
            cols.remove(m.group(1).toLowerCase(Locale.ROOT));
            return;
        }
        m = ALTER_COLUMN_TYPE.matcher(action);
        if (m.find()) {
            cols.put(m.group(1).toLowerCase(Locale.ROOT), m.group(2).trim());
            return;
        }
        m = RENAME_COLUMN.matcher(action);
        if (m.find()) {
            String old = m.group(1).toLowerCase(Locale.ROOT);
            if (cols.containsKey(old)) {
                cols.put(m.group(2).toLowerCase(Locale.ROOT), cols.remove(old));
            }
            return;
        }
        m = RENAME_TABLE.matcher(action);
        if (m.find()) {
            schema.put(m.group(1).toLowerCase(Locale.ROOT), schema.remove(table));
        }
    }

    /** {@code V2_10__x.sql} → 정렬 키(major*10000+minor) */
    private static Integer versionKey(Path p) {
        Matcher m = Pattern.compile("V(\\d+)_(\\d+)__").matcher(p.getFileName().toString());
        return m.find() ? Integer.parseInt(m.group(1)) * 10000 + Integer.parseInt(m.group(2)) : 0;
    }

    /** {@code --} 라인 주석과 블록 주석 제거(문자열 리터럴 내부는 보존) */
    private static String stripSqlComments(String sql) {
        StringBuilder out = new StringBuilder(sql.length());
        int i = 0;
        while (i < sql.length()) {
            char c = sql.charAt(i);
            if (c == '\'') {
                int j = i + 1;
                while (j < sql.length() && sql.charAt(j) != '\'') {
                    j++;
                }
                out.append(sql, i, Math.min(j + 1, sql.length()));
                i = j + 1;
                continue;
            }
            if (c == '-' && i + 1 < sql.length() && sql.charAt(i + 1) == '-') {
                while (i < sql.length() && sql.charAt(i) != '\n') {
                    i++;
                }
                continue;
            }
            if (c == '/' && i + 1 < sql.length() && sql.charAt(i + 1) == '*') {
                int close = sql.indexOf("*/", i + 2);
                i = (close < 0) ? sql.length() : close + 2;
                out.append(' ');
                continue;
            }
            out.append(c);
            i++;
        }
        return out.toString();
    }

    /** 세미콜론 기준 문장 분해(괄호·문자열 리터럴 내부 무시) */
    private static List<String> splitStatements(String sql) {
        List<String> out = new ArrayList<>();
        int depth = 0;
        StringBuilder cur = new StringBuilder();
        for (int i = 0; i < sql.length(); i++) {
            char c = sql.charAt(i);
            if (c == '\'') {
                int j = i + 1;
                while (j < sql.length() && sql.charAt(j) != '\'') {
                    j++;
                }
                cur.append(sql, i, Math.min(j + 1, sql.length()));
                i = j;
                continue;
            }
            // 달러 인용($tag$ … $tag$) 은 통째로 보존 — 내부 세미콜론에서 잘리면 DO 블록이 파편화된다
            if (c == '$') {
                Matcher tag = DOLLAR_TAG.matcher(sql).region(i, sql.length());
                if (tag.lookingAt()) {
                    String close = tag.group();
                    int end = sql.indexOf(close, tag.end());
                    int stop = (end < 0) ? sql.length() : end + close.length();
                    cur.append(sql, i, stop);
                    i = stop - 1;
                    continue;
                }
            }
            if (c == '(') {
                depth++;
            } else if (c == ')') {
                depth--;
            } else if (c == ';' && depth <= 0) {
                out.add(cur.toString());
                cur.setLength(0);
                continue;
            }
            cur.append(c);
        }
        out.add(cur.toString());
        return out;
    }

    /** 최상위 콤마 분리(괄호 내부 무시) */
    private static List<String> splitTopLevel(String body) {
        List<String> out = new ArrayList<>();
        int depth = 0;
        StringBuilder cur = new StringBuilder();
        for (int i = 0; i < body.length(); i++) {
            char c = body.charAt(i);
            if (c == '(') {
                depth++;
            } else if (c == ')') {
                depth--;
            } else if (c == ',' && depth == 0) {
                out.add(cur.toString());
                cur.setLength(0);
                continue;
            }
            cur.append(c);
        }
        out.add(cur.toString());
        return out;
    }

    // ── 엔티티 매핑 ──────────────────────────────────────────────────────────────

    private static String tableNameOf(Class<?> clazz) {
        Table t = clazz.getAnnotation(Table.class);
        if (t != null && !t.name().isBlank()) {
            return t.name().toLowerCase(Locale.ROOT);
        }
        return toSnakeCase(clazz.getSimpleName());
    }

    private static String columnNameOf(Field field) {
        Column c = field.getAnnotation(Column.class);
        if (c != null && !c.name().isBlank()) {
            return c.name().toLowerCase(Locale.ROOT);
        }
        JoinColumn jc = field.getAnnotation(JoinColumn.class);
        if (jc != null && !jc.name().isBlank()) {
            return jc.name().toLowerCase(Locale.ROOT);
        }
        return toSnakeCase(field.getName());
    }

    /** Spring Boot 기본 물리 명명 전략(CamelCaseToUnderscoresNamingStrategy)과 동일 */
    private static String toSnakeCase(String name) {
        return name.replaceAll("([a-z0-9])([A-Z])", "$1_$2").toLowerCase(Locale.ROOT);
    }

    /** 컬럼으로 매핑되는 필드만 — 연관·임베디드·정적/transient 는 v1 범위 밖 */
    private static List<Field> persistentFields(Class<?> clazz) {
        List<Field> fields = new ArrayList<>();
        for (Class<?> c = clazz; c != null && c != Object.class; c = c.getSuperclass()) {
            for (Field f : c.getDeclaredFields()) {
                if (Modifier.isStatic(f.getModifiers()) || Modifier.isTransient(f.getModifiers())) {
                    continue;
                }
                if (f.isAnnotationPresent(Transient.class)
                        || f.isAnnotationPresent(OneToMany.class) || f.isAnnotationPresent(ManyToMany.class)
                        || f.isAnnotationPresent(ManyToOne.class) || f.isAnnotationPresent(OneToOne.class)
                        || f.isAnnotationPresent(Embedded.class) || f.isAnnotationPresent(EmbeddedId.class)
                        || f.isAnnotationPresent(ElementCollection.class)) {
                    continue;
                }
                fields.add(f);
            }
        }
        return fields;
    }

    /** PK 생성 전략이 물리 타입에 수용되는지 — 부적합하면 사유, 적합하면 null */
    private static String pkStrategyProblem(GenerationType strategy, Field field, String physicalType) {
        String type = physicalType.toLowerCase(Locale.ROOT);
        boolean numeric = type.startsWith("int") || type.startsWith("bigint") || type.startsWith("smallint")
                || type.startsWith("serial") || type.startsWith("bigserial") || type.startsWith("numeric")
                || type.startsWith("decimal");
        boolean uuidType = type.startsWith("uuid");
        int len = lengthOf(physicalType);

        boolean uuidLike = strategy == GenerationType.UUID
                || (strategy == GenerationType.AUTO && field.getType() == String.class);
        if (uuidLike) {
            if (uuidType) {
                return null;
            }
            if (len < 36) {
                return "UUID(36자)를 수용할 수 없음 — 물리 길이 " + (len == VARCHAR_UNBOUNDED ? "무제한" : len);
            }
            return null;
        }
        if (strategy == GenerationType.IDENTITY || strategy == GenerationType.SEQUENCE) {
            return numeric ? null : "IDENTITY/SEQUENCE 는 숫자형 PK 를 요구함";
        }
        return numeric || uuidType || len >= 36 ? null : "AUTO 전략이 물리 타입과 맞지 않음";
    }

    /** {@code character varying(20)} → 20, 길이 없는 타입 → 무제한 */
    private static int lengthOf(String physicalType) {
        Matcher m = TYPE_LEN.matcher(physicalType);
        return m.find() ? Integer.parseInt(m.group(1)) : VARCHAR_UNBOUNDED;
    }

    private static Path resolveMigrationDir() {
        Path fromModule = Paths.get(MIGRATION_PATH);
        if (Files.exists(fromModule)) {
            return fromModule;
        }
        Path fromRoot = Paths.get("api-server", MIGRATION_PATH);
        if (Files.exists(fromRoot)) {
            return fromRoot;
        }
        fail("게이트 무결성 파손: 마이그레이션 디렉토리를 찾을 수 없습니다 (workingDir="
                + Paths.get("").toAbsolutePath() + "). 조용한 skip 은 false-green 을 만듭니다.");
        return fromModule; // unreachable
    }
}
