package nuri.api.harness;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
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
import jakarta.persistence.UniqueConstraint;
import nuri.foundation.domain.common.IntegralStringConverter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.sql.Types;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.function.Predicate;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 스키마 규칙 한 벌. PostgreSQL 은 하네스 린터가 SQL 파일을 재생한 결과로, 벤더 DB 는 {@link VendorCatalogConformanceTest} 가
 * 실제 카탈로그로 같은 규칙을 부른다. 규칙을 두 벌로 두면 벤더만 조용히 느슨해진다.
 */
final class SchemaConformanceRules {

    private static final Logger log = LoggerFactory.getLogger(SchemaConformanceRules.class);

    static final Pattern TABLE_NAME = Pattern.compile("tb_[a-z0-9_]+");
    static final Pattern SEQUENCE_NAME = Pattern.compile("sq_[a-z0-9_]+");
    static final Pattern VIEW_NAME = Pattern.compile("vw_[a-z0-9_]+");
    // uk_ 는 유니크 "인덱스" 레거시 관행(제약 승격 대상 P5) — 신규도 잠정 허용하되 ix_ 권장
    static final Pattern INDEX_NAME = Pattern.compile("(?:ix|uk)_[a-z0-9_]+");
    static final Pattern CONSTRAINT_NAME = Pattern.compile("(?:pk|fk|uk|ck)_[a-z0-9_]+");
    /** Flyway 가 따옴표로 소문자 이름을 만드는 이력 표. 앱 SQL 이 쓰지 않으므로 저장 표기 규칙에서 뺀다. */
    private static final String FLYWAY_HISTORY_TABLE = "flyway_schema_history";

    /** 한 글자의 최대 바이트(UTF-8). 번역 기준선이 글자 수를 바이트로 옮길 때 쓰는 값과 같다(설계서 §5). */
    private static final long MAX_BYTES_PER_CHARACTER = 4;

    static final int VARCHAR_UNBOUNDED = Integer.MAX_VALUE;
    /** {@code @Column} 이 없는 String 필드에 적용하는 JPA 기본 길이. */
    private static final int JPA_DEFAULT_LENGTH = 255;
    /** {@code character varying(20)} / {@code varchar(20)} / {@code numeric(2)} 등 */
    private static final Pattern TYPE_LEN = Pattern.compile("\\((\\d+)(?:\\s*,\\s*\\d+)?\\)");

    private SchemaConformanceRules() {
    }

    // ── 엔티티 매핑 ──────────────────────────────────────────────────────────────

