package nuri.migration.validate;

import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.isolate.RowIsolationPolicy;
import nuri.migration.mapping.MappingIndex;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.model.MappingSpec.VerifyDeclaration;
import nuri.migration.model.MappingSpec.VerifyReference;
import nuri.migration.postgres.TargetSchemaFingerprint;
import nuri.migration.postgres.TargetSchemaFingerprint.ColumnMetadata;
import nuri.migration.postgres.TargetSchemaFingerprint.TableMetadata;
import nuri.migration.source.SourceIntrospector;

import java.sql.Types;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

/**
 * [ADR-0029 L4 D2] mapping 의 대사 선언({@code verify})을 본다. 문구는 표·컬럼 이름과 고정 어휘만 담는다.
 *
 * <ul>
 *   <li>{@code references} 항목은 {@code columns}·{@code parent}·{@code parentColumns} 를 같은 수의 식별자로 둔다
 *       ({@code VERIFY_REFERENCE_INVALID}). 부모는 이 mapping 이 적재하는 대상 표여야 한다 — 매핑하지 않은 부모는 승인
 *       fingerprint 밖이라 plan 뒤 변경을 잡지 못한다({@code VERIFY_REFERENCE_PARENT_NOT_MAPPED}).</li>
 *   <li>{@code referencedBy} 는 {@code none} 만 받고 사유가 있어야 하며, 다른 매핑이 이 표를 가리키면 안 된다
 *       ({@code VERIFY_REFERENCED_BY_INVALID}).</li>
 *   <li>P3(DEC-OPS-324): isolate 가 있고 키를 그대로 쓰는 표(idStrategy 없음, identity 없음이나 preserve)는 이 표를 가리키는
 *       {@code verify.references} 나 {@code referencedBy: none} 과 사유가 있어야 한다({@code VERIFY_REFERENCES_REQUIRED}) —
 *       격리한 행을 가리키는 자식(물리 FK 없이 키를 복사한 표)을 load 의 대사가 찾게 한다. fkRef·foreignKeys 의 부모에는
 *       isolate 를 둘 수 없으므로(RowIsolationPolicy) 남는 자식은 키를 복사한 표뿐이다. 격리할 수 없는 표(분할한 소스 등)는
 *       isolate 규칙이 먼저 거부하므로 이 규칙을 겹쳐 알리지 않는다.</li>
 * </ul>
 *
 * <p>live 규칙({@link #liveViolations})은 승인 fingerprint 로 자식·부모 컬럼이 대상에 있고 짝마다 타입 계열이 같은지 본다.</p>
 */
public final class VerifyReferenceRules {

    private static final Set<Integer> INTEGRAL = Set.of(Types.TINYINT, Types.SMALLINT, Types.INTEGER, Types.BIGINT);
    private static final Set<Integer> DECIMAL = Set.of(Types.DECIMAL, Types.NUMERIC);
    private static final Set<Integer> TEXT = Set.of(Types.CHAR, Types.VARCHAR, Types.NCHAR, Types.NVARCHAR,
            Types.LONGVARCHAR, Types.LONGNVARCHAR);

    private VerifyReferenceRules() {
    }

