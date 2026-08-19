package nuri.api.harness;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;

import java.io.IOException;
import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🔗 UNIQUE ↔ JPA @Table(uniqueConstraints) 미러 정합 린터 — SSOT 전파(계약체인) 기계 강제.
 *
 * <p>마이그레이션의 UNIQUE 제약이 <b>대응 @Entity 에 JPA 레벨로 미러링</b>
 * 되어 있는지 정적 검증하여, 새 UNIQUE 추가 시 엔티티 미러 누락이 침묵 드리프트 되는 것을 배포 전에 차단한다.
 *
 * <p>검사 원칙: <b>엔티티가 매핑된 테이블</b>(@Table(name) 일치)에 걸린 DB UNIQUE 만 검사한다.
 * 매핑 엔티티가 없는 테이블(메타 사전·시퀀스 브로커·고아/뷰 테이블)은 JPA 미러 대상이 아니므로 자연 제외된다
 * (화이트리스트 불요). 엔티티의 미러로 인정되는 형태는 세 가지다:
 * <ol>
 *   <li>{@code @Table(uniqueConstraints=@UniqueConstraint(columnNames={...}))} — 명명/다중컬럼 미러</li>
 *   <li>단일 컬럼 {@code @Column(unique=true)} — Hibernate 가 유니크를 생성하는 컬럼레벨 미러</li>
 *   <li>PK 컬럼셋({@code @Id}) 과 동일 — PK 로 이미 유일성 보장(PK 중복 UNIQUE 면제)</li>
 * </ol>
 *
 * <p>이 린터는 Spring 컨텍스트를 띄우지 않는 순수 정적 테스트다(엔티티는 클래스패스 스캔·리플렉션).
 */
@Tag("governance-harness")
class UniqueConstraintMirrorLinterTest {

    private static final Logger log = LoggerFactory.getLogger(UniqueConstraintMirrorLinterTest.class);
    private static final String MIGRATION_PATH = "src/main/resources/db/migration";
    private static final String ENTITY_SCAN_BASE = "nuri.business";

    // ADD CONSTRAINT <name> UNIQUE (<cols>)  — ALTER TABLE ... ADD CONSTRAINT ... UNIQUE (...)
    private static final Pattern ADD_UNIQUE = Pattern.compile(
            "(?is)ALTER\\s+TABLE\\s+(?:ONLY\\s+)?(?:public\\.)?([\"\\w]+).*?ADD\\s+CONSTRAINT\\s+[\"\\w]+\\s+UNIQUE\\s*\\(([^)]+)\\)");
    // CREATE UNIQUE INDEX <name> ON <table> (<cols>)  — 부분 UNIQUE(WHERE) 는 별도 처리(면제)
    private static final Pattern CREATE_UNIQUE_INDEX = Pattern.compile(
            "(?is)CREATE\\s+UNIQUE\\s+INDEX\\s+(?:CONCURRENTLY\\s+)?(?:IF\\s+NOT\\s+EXISTS\\s+)?[\"\\w]+\\s+ON\\s+(?:public\\.)?([\"\\w]+)[^(]*\\(([^)]+)\\)");
    // ALTER TABLE <table> DROP COLUMN [IF EXISTS] <column> — 사라진 컬럼의 과거 UNIQUE를 최종 상태에서 제거
    private static final Pattern DROP_COLUMN = Pattern.compile(
            "(?is)ALTER\\s+TABLE\\s+(?:ONLY\\s+)?(?:public\\.)?([\"\\w]+).*?DROP\\s+COLUMN\\s+(?:IF\\s+EXISTS\\s+)?([\"\\w]+)");

