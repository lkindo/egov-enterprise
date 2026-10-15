package nuri.migration.etl;

import nuri.migration.identity.IdentityValueType;
import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.model.MappingSpec.IdentityStrategy;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.source.SourceIntrospector;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.sql.Array;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * 원본 키를 그대로 쓴 대상 컬럼의 시퀀스를 적재 뒤에 앞으로 맞춘다(DEC-OPS-306).
 *
 * <p>{@code preserve} 나 직접 컬럼 매핑으로 원본 키를 넣으면 대상 PK 의 identity·serial·{@code nextval} 기본값
 * 시퀀스는 그대로 1 에 머문다. 그대로 두면 온라인 앱의 첫 INSERT 가 이미 이관한 키와 충돌한다. 그래서 적재 계약
 * 안에서 두 단계를 거친다.
 *
 * <ol>
 *   <li>{@link #plan} — 쓰기 전에 대상 카탈로그로 컬럼마다 시퀀스를 정한다. 정할 수 없으면 행을 쓰기 전에
 *       실패한다: 기본값이 {@code nextval} 인데 시퀀스를 못 찾음, 연결된 시퀀스가 둘 이상, 선언과 카탈로그가 다름,
 *       선언한 시퀀스가 없음, {@code GENERATED ALWAYS} identity, 이관 계정에 시퀀스 SELECT·UPDATE 권한이 없음,
 *       그리고 {@code preserve}·{@code remap} 정수 키가 카탈로그로 연결된 시퀀스도 선언({@code identity.targetSequences})도
 *       없는 경우 — 온라인 앱이 {@code @SequenceGenerator} 전용 시퀀스로 채번하는지 카탈로그로는 알 수 없기 때문이다.
 *       이 판정은 COMMIT 적재 시작에서만 한다. plan·dry-run 은 대상 시퀀스를 읽지 않으므로 선언 누락은 COMMIT 이
 *       행을 쓰기 전에 드러난다.</li>
 *   <li>{@link #apply} — 적재가 끝난 뒤 시퀀스가 다음에 내줄 번호 묶음({@code 다음 값 - 증가폭 + 1} 부터 다음 값까지,
 *       Hibernate pooled optimizer 가 쓰는 범위)에 {@code max(컬럼)} 이하 값이 있으면 {@code setval(시퀀스, max)} 로
 *       옮긴다. 이미 앞에 있으면 건드리지 않으므로 다시 실행해도 같은 상태이고, 시퀀스를 뒤로 돌리지 않는다. 승인 격리로
 *       적재하지 않은 행의 키가 더 크면 그 키까지 옮긴다(ADR-0029 L3b).</li>
 * </ol>
 *
 * <p>기록에는 대상 테이블·컬럼·시퀀스 이름과 결과만 남기고 키 값(최댓값·시퀀스 값)은 남기지 않는다 — 실행 artifact 의
 * "행 값·키 없음" 원칙과 같다. 대상 카탈로그는 PostgreSQL 에서만 읽는다. 승인 workflow 의 대상은 언제나
 * PostgreSQL 이다({@code TargetEndpointBinding}). 그 밖의 대상(단위 시험의 H2)에서는 {@code preserve}·{@code remap}
 * 정수 키가 {@value IdentityStrategy#NO_SEQUENCE} 로 선언되지 않으면 진행하지 않는다.
 *
 * <p>전제(강제하지 않는다): 적재·재설정하는 동안 온라인 앱이 같은 테이블에 쓰지 않는다(cutover 창). 최댓값 조회와
 * {@code setval} 사이를 잠그지 않으므로, 그 사이 온라인 {@code nextval} 이 앞서 가면 {@code setval} 이 시퀀스를 뒤로
 * 돌릴 수 있다 — 복구 런북의 cutover 절차가 이 전제를 운영자에게 요구한다.
 */
public final class TargetSequenceSynchronizer {

    /** 재설정 결과. */
    public enum Action {
        /** 시퀀스를 원본 키 최댓값으로 옮겼다. */
        ADVANCED,
        /** 시퀀스의 다음 값이 이미 원본 키 최댓값보다 크다. */
        ALREADY_AHEAD,
        /** 대상 테이블에 행이 없다. */
        EMPTY_TABLE,
        /** mapping 이 이 컬럼은 시퀀스로 채번되지 않는다고 선언했다. */
        DECLARED_NONE
    }

    /** 값 없이 이름과 결과만 남는 재설정 기록 — 실행 artifact 에 그대로 실린다. */
    public record SequenceReset(String targetTable, String column, String sequence, Action action) {}

    /** 쓰기 전에 정한 재설정 대상. {@code sequence} 가 null 이면 none 선언이다. */
    record Target(String sourceTable, String targetTable, String column, String sequence) {}

    private static final Set<IdentityValueType> INTEGER_KEY_TYPES = Set.of(
            IdentityValueType.SIGNED_INTEGER, IdentityValueType.UNSIGNED_INTEGER, IdentityValueType.DECIMAL);

    private static final String COLUMN_SQL = """
            SELECT a.attidentity::text,
                   COALESCE(pg_catalog.pg_get_expr(d.adbin, d.adrelid), ''),
                   ARRAY(
                     SELECT DISTINCT pg_catalog.quote_ident(n.nspname) || '.' || pg_catalog.quote_ident(s.relname)
                     FROM pg_catalog.pg_class s
                     JOIN pg_catalog.pg_namespace n ON n.oid = s.relnamespace
                     WHERE s.relkind = 'S'
                       AND (s.oid = pg_catalog.pg_get_serial_sequence(a.attrelid::regclass::text, a.attname)::regclass
                            OR s.oid IN (SELECT dep.refobjid FROM pg_catalog.pg_depend dep
                                         WHERE dep.classid = 'pg_catalog.pg_attrdef'::regclass
                                           AND dep.objid = d.oid
                                           AND dep.refclassid = 'pg_catalog.pg_class'::regclass))
                     ORDER BY 1)
            FROM pg_catalog.pg_attribute a
            LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
            WHERE a.attrelid = ?::oid AND a.attname = ? AND a.attnum > 0 AND NOT a.attisdropped
            """;

    private static final String SEQUENCE_SQL = """
            SELECT pg_catalog.quote_ident(n.nspname) || '.' || pg_catalog.quote_ident(c.relname)
            FROM pg_catalog.pg_class c
            JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
            WHERE c.oid = pg_catalog.to_regclass(?) AND c.relkind = 'S'
            """;

    private TargetSequenceSynchronizer() {
    }

    /**
     * 쓰기 전에 재설정 대상을 정한다.
     *
     * @throws IllegalStateException 시퀀스를 정할 수 없어 적재를 시작하면 안 되는 경우
     */
    static List<Target> plan(Connection target, List<TableMapping> tables) throws SQLException {
        boolean postgres = "PostgreSQL".equals(target.getMetaData().getDatabaseProductName());
        List<Target> planned = new ArrayList<>();
        for (TableMapping table : tables) {
            IdentityStrategy identity = table.identity();
            // [DEC-OPS-306 · 사용자 Q9] remap 도 대상 키 값을 mapping 이 넣는다 — 시퀀스 판정은 preserve 와 같다.
            boolean keyed = identity != null && (identity.policy() == TargetIdentityPolicy.PRESERVE
                    || identity.policy() == TargetIdentityPolicy.REMAP);
            Set<String> integerKeys = keyed ? integerKeyColumns(identity) : Set.of();
            if (!postgres) {
                planWithoutCatalog(table, identity, integerKeys, planned);
                continue;
            }
            Long relation = relation(target, table.target());
            if (relation == null) {
                continue; // 대상 테이블이 없으면 INSERT 자체가 실패하고 쓴 행이 없다.
            }
            for (String column : EtlExecutor.insertTargetColumns(table)) {
                String declared = keyed ? identity.declaredSequence(column) : null;
                planColumn(target, table, relation, column, declared,
                        integerKeys.contains(column.toLowerCase(Locale.ROOT)), planned);
            }
        }
        return List.copyOf(planned);
    }

    /**
     * 적재가 끝난 뒤 한 대상의 시퀀스를 앞으로 맞춘다. 호출자가 연결을 소유하며 이 메서드가 자기 트랜잭션을 끝낸다.
     *
     * @throws IllegalStateException 시퀀스가 내림차순이거나 원본 키가 시퀀스 상한을 넘는 경우
     */
    static SequenceReset apply(Connection target, Target planned) throws SQLException {
        return apply(target, planned, null);
    }

    /**
     * [ADR-0029 L3b] {@code isolatedMax} 는 승인 격리로 적재하지 않은 행이 이 컬럼에 썼을 정수 키의 최댓값이다(없으면
     * null). 재설정 목표는 대상 최댓값과 이 값 중 큰 쪽이다 — cutover 뒤 온라인 앱이 격리된 번호를 다시 내주지 않게 하고,
     * 데이터를 고친 뒤 같은 번호로 다시 적재할 수 있게 한다. 이 값도 기록하지 않는다.
     */
    static SequenceReset apply(Connection target, Target planned, BigInteger isolatedMax) throws SQLException {
        if (planned.sequence() == null) {
            return new SequenceReset(planned.targetTable(), planned.column(), null, Action.DECLARED_NONE);
        }
        target.setAutoCommit(false);
        BigDecimal max = maxKey(target, planned);
        if (max == null && isolatedMax == null) {
            target.commit();
            return reset(planned, Action.EMPTY_TABLE);
        }
        if (max != null && max.stripTrailingZeros().scale() > 0) {
            throw new IllegalStateException("원본 키에 소수 값이 있어 시퀀스를 맞출 수 없습니다");
        }
        BigInteger highest = max == null ? isolatedMax
                : isolatedMax == null ? max.toBigIntegerExact() : max.toBigIntegerExact().max(isolatedMax);
        SequenceState state = sequenceState(target, planned.sequence());
        if (state.increment().signum() <= 0) {
            throw new IllegalStateException("내림차순 시퀀스는 원본 키에 맞출 수 없습니다");
        }
        BigInteger next = state.called() ? state.lastValue().add(state.increment()) : state.lastValue();
        // 증가폭이 1 보다 크면(pooled optimizer, 예: INCREMENT 50) 다음 nextval 이 내주는 묶음의 첫 번호까지 키 뒤여야 한다.
        if (next.subtract(state.increment()).add(BigInteger.ONE).compareTo(highest) > 0) {
            target.commit();
            return reset(planned, Action.ALREADY_AHEAD);
        }
        if (highest.compareTo(state.maxValue()) > 0) {
            throw new IllegalStateException("원본 키 최댓값이 시퀀스 상한을 넘습니다");
        }
        try (PreparedStatement setval = target.prepareStatement(
                "SELECT pg_catalog.setval(?::regclass, ?, true)")) {
            setval.setString(1, planned.sequence());
            setval.setLong(2, highest.longValueExact());
            setval.executeQuery().close();
        }
        target.commit();
        return reset(planned, Action.ADVANCED);
    }

    private static void planWithoutCatalog(
            TableMapping table,
            IdentityStrategy identity,
            Set<String> integerKeys,
            List<Target> planned
    ) {
        Set<String> columns = new LinkedHashSet<>(integerKeys);
        if (identity != null) {
            identity.targetSequences().keySet().forEach(column -> columns.add(column.toLowerCase(Locale.ROOT)));
        }
        for (String column : columns) {
            if (!IdentityStrategy.NO_SEQUENCE.equals(identity.declaredSequence(column))) {
                throw new IllegalStateException(table.target() + "." + column
                        + ": PostgreSQL 이 아닌 대상은 시퀀스를 판정·재설정할 수 없습니다"
                        + " — 시퀀스로 채번되지 않는 키라면 identity.targetSequences 에 none 을 선언하세요");
            }
            planned.add(new Target(table.source(), table.target(), column, null));
        }
    }

    private static void planColumn(
            Connection target,
            TableMapping table,
            long relation,
            String column,
            String declared,
            boolean integerPreserveKey,
            List<Target> planned
    ) throws SQLException {
        ColumnCatalog catalog = column(target, relation, column);
        if (catalog == null) {
            return; // 없는 컬럼이면 INSERT 자체가 실패하고 쓴 행이 없다.
        }
        String label = table.target() + "." + column;
        if ("a".equals(catalog.identity())) {
            throw new IllegalStateException(label
                    + ": GENERATED ALWAYS identity 컬럼에는 원본 키를 쓸 수 없습니다");
        }
        List<String> linked = catalog.sequences();
        if (declared != null) {
            if (IdentityStrategy.NO_SEQUENCE.equals(declared)) {
                if (!linked.isEmpty()) {
                    throw new IllegalStateException(label
                            + ": none 으로 선언했지만 카탈로그가 시퀀스 " + linked.getFirst() + " 를 연결합니다");
                }
                planned.add(new Target(table.source(), table.target(), column, null));
                return;
            }
            String resolved = sequence(target, declared);
            if (resolved == null) {
                throw new IllegalStateException(label + ": 선언한 시퀀스를 찾을 수 없습니다: " + declared);
            }
            if (!linked.isEmpty() && !linked.contains(resolved)) {
                throw new IllegalStateException(label + ": 선언한 시퀀스 " + resolved
                        + " 와 카탈로그가 연결한 시퀀스 " + linked + " 가 다릅니다");
            }
            planned.add(requirePrivileges(target, label, new Target(table.source(), table.target(), column, resolved)));
            return;
        }
        if (linked.size() > 1) {
            throw new IllegalStateException(label + ": 연결된 시퀀스가 둘 이상이라 하나로 정할 수 없습니다: " + linked);
        }
        if (linked.size() == 1) {
            planned.add(requirePrivileges(target, label,
                    new Target(table.source(), table.target(), column, linked.getFirst())));
            return;
        }
        if (catalog.defaultExpression().toLowerCase(Locale.ROOT).contains("nextval(")) {
            throw new IllegalStateException(label + ": 기본값이 nextval 을 쓰지만 시퀀스를 판정할 수 없습니다"
                    + " — identity.targetSequences 에 시퀀스 이름을 선언하세요");
        }
        if (integerPreserveKey) {
            throw new IllegalStateException(label + ": mapping 이 값을 넣는 정수 키(preserve·remap)가 카탈로그로 연결된"
                    + " 시퀀스가 없어 온라인 앱의 채번 시퀀스를 판정할 수 없습니다"
                    + " — identity.targetSequences 에 시퀀스 이름이나 none 을 선언하세요");
        }
    }

    /**
     * 재설정은 최댓값·시퀀스 상태를 읽고({@code SELECT}) {@code setval} 한다({@code UPDATE}). 권한이 없으면 모든 테이블을
     * 쓴 뒤에야 실패하므로 쓰기 전에 본다. {@code has_sequence_privilege} 는 여러 권한을 한 번에 주면 하나만 있어도
     * 참이라 권한마다 따로 묻는다.
     */
    private static Target requirePrivileges(Connection target, String label, Target planned) throws SQLException {
        for (String privilege : List.of("SELECT", "UPDATE")) {
            try (PreparedStatement statement = target.prepareStatement(
                    "SELECT pg_catalog.has_sequence_privilege(?::regclass, ?)")) {
                statement.setString(1, planned.sequence());
                statement.setString(2, privilege);
                try (ResultSet rows = statement.executeQuery()) {
                    if (!rows.next() || !rows.getBoolean(1)) {
                        throw new IllegalStateException(label + ": 이관 계정에 시퀀스 " + planned.sequence() + " 의 "
                                + privilege + " 권한이 없어 적재 뒤 재설정할 수 없습니다");
                    }
                }
            }
        }
        return planned;
    }

    private static Set<String> integerKeyColumns(IdentityStrategy identity) {
        Set<String> columns = new LinkedHashSet<>();
        for (IdentityComponentSpec component : identity.targetComponents()) {
            if (INTEGER_KEY_TYPES.contains(component.type())) {
                columns.add(component.column().toLowerCase(Locale.ROOT));
            }
        }
        return columns;
    }

    private static Long relation(Connection target, String table) throws SQLException {
        try (PreparedStatement statement = target.prepareStatement(
                "SELECT pg_catalog.to_regclass(?)::oid")) {
            statement.setString(1, SourceIntrospector.qualifiedIdent(table));
            try (ResultSet rows = statement.executeQuery()) {
                rows.next();
                long oid = rows.getLong(1);
                return rows.wasNull() ? null : oid;
            }
        }
    }

    private static ColumnCatalog column(Connection target, long relation, String column) throws SQLException {
        try (PreparedStatement statement = target.prepareStatement(COLUMN_SQL)) {
            statement.setLong(1, relation);
            statement.setString(2, SourceIntrospector.ident(column).toLowerCase(Locale.ROOT));
            try (ResultSet rows = statement.executeQuery()) {
                if (!rows.next()) {
                    return null;
                }
                Array array = rows.getArray(3);
                List<String> sequences = new ArrayList<>();
                for (Object value : (Object[]) array.getArray()) {
                    sequences.add((String) value);
                }
                array.free();
                return new ColumnCatalog(rows.getString(1), rows.getString(2), List.copyOf(sequences));
            }
        }
    }

    private static String sequence(Connection target, String declared) throws SQLException {
        try (PreparedStatement statement = target.prepareStatement(SEQUENCE_SQL)) {
            statement.setString(1, declared);
            try (ResultSet rows = statement.executeQuery()) {
                return rows.next() ? rows.getString(1) : null;
            }
        }
    }

    private static BigDecimal maxKey(Connection target, Target planned) throws SQLException {
        try (Statement statement = target.createStatement();
             ResultSet rows = statement.executeQuery("SELECT max(" + SourceIntrospector.ident(planned.column())
                     + ") FROM " + SourceIntrospector.qualifiedIdent(planned.targetTable()))) {
            rows.next();
            return rows.getBigDecimal(1);
        }
    }

    private static SequenceState sequenceState(Connection target, String sequence) throws SQLException {
        BigInteger increment;
        BigInteger maxValue;
        try (PreparedStatement statement = target.prepareStatement(
                "SELECT seqincrement, seqmax FROM pg_catalog.pg_sequence WHERE seqrelid = ?::regclass")) {
            statement.setString(1, sequence);
            try (ResultSet rows = statement.executeQuery()) {
                if (!rows.next()) {
                    throw new IllegalStateException("시퀀스 정의를 읽을 수 없습니다: " + sequence);
                }
                increment = BigInteger.valueOf(rows.getLong(1));
                maxValue = BigInteger.valueOf(rows.getLong(2));
            }
        }
        // 시퀀스 이름은 카탈로그의 quote_ident 결과만 오므로 그대로 SQL 에 넣어도 식별자로 해석된다.
        try (Statement statement = target.createStatement();
             ResultSet rows = statement.executeQuery("SELECT last_value, is_called FROM " + sequence)) {
            rows.next();
            return new SequenceState(BigInteger.valueOf(rows.getLong(1)), rows.getBoolean(2), increment, maxValue);
        }
    }

    private static SequenceReset reset(Target planned, Action action) {
        return new SequenceReset(planned.targetTable(), planned.column(), planned.sequence(), action);
    }

    private record ColumnCatalog(String identity, String defaultExpression, List<String> sequences) {}

    private record SequenceState(BigInteger lastValue, boolean called, BigInteger increment, BigInteger maxValue) {}
}