    /** 정적 규칙 위반. mapping 검증이 isolate 규칙 다음에 부른다. */
    public static List<String> violations(MappingSpec spec) {
        Objects.requireNonNull(spec, "spec");
        List<String> errors = new ArrayList<>();
        List<TableMapping> tables = spec.tables().stream().filter(Objects::nonNull).toList();
        for (TableMapping table : tables) {
            VerifyDeclaration verify = table.verify();
            if (verify == null) {
                continue;
            }
            String label = MappingIndex.label(table);
            for (int index = 0; index < verify.references().size(); index++) {
                VerifyReference reference = verify.references().get(index);
                if (!wellFormed(reference)) {
                    errors.add(label + ": verify.references[" + index + "] 는 columns·parent·parentColumns 를 같은 수의"
                            + " 식별자로 둡니다(VERIFY_REFERENCE_INVALID)");
                    continue;
                }
                if (tables.stream().noneMatch(candidate -> sameTarget(candidate.target(), reference.parent()))) {
                    errors.add(label + ": verify.references[" + index + "] 의 부모(" + reference.parent().trim()
                            + ")는 이 mapping 이 적재하는 대상 표여야 합니다 — 매핑하지 않은 부모는 승인 fingerprint 밖입니다"
                            + "(VERIFY_REFERENCE_PARENT_NOT_MAPPED)");
                }
            }
            if (verify.referencedBy() != null || verify.reason() != null) {
                if (!verify.confirmedUnreferenced()) {
                    errors.add(label + ": verify.referencedBy 는 none 만 받고 사유(reason)가 함께 있어야 합니다"
                            + "(VERIFY_REFERENCED_BY_INVALID)");
                } else {
                    for (TableMapping other : tables) {
                        if (referencedBy(other, table)) {
                            errors.add(label + ": verify.referencedBy 가 none 인데 " + MappingIndex.label(other)
                                    + " 의 verify.references 가 이 표를 가리킵니다(VERIFY_REFERENCED_BY_INVALID)");
                        }
                    }
                }
            }
        }
        for (TableMapping table : tables) {
            if (!isolates(table) || !preservesKey(table)
                    || RowIsolationPolicy.tableBlocker(spec.tables(), table) != null) {
                continue;
            }
            boolean referenced = tables.stream().anyMatch(other -> referencedBy(other, table));
            boolean confirmed = table.verify() != null && table.verify().confirmedUnreferenced();
            if (!referenced && !confirmed) {
                errors.add(MappingIndex.label(table) + ": isolate 가 있고 키를 그대로 쓰는 표는 이 표를 가리키는"
                        + " verify.references 나 verify.referencedBy: none 과 사유가 필요합니다 — 격리한 행을 가리키는 자식을"
                        + " 찾게 합니다(VERIFY_REFERENCES_REQUIRED)");
            }
        }
        return errors;
    }

    /**
     * live 규칙 위반. 승인 fingerprint 에 매핑 대상 표가 없으면(목·비결속) 보지 않는다. 짝마다 자식 컬럼은 자식 대상, 부모 컬럼은
     * 부모 대상에 있어야 하고, 타입 계열(정수·문자, 그 밖은 같은 JDBC·native 타입)이 같아야 한다.
     */
    public static List<String> liveViolations(MappingSpec spec, TargetSchemaFingerprint target) {
        Objects.requireNonNull(spec, "spec");
        if (target == null || target.tables().isEmpty()) {
            return List.of();
        }
        List<String> errors = new ArrayList<>();
        for (TableMapping table : spec.tables()) {
            if (table == null || table.verify() == null) {
                continue;
            }
            String label = MappingIndex.label(table);
            TableMetadata child = table(target, table.target());
            for (int index = 0; index < table.verify().references().size(); index++) {
                VerifyReference reference = table.verify().references().get(index);
                if (!wellFormed(reference)) {
                    continue;
                }
                TableMetadata parent = table(target, reference.parent());
                if (child == null || parent == null) {
                    continue;
                }
                for (int pair = 0; pair < reference.columns().size(); pair++) {
                    String childName = reference.columns().get(pair).trim();
                    String parentName = reference.parentColumns().get(pair).trim();
                    ColumnMetadata childColumn = column(child, childName);
                    ColumnMetadata parentColumn = column(parent, parentName);
                    if (childColumn == null || parentColumn == null) {
                        errors.add(label + ": verify.references[" + index + "] 의 컬럼("
                                + (childColumn == null ? child.name() + "." + childName
                                : parent.name() + "." + parentName)
                                + ")이 대상에 없습니다(VERIFY_REFERENCE_COLUMN_MISSING)");
                        continue;
                    }
                    if (!sameFamily(childColumn, parentColumn)) {
                        errors.add(label + ": verify.references[" + index + "] 의 " + childName + " → "
                                + parent.name() + "." + parentName + " 은 타입 계열이 다릅니다"
                                + "(VERIFY_REFERENCE_TYPE_MISMATCH)");
                    }
                }
            }
        }
        return errors;
    }