    @Test
    @DisplayName("🔗 DB UNIQUE ↔ 엔티티 @Table/@Column/@Id 미러 정합 오딧 (SSOT 계약체인)")
    void auditUniqueConstraintMirroring() throws IOException {
        // 1) 마이그레이션에서 테이블별 UNIQUE 컬럼셋 수집
        Map<String, List<Set<String>>> dbUniques = collectDbUniqueColumnSets();

        // 2) @Entity 리플렉션 → 테이블별 미러 컬럼셋 수집
        Map<String, EntityMirror> entityMirrors = collectEntityMirrors();

        // 게이트 무결성(false-green 방지): 파서/스캔이 조용히 0건을 반환하면 vacuous 통과가 되므로 차단
        if (dbUniques.isEmpty()) {
            fail("게이트 무결성 파손: 마이그레이션에서 UNIQUE 제약을 하나도 찾지 못했습니다 — 파서/경로 파손 의심.");
        }
        if (entityMirrors.isEmpty()) {
            fail("게이트 무결성 파손: @Entity 를 하나도 스캔하지 못했습니다(scanBase=" + ENTITY_SCAN_BASE + ") — 스캔/클래스패스 파손 의심.");
        }

        // 3) 엔티티가 매핑된 테이블의 UNIQUE 만 검사
        List<String> violations = new ArrayList<>();
        int checked = 0;
        for (Map.Entry<String, List<Set<String>>> e : dbUniques.entrySet()) {
            String table = e.getKey();
            EntityMirror mirror = entityMirrors.get(table);
            if (mirror == null) {
                // 매핑 엔티티 없음 — JPA 미러 대상 아님(메타/브로커/고아/뷰). 자연 제외.
                continue;
            }
            for (Set<String> uniqueCols : e.getValue()) {
                checked++;
                if (!mirror.satisfies(uniqueCols)) {
                    violations.add(String.format(
                            "테이블 '%s' UNIQUE %s — 엔티티 %s 에 JPA 미러 없음. "
                                    + "@Table(uniqueConstraints=@UniqueConstraint(columnNames={%s})) 또는 단일컬럼 @Column(unique=true) 로 미러하십시오. "
                                    + "(현재 엔티티 미러: @Table=%s, @Column(unique)=%s, PK=%s)",
                            table, uniqueCols, mirror.entityClass,
                            uniqueCols.stream().map(c -> '"' + c + '"').collect(Collectors.joining(", ")),
                            mirror.tableUniqueSets, mirror.singleUniqueColumns, mirror.idColumns));
                }
            }
        }

        // 게이트 무결성: 알려진 엔티티-매핑 UNIQUE(RefreshToken/User/FileDetail/OnlinePollResult/Board/OnlineManual ≈6)가
        // 실제로 검사됐는지 하한으로 확인 — 테이블명 매칭이 전부 빗나가 vacuous 통과하는 것을 차단.
        if (checked < 4) {
            fail("게이트 무결성 파손: 엔티티-매핑 UNIQUE 검사 건수(" + checked + ")가 예상 하한(4) 미만 — "
                    + "@Table(name) ↔ DB 테이블명 매칭 실패/파서 파손 의심(false-green 방지). DB uniques=" + dbUniques.keySet());
        }

        if (!violations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🔗 [UNIQUE MIRROR LINTER] DB UNIQUE 제약의 JPA 미러 누락이 감지되었습니다!\n");
            sb.append("========================================================================\n");
            for (String v : violations) {
                sb.append("❌ ").append(v).append("\n");
            }
            sb.append("\n💡 DB 에만 존재하는 불변식은\n");
            sb.append("   엔티티/애플리케이션에서 인지되지 않아 계약체인 드리프트를 만듭니다. UNIQUE 는 엔티티에도 미러하십시오.\n");
            fail(sb.toString());
        } else {
            log.info("✅ 엔티티 매핑 테이블의 모든 DB UNIQUE 가 JPA 레벨로 미러링되어 있습니다.");
        }
    }

    // ---- 마이그레이션 파싱 ------------------------------------------------------------

    private Map<String, List<Set<String>>> collectDbUniqueColumnSets() throws IOException {
        Path migrationDir = resolveMigrationDir();
        Map<String, List<Set<String>>> result = new HashMap<>();
        List<Path> files = HarnessSourceIndex.filesUnder(migrationDir, p -> p.toString().endsWith(".sql"))
                .stream().sorted().collect(Collectors.toList());
        for (Path p : files) {
            String sql = stripComments(HarnessSourceIndex.read(p));
            // 문장(;) 단위로 분리해 매칭 — ALTER TABLE ↔ ADD CONSTRAINT 의 DOTALL 매칭이
            // 다른 문장으로 새어나가 테이블↔UNIQUE 오귀속되는 것을 방지.
            for (String stmt : sql.split(";")) {
                addMatches(ADD_UNIQUE, stmt, result);
                addMatches(CREATE_UNIQUE_INDEX, stmt, result);
                removeDroppedColumnUniques(stmt, result);
            }
        }
        return result;
    }

    private void removeDroppedColumnUniques(String sql, Map<String, List<Set<String>>> result) {
        Matcher matcher = DROP_COLUMN.matcher(sql);
        while (matcher.find()) {
            String table = unquote(matcher.group(1));
            String column = unquote(matcher.group(2));
            result.computeIfPresent(table, (ignored, uniqueSets) -> {
                uniqueSets.removeIf(columns -> columns.contains(column));
                return uniqueSets;
            });
        }
    }

    private void addMatches(Pattern pattern, String sql, Map<String, List<Set<String>>> result) {
        Matcher m = pattern.matcher(sql);
        while (m.find()) {
            String table = unquote(m.group(1));
            Set<String> cols = parseColumns(m.group(2));
            if (cols.isEmpty()) {
                continue;
            }
            result.computeIfAbsent(table, k -> new ArrayList<>()).add(cols);
        }
    }