    static List<Class<?>> entityClasses(String scanBase) {
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(Entity.class));
        List<Class<?>> classes = new ArrayList<>();
        for (var bd : scanner.findCandidateComponents(scanBase)) {
            try {
                classes.add(Class.forName(bd.getBeanClassName()));
            } catch (ClassNotFoundException | NoClassDefFoundError ex) {
                log.warn("[SchemaConformanceRules] 엔티티 로드 실패(스캔 제외): {}", bd.getBeanClassName());
            }
        }
        return classes;
    }

    static String tableNameOf(Class<?> clazz) {
        Table t = clazz.getAnnotation(Table.class);
        if (t != null && !t.name().isBlank()) {
            return t.name().toLowerCase(Locale.ROOT);
        }
        return toSnakeCase(clazz.getSimpleName());
    }

    static String columnNameOf(Field field) {
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

    /** 컬럼으로 매핑되는 필드만 — 임베디드는 재귀적으로 펼치고 연관·정적/transient 는 제외한다. */
    static List<Field> persistentFields(Class<?> clazz) {
        List<Field> fields = new ArrayList<>();
        collectPersistentFields(clazz, fields, new HashSet<>());
        return fields;
    }

    private static void collectPersistentFields(Class<?> clazz, List<Field> fields, Set<Class<?>> visiting) {
        if (!visiting.add(clazz)) {
            return;
        }
        for (Class<?> c = clazz; c != null && c != Object.class; c = c.getSuperclass()) {
            for (Field f : c.getDeclaredFields()) {
                if (Modifier.isStatic(f.getModifiers()) || Modifier.isTransient(f.getModifiers())) {
                    continue;
                }
                if (f.isAnnotationPresent(Embedded.class) || f.isAnnotationPresent(EmbeddedId.class)) {
                    collectPersistentFields(f.getType(), fields, visiting);
                    continue;
                }
                if (f.isAnnotationPresent(Transient.class)
                        || f.isAnnotationPresent(OneToMany.class) || f.isAnnotationPresent(ManyToMany.class)
                        || f.isAnnotationPresent(ManyToOne.class) || f.isAnnotationPresent(OneToOne.class)
                        || f.isAnnotationPresent(ElementCollection.class)) {
                    continue;
                }
                fields.add(f);
            }
        }
        visiting.remove(clazz);
    }

    // ── PK 전략·숫자 변환·길이 ───────────────────────────────────────────────────

    /** 규칙 위반 하나. {@code kind} 는 동결 대조 키의 접미사다({@code 엔티티#필드:kind}). 숫자 변환은 동결 대상이 아니라 비어 있다. */
    record FieldProblem(String kind, String message) {
    }

    /** 필드 하나를 물리 타입과 대조한다. 입력이 SQL 재생이든 카탈로그든 같은 규칙이다. */
    static List<FieldProblem> fieldProblems(Class<?> clazz, String table, String column, Field field, String physicalType) {
        List<FieldProblem> problems = new ArrayList<>();
        // ① PK 전략 적합성 — 사고를 직접 잡는 규칙
        GeneratedValue gv = field.getAnnotation(GeneratedValue.class);
        if (field.isAnnotationPresent(Id.class) && gv != null) {
            String problem = pkStrategyProblem(gv.strategy(), field, physicalType);
            if (problem != null) {
                problems.add(new FieldProblem("pk-strategy", String.format("%s → %s.%s [PK 전략 부적합] %s (물리: %s)",
                        clazz.getSimpleName(), table, column, problem, physicalType)));
            }
        }

        // ② 명시 숫자 변환은 문자열 길이가 아닌 실제 NUMERIC precision/scale과 대조한다.
        Convert convert = field.getAnnotation(Convert.class);
        if (convert != null && !convert.disableConversion() && convert.converter() == IntegralStringConverter.class) {
            if (!integralStringMatchesPhysicalType(field, physicalType)) {
                problems.add(new FieldProblem("", String.format("%s → %s.%s [숫자 변환 불일치] String/NUMERIC precision·scale (물리: %s)",
                        clazz.getSimpleName(), table, column, physicalType)));
            }
        } else if (field.getType() == String.class) {
            int entityLen = entityLength(field);
            if (entityLen > lengthOf(physicalType)) {
                problems.add(new FieldProblem("length", String.format("%s → %s.%s [길이 초과] 엔티티 length=%d > 물리 %s",
                        clazz.getSimpleName(), table, column, entityLen, physicalType)));
            }
        }
        return problems;
    }

    private static int entityLength(Field field) {
        Column column = field.getAnnotation(Column.class);
        return column != null ? column.length() : JPA_DEFAULT_LENGTH;
    }

    /**
     * 기준선 뒤에 바이트 길이가 된 컬럼을 엔티티와 대조한다. 드라이버는 바이트 컬럼도 선언 숫자를 답하므로 {@code VARCHAR2(100)} 은 길이 규칙을 통과하고
     * 운영에서 한글 34자부터 거부된다. 엔티티 길이만큼의 글자가 최악의 경우에도 들어가면 정상이다 — {@code VARCHAR2(400 BYTE)} 와 {@code length=100} 은 막지 않는다.
     *
     * @param byteColumns {@code 표.컬럼} → 바이트 길이. 기준선의 바이트 컬럼은 어댑터의 선언된 저하라 호출자가 뺀다.
     */
    static List<String> byteLengthProblems(List<Class<?>> entities, Map<String, Integer> byteColumns) {
        List<String> problems = new ArrayList<>();
        for (Class<?> clazz : entities) {
            String table = tableNameOf(clazz);
            for (Field field : persistentFields(clazz)) {
                Integer bytes = byteColumns.get(table + "." + columnNameOf(field));
                if (bytes != null && field.getType() == String.class && entityLength(field) * MAX_BYTES_PER_CHARACTER > bytes) {
                    problems.add(String.format("%s → %s.%s [바이트 길이 부족] 엔티티 length=%d 는 최대 %d바이트인데 컬럼은 %d바이트다. 글자 수 의미(VARCHAR2(n CHAR))로 쓰십시오",
                            clazz.getSimpleName(), table, columnNameOf(field), entityLength(field), entityLength(field) * MAX_BYTES_PER_CHARACTER, bytes));
                }
            }
        }
        return problems;
    }

    static boolean integralStringMatchesPhysicalType(Field field, String physicalType) {
        Column column = field.getAnnotation(Column.class);
        Matcher numeric = Pattern.compile("(?i)^(?:NUMERIC|DECIMAL)\\s*\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*\\)$")
                .matcher(physicalType.trim());
        return field.getType() == String.class && column != null && column.scale() == 0 && numeric.matches()
                && column.precision() == Integer.parseInt(numeric.group(1))
                && column.scale() == Integer.parseInt(numeric.group(2));
    }

    /** PK 생성 전략이 물리 타입에 수용되는지 — 부적합하면 사유, 적합하면 null */
    static String pkStrategyProblem(GenerationType strategy, Field field, String physicalType) {
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
    static int lengthOf(String physicalType) {
        Matcher m = TYPE_LEN.matcher(physicalType);
        return m.find() ? Integer.parseInt(m.group(1)) : VARCHAR_UNBOUNDED;
    }

    /**
     * JDBC 메타데이터를 규칙이 읽는 타입 표기로 옮긴다. 벤더 타입 이름(NUMBER·VARCHAR2·NVARCHAR)이 아니라 JDBC 타입 코드로 나눠 벤더마다
     * 파서를 두지 않는다. Oracle 드라이버는 바이트 컬럼도 선언 숫자를 답해 이 표기로는 글자 수 컬럼과 구분되지 않는다({@link #byteLengthProblems}).
     */
    static String physicalType(int jdbcType, String typeName, int size, int digits) {
        return switch (jdbcType) {
            case Types.NUMERIC, Types.DECIMAL -> size > 0 ? "NUMERIC(" + size + "," + Math.max(digits, 0) + ")" : "NUMERIC";
            case Types.BIGINT -> "bigint";
            case Types.INTEGER -> "integer";
            case Types.SMALLINT, Types.TINYINT -> "smallint";
            case Types.VARCHAR, Types.NVARCHAR -> "VARCHAR(" + size + ")";
            case Types.CHAR, Types.NCHAR -> "CHAR(" + size + ")";
            case Types.CLOB, Types.NCLOB, Types.LONGVARCHAR, Types.LONGNVARCHAR -> "TEXT";
            default -> typeName;
        };
    }

    /**
     * 카탈로그 전체를 엔티티와 대조한다. 표·컬럼 부재와 타입 계열은 시나리오 시험 문맥의 Hibernate validate 가 같은 DB 에서 본다.
     * 여기서 함께 막으면 같은 불변식을 두 게이트가 지키게 되므로 부재는 건너뛰고 대조한 수만 센다.
     */
    static EntityAudit auditEntities(List<Class<?>> entities, Map<String, Map<String, String>> schema) {
        List<String> violations = new ArrayList<>();
        int checked = 0;
        for (Class<?> clazz : entities) {
            String table = tableNameOf(clazz);
            Map<String, String> columns = schema.get(table);
            if (columns == null) {
                continue;
            }
            for (Field field : persistentFields(clazz)) {
                String column = columnNameOf(field);
                String physicalType = columns.get(column);
                if (physicalType == null) {
                    continue;
                }
                checked++;
                fieldProblems(clazz, table, column, field, physicalType).forEach(problem -> violations.add(problem.message()));
            }
        }
        return new EntityAudit(violations, checked);
    }

    record EntityAudit(List<String> violations, int checkedColumns) {
    }

    // ── 명명·감사 컬럼 ───────────────────────────────────────────────────────────

    /** 제8조: 신규 비즈니스 테이블은 최소 감사컬럼 2종(frst_rgtr_id, crt_dt)을 탑재해야 한다.
     *  (수정이 구조적으로 없는 Insert-Only 테이블의 2종 면제 조항과 정합 — 4종 여부는 설계 리뷰 영역) */
    static List<String> auditColumnProblems(String table, Predicate<String> hasColumn) {
        List<String> problems = new ArrayList<>();
        boolean hasRgtr = hasColumn.test("frst_rgtr_id");
        boolean hasCrtDt = hasColumn.test("crt_dt");
        if (!hasRgtr || !hasCrtDt) {
            problems.add(String.format("테이블 '%s' — 헌법 제8조 최소 감사컬럼(frst_rgtr_id, crt_dt) 누락(%s)",
                    table, (hasRgtr ? "" : "frst_rgtr_id ") + (hasCrtDt ? "" : "crt_dt")));
        }
        // 짝 깨짐: mdfcn_dt 만 있고 last_mdfr_id 가 없는(또는 반대) 비대칭 차단
        boolean hasMdfcn = hasColumn.test("mdfcn_dt");
        boolean hasMdfr = hasColumn.test("last_mdfr_id");
        if (hasMdfcn != hasMdfr) {
            problems.add(String.format("테이블 '%s' — 감사컬럼 짝 깨짐(mdfcn_dt=%s, last_mdfr_id=%s) — 둘 다 탑재하거나 둘 다 생략하십시오",
                    table, hasMdfcn, hasMdfr));
        }
        return problems;
    }

    /** 벤더 카탈로그의 이름 목록. 값은 {@code 표.이름} 이고 시퀀스는 {@code .이름} 이다. */
    record CatalogNames(Set<String> columns, Set<String> constraints, Set<String> indexes, Set<String> sequences) {

        Set<String> tables() {
            Set<String> tables = new TreeSet<>();
            columns.forEach(column -> tables.add(column.substring(0, column.indexOf('.'))));
            return tables;
        }
    }

    private static Set<String> added(Set<String> current, Set<String> baseline) {
        Set<String> added = new TreeSet<>(current);
        added.removeAll(baseline);
        return added;
    }

    /**
     * 표 규칙을 드라이버가 답한 저장 표기로 본다. 이름 목록은 실행 도구의 조회가 소문자로 접고 형식 밖 이름을 읽지 못하므로, 표 규칙이 거기에 기대면 따옴표로 만든 표가
     * 규칙을 통째로 건너뛴다. 따옴표 없는 네이티브 SQL 은 대문자 이름을 찾으므로 Oracle 의 소문자 저장 표기는 표준 이름이어도 런타임에 없는 표다.
     *
     * @param storedTables 드라이버가 답한 표 이름(저장 표기)
     * @param baselineTables 기준선 표(소문자). 여기 있으면 이름·감사 규칙을 보지 않는다
     * @param views 드라이버가 뷰라고 답한 이름. 표 규칙에서 뺀다
     * @param foldsToUpper 따옴표 없는 이름을 대문자로 저장하는 DB 인가
     */
    static List<String> tableProblems(Set<String> storedTables, Set<String> baselineTables, Set<String> views, Map<String, Map<String, String>> schema, boolean foldsToUpper) {
        List<String> problems = new ArrayList<>();
        for (String stored : new TreeSet<>(storedTables)) {
            String table = stored.toLowerCase(Locale.ROOT);
            if (views.contains(table)) {
                continue;
            }
            boolean quotedOnFoldingDb = foldsToUpper && !FLYWAY_HISTORY_TABLE.equals(stored) && !stored.equals(stored.toUpperCase(Locale.ROOT));
            if (quotedOnFoldingDb) {
                problems.add(String.format("테이블명 '%s' — 따옴표로 만든 저장 표기다. 따옴표 없는 네이티브 SQL 이 찾지 못하므로 따옴표 없이 만드십시오", stored));
            }
            if (baselineTables.contains(table)) {
                continue;
            }
            if (!quotedOnFoldingDb && !TABLE_NAME.matcher(foldsToUpper ? table : stored).matches()) {
                problems.add(String.format("테이블명 '%s' — 헌법 제3조 tb_ 접두 + 제1조 소문자 snake_case 위반", stored));
            }
            problems.addAll(auditColumnProblems(table, column -> schema.getOrDefault(table, Map.of()).containsKey(column)));
        }
        return problems;
    }

    /**
     * 기준선 뒤에 생긴 제약·인덱스·시퀀스·컬럼을 명명 규칙으로 본다. 기준선은 어댑터 파생 이름이 섞여 있고 정확 대조를 이미 받았다.
     * 같은 이름의 컬럼 타입을 바꾸는 변경은 여기에 나타나지 않는다. 표는 {@link #tableProblems} 가 본다.
     *
     * @param views 드라이버가 뷰라고 답한 이름. 기준선에는 뷰가 없어 모든 뷰가 새 객체다.
     */
    static List<String> newObjectProblems(CatalogNames baseline, CatalogNames current, Map<String, Map<String, String>> schema, Set<String> views) {
        List<String> problems = new ArrayList<>();
        for (String view : new TreeSet<>(views)) {
            if (!VIEW_NAME.matcher(view).matches()) {
                problems.add(String.format("뷰명 '%s' — 헌법 제3조 vw_ 접두 + 제1조 소문자 snake_case 위반", view));
            }
        }
        for (String item : added(current.constraints(), baseline.constraints())) {
            String name = item.substring(item.indexOf('.') + 1);
            if (!CONSTRAINT_NAME.matcher(name).matches()) {
                problems.add(String.format("제약명 '%s' — 헌법 제6조 pk_/fk_/uk_/ck_ 접두 + 소문자 snake_case 위반", item));
            }
        }
        for (String item : added(current.indexes(), baseline.indexes())) {
            String name = item.substring(item.indexOf('.') + 1);
            if (!INDEX_NAME.matcher(name).matches()) {
                problems.add(String.format("인덱스명 '%s' — 헌법 제6조 ix_ 접두 위반", item));
            }
        }
        for (String item : added(current.sequences(), baseline.sequences())) {
            String name = item.substring(item.indexOf('.') + 1);
            if (!SEQUENCE_NAME.matcher(name).matches()) {
                problems.add(String.format("시퀀스명 '%s' — 헌법 제3조 sq_ 접두 위반", name));
            }
        }
        for (String item : added(current.columns(), baseline.columns())) {
            int dot = item.indexOf('.');
            String type = schema.getOrDefault(item.substring(0, dot), Map.of()).get(item.substring(dot + 1));
            if (type != null && type.startsWith("CHAR(")) {
                problems.add(String.format("컬럼 '%s' — 고정 문자형(%s) 사용, 헌법 제5조 4항 전면 금지, 가변 문자형으로 대체하십시오", item, type));
            }
        }
        return problems;
    }

    // ── 권한 초기 부여 ───────────────────────────────────────────────────────────

    /**
     * 카탈로그의 기본 그룹과 벤더 DB 의 OPERATION 부여를 양방향으로 대조한다. PostgreSQL 은 regen 이 시드를 다시 쓰지만 벤더 기준선은
     * 고정이라, 카탈로그만 고치면 재생성이 초록인 채 새 DB 의 부여가 어긋난다.
     */
    static List<String> grantProblems(Set<String> expected, Set<String> actual) {
        List<String> problems = new ArrayList<>();
        Set<String> missing = added(expected, actual);
        Set<String> extra = added(actual, expected);
        if (!missing.isEmpty()) {
            problems.add("권한 카탈로그의 defaultGroups 에 있는데 벤더 DB 에 부여가 없다: " + missing);
        }
        if (!extra.isEmpty()) {
            problems.add("벤더 DB 에 부여가 있는데 권한 카탈로그의 defaultGroups 에 없다: " + extra);
        }
        return problems;
    }

    // ── 유니크 미러 ──────────────────────────────────────────────────────────────

    /** 엔티티가 매핑된 테이블별 JPA 미러. 물리 테이블명을 모르는 엔티티는 뺀다(대부분 @Table(name) 보유). */
    static Map<String, EntityMirror> entityMirrors(String scanBase) {
        Map<String, EntityMirror> mirrors = new HashMap<>();
        for (Class<?> clazz : entityClasses(scanBase)) {
            Table table = clazz.getAnnotation(Table.class);
            if (table == null || table.name().isBlank()) {
                continue;
            }
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
                String colName = (col != null && !col.name().isBlank()) ? unquote(col.name()) : camelToSnake(f.getName());
                if (col != null && col.unique()) {
                    mirror.singleUniqueColumns.add(colName);
                }
                if (f.isAnnotationPresent(Id.class)) {
                    mirror.idColumns.add(colName);
                }
            }
            mirrors.put(unquote(table.name()), mirror);
        }
        return mirrors;
    }

    private static List<Field> allFields(Class<?> clazz) {
        List<Field> fields = new ArrayList<>();
        for (Class<?> c = clazz; c != null && c != Object.class; c = c.getSuperclass()) {
            fields.addAll(Arrays.asList(c.getDeclaredFields()));
        }
        return fields;
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

    /** 인덱스 식이 인용해 쓰는 컬럼. {@code CASE WHEN "A" IS NOT NULL THEN "A" END} → {@code a}. 빈 결과는 미러와 맞지 않아 붉다. */
    static Set<String> expressionColumns(String expression) {
        Set<String> columns = new TreeSet<>();
        Matcher quoted = Pattern.compile("\"([^\"]+)\"").matcher(expression);
        while (quoted.find()) {
            columns.add(quoted.group(1).toLowerCase(Locale.ROOT));
        }
        return columns;
    }

    static String unquote(String name) {
        return name.replace("\"", "").trim().toLowerCase();
    }

    static final class EntityMirror {
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

    /**
     * 기준선 뒤에 생기거나 다시 만든 유니크만 미러와 대조한다. 기준선의 유니크는 어댑터가 해시 컬럼이나 함수 인덱스로 바꿔 둔 것이 있어 전체를
     * 대조하면 정상 스키마가 붉다. 기준선 안의 미러 회귀는 번역 입력을 보는 유니크 미러 린터가, 번역이 컬럼을 바꾸는 회귀는 실행 도구의 기준선 대조가 맡는다. 기본키는 미러 대상이 아니다 — 복합 키
     * 엔티티는 {@code @Id} 필드가 없어 미러 판정을 통과하지 못한다.
     *
     * @param uniques     표 → 인덱스·제약 이름 → 컬럼 집합. 드라이버가 답한 유니크 인덱스와 일반 인덱스로 집행되는 유니크 제약이다.
     * @param unchanged   기준선 그대로인 유니크의 {@code 표.이름}. 표를 포함해야 다른 표의 같은 이름(MySQL)이 검사를 가리지 않는다.
     * @param primaryKeys 표 → 기본키 컬럼 집합.
     */
    static List<String> mirrorProblems(Map<String, EntityMirror> mirrors, Map<String, Map<String, Set<String>>> uniques,
            Set<String> unchanged, Map<String, Set<String>> primaryKeys) {
        List<String> problems = new ArrayList<>();
        new TreeMap<>(uniques).forEach((table, indexes) -> {
            EntityMirror mirror = mirrors.get(table);
            if (mirror == null) {
                return;
            }
            indexes.forEach((name, columns) -> {
                if (!unchanged.contains(table + "." + name) && !columns.equals(primaryKeys.get(table)) && !mirror.satisfies(columns)) {
                    problems.add(String.format("테이블 '%s' UNIQUE %s(%s) — 엔티티 %s 에 JPA 미러 없음. @Table(uniqueConstraints) 또는 단일컬럼 @Column(unique=true) 로 미러하십시오.",
                            table, columns, name, mirror.entityClass));
                }
            });
        });
        return problems;
    }
}