    /** 키를 그대로 쓰는 표인가 — idStrategy 가 없고 identity 가 없거나 preserve 다. */
    public static boolean preservesKey(TableMapping table) {
        return table.idStrategy() == null
                && (table.identity() == null || table.identity().policy() == TargetIdentityPolicy.PRESERVE);
    }

    /** isolate 를 선언한 컬럼이 있는가. */
    public static boolean isolates(TableMapping table) {
        for (ColumnMapping column : table.columns()) {
            if (column != null && column.isolate() != null) {
                return true;
            }
        }
        return false;
    }

    /** 정수 계열(소수 자리 없는 수 포함)·문자 계열은 계열끼리, 그 밖은 같은 JDBC·native 타입끼리 짝이 맞는다. */
    static boolean sameFamily(ColumnMetadata left, ColumnMetadata right) {
        if (integral(left) && integral(right)) {
            return true;
        }
        if (TEXT.contains(left.jdbcType()) && TEXT.contains(right.jdbcType())) {
            return true;
        }
        return left.jdbcType() == right.jdbcType() && left.nativeType().equalsIgnoreCase(right.nativeType());
    }

    private static boolean integral(ColumnMetadata column) {
        return INTEGRAL.contains(column.jdbcType())
                || (DECIMAL.contains(column.jdbcType()) && column.decimalDigits() == 0);
    }

    /** {@code other} 의 verify.references 가 {@code table} 의 대상을 부모로 가리키는가. */
    private static boolean referencedBy(TableMapping other, TableMapping table) {
        if (other.verify() == null || table.target() == null) {
            return false;
        }
        for (VerifyReference reference : other.verify().references()) {
            if (reference != null && reference.parent() != null && sameTarget(table.target(), reference.parent())) {
                return true;
            }
        }
        return false;
    }

    private static boolean wellFormed(VerifyReference reference) {
        if (reference == null || reference.columns().isEmpty()
                || reference.columns().size() != reference.parentColumns().size()) {
            return false;
        }
        try {
            SourceIntrospector.qualifiedIdent(reference.parent() == null ? null : reference.parent().trim());
            Set<String> seen = new HashSet<>();
            for (String column : reference.columns()) {
                SourceIntrospector.ident(column == null ? null : column.trim());
                if (!seen.add(column.trim().toLowerCase(Locale.ROOT))) {
                    return false;
                }
            }
            for (String column : reference.parentColumns()) {
                SourceIntrospector.ident(column == null ? null : column.trim());
            }
            return true;
        } catch (IllegalArgumentException invalid) {
            return false;
        }
    }

    private static boolean sameTarget(String left, String right) {
        return left != null && right != null && left.trim().equalsIgnoreCase(right.trim());
    }

    /** {@code schema.table} 이나 {@code table} 표기의 fingerprint 표. 없으면 null. */
    private static TableMetadata table(TargetSchemaFingerprint target, String qualified) {
        if (qualified == null || qualified.isBlank()) {
            return null;
        }
        String[] parts = qualified.trim().split("\\.", -1);
        String schema = parts.length > 1 ? parts[parts.length - 2] : null;
        String name = parts[parts.length - 1];
        TableMetadata found = null;
        for (TableMetadata table : target.tables()) {
            if (table.name().equalsIgnoreCase(name)
                    && (schema == null || (table.schema() != null && table.schema().equalsIgnoreCase(schema)))) {
                if (found != null) {
                    return null;
                }
                found = table;
            }
        }
        return found;
    }

    private static ColumnMetadata column(TableMetadata table, String name) {
        for (ColumnMetadata column : table.columns()) {
            if (column.name().equalsIgnoreCase(name)) {
                return column;
            }
        }
        return null;
    }
}