    private static Set<String> parseColumns(String raw) {
        // "col_a, col_b DESC" 등 정렬수식어 제거 후 컬럼명만 — 정렬무시 비교 위해 TreeSet
        Set<String> cols = new TreeSet<>();
        for (String part : raw.split(",")) {
            String c = part.trim().split("\\s+")[0]; // ASC/DESC/opclass 제거
            c = unquote(c);
            if (!c.isEmpty()) {
                cols.add(c);
            }
        }
        return cols;
    }

    // ---- 엔티티 리플렉션 --------------------------------------------------------------

    private Map<String, EntityMirror> collectEntityMirrors() {
        Map<String, EntityMirror> mirrors = new HashMap<>();
        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(Entity.class));
        scanner.findCandidateComponents(ENTITY_SCAN_BASE).forEach(bd -> {
            String className = bd.getBeanClassName();
            try {
                Class<?> clazz = Class.forName(className);
                Table table = clazz.getAnnotation(Table.class);
                if (table == null || table.name().isBlank()) {
                    return; // 물리 테이블명 미상 — 검사 불가(엔티티는 대부분 @Table(name) 보유)
                }
                String tableName = unquote(table.name());
                EntityMirror mirror = new EntityMirror(clazz.getSimpleName());

                for (UniqueConstraint uc : table.uniqueConstraints()) {
                    Set<String> set = new TreeSet<>();
                    for (String col : uc.columnNames()) {
                        set.add(unquote(col));
                    }
                    if (!set.isEmpty()) {
                        mirror.tableUniqueSets.add(set);
                    }
                }

                for (Field f : allFields(clazz)) {
                    Column col = f.getAnnotation(Column.class);
                    String colName = resolveColumnName(f, col);
                    if (col != null && col.unique()) {
                        mirror.singleUniqueColumns.add(colName);
                    }
                    if (f.isAnnotationPresent(Id.class)) {
                        mirror.idColumns.add(colName);
                    }
                }
                mirrors.put(tableName, mirror);
            } catch (ClassNotFoundException | NoClassDefFoundError ex) {
                log.warn("[UniqueMirrorLinter] 엔티티 로드 실패(스캔 제외): {} ({})", className, ex.getMessage());
            }
        });
        return mirrors;
    }

    private static List<Field> allFields(Class<?> clazz) {
        List<Field> fields = new ArrayList<>();
        for (Class<?> c = clazz; c != null && c != Object.class; c = c.getSuperclass()) {
            fields.addAll(Arrays.asList(c.getDeclaredFields()));
        }
        return fields;
    }

    /** @Column(name) 우선, 없으면 필드명 camelCase→snake_case (Spring 물리 명명 전략 기본값). */
    private static String resolveColumnName(Field f, Column col) {
        if (col != null && !col.name().isBlank()) {
            return unquote(col.name());
        }
        return camelToSnake(f.getName());
    }

    static String camelToSnake(String name) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < name.length(); i++) {
            char ch = name.charAt(i);
            if (Character.isUpperCase(ch)) {
                if (i > 0) {
                    sb.append('_');
                }
                sb.append(Character.toLowerCase(ch));
            } else {
                sb.append(ch);
            }
        }
        return sb.toString();
    }

    private static final class EntityMirror {
        final String entityClass;
        final Set<Set<String>> tableUniqueSets = new LinkedHashSet<>();
        final Set<String> singleUniqueColumns = new HashSet<>();
        final Set<String> idColumns = new TreeSet<>();

        EntityMirror(String entityClass) {
            this.entityClass = entityClass;
        }

        boolean satisfies(Set<String> dbUniqueCols) {
            // 1) @Table(uniqueConstraints) 컬럼셋과 정확 일치
            if (tableUniqueSets.contains(dbUniqueCols)) {
                return true;
            }
            // 2) 단일컬럼 UNIQUE 이고 그 컬럼에 @Column(unique=true)
            if (dbUniqueCols.size() == 1 && singleUniqueColumns.containsAll(dbUniqueCols)) {
                return true;
            }
            // 3) PK 컬럼셋과 동일(PK 중복 UNIQUE — @Id 로 이미 유일성 보장)
            return !idColumns.isEmpty() && idColumns.equals(dbUniqueCols);
        }
    }

    // ---- 유틸 (SchemaNamingLinterTest 관행 재사용) -----------------------------------

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

    private static String stripComments(String raw) {
        // 블록 주석 제거 후, 라인 주석(-- ...) 제거
        String noBlock = raw.replaceAll("(?s)/\\*.*?\\*/", "");
        return Arrays.stream(noBlock.split("\r?\n", -1))
                .map(line -> {
                    int idx = line.indexOf("--");
                    return idx >= 0 ? line.substring(0, idx) : line;
                })
                .collect(Collectors.joining("\n"));
    }

    private static String unquote(String name) {
        return name.replace("\"", "").trim().toLowerCase();
    }
}
