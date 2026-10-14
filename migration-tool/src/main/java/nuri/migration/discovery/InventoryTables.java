package nuri.migration.discovery;

import nuri.migration.discovery.CatalogObject.ObjectReference;

import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

/**
 * mapping·원장·skeleton 이 쓰는 소스 표 표기를 승인 inventory 의 표와 컬럼으로 해석한다(ADR-0029 L3a-2). 플래너·생성기·
 * 원장 coverage 가 같은 규칙을 쓴다 — 규칙이 둘이면 한쪽이 찾은 표를 다른 쪽이 못 찾는다.
 *
 * <p>표 표기는 {@code table}·{@code schema.table}·{@code catalog.schema.table} 이다. 따옴표가 필요한(quoted) 표는
 * 대소문자를 가리고 나머지는 가리지 않는다. 컬럼은 표의 {@code referenceId} 에 의존하는 COLUMN 객체를 모두 나열하고
 * (승인 load 표면 게이트와 같은 규칙), {@code originalName} 과 quoted 여부로 대조한다. 원장은 컬럼을 대소문자 없이
 * 가리므로 대소문자만 다른 컬럼이 한 표에 있으면 그 표는 판정할 수 없다.</p>
 */
public final class InventoryTables {

    private InventoryTables() {
    }

    /** 표 해석 결과. 찾았으면 {@code problem} 이 null 이다. 문구는 고정 어휘다. */
    public record Resolution(CatalogObject table, String problem) {

        public boolean resolved() {
            return table != null;
        }
    }

    /** 한 표의 컬럼 열거 결과. 판정할 수 없으면 {@code problem} 이 있고 컬럼은 비어 있다. 문구는 고정 어휘와 컬럼 이름이다. */
    public record TableColumns(List<CatalogObject> columns, String problem) {

        public TableColumns {
            columns = List.copyOf(columns);
        }
    }

    /** 표기가 이 inventory 표를 가리키는가. 1·2·3 부분 이름만 받는다. */
    public static boolean matches(String declaredSource, CatalogObject table) {
        if (declaredSource == null || table == null) {
            return false;
        }
        String[] parts = declaredSource.trim().split("\\.", -1);
        if (parts.length < 1 || parts.length > 3) {
            return false;
        }
        boolean caseSensitive = table.quoted();
        if (parts.length == 1) {
            return identifierEquals(parts[0], table.name(), caseSensitive);
        }
        if (parts.length == 2) {
            return identifierEquals(parts[0], table.schema(), caseSensitive)
                    && identifierEquals(parts[1], table.name(), caseSensitive);
        }
        return identifierEquals(parts[0], table.catalog(), caseSensitive)
                && identifierEquals(parts[1], table.schema(), caseSensitive)
                && identifierEquals(parts[2], table.name(), caseSensitive);
    }

    /** 표기가 가리키는 inventory TABLE 객체들. 없거나 둘 이상일 수 있다. */
    public static List<CatalogObject> find(CatalogSnapshot snapshot, String declaredSource) {
        Objects.requireNonNull(snapshot, "snapshot");
        return snapshot.objects().stream()
                .filter(object -> object.kind() == ObjectKind.TABLE)
                .filter(table -> matches(declaredSource, table))
                .toList();
    }

    /** 표기를 inventory 표 하나로 해석한다. 찾지 못하거나 모호하면 그 이유를 돌려준다. */
    public static Resolution resolve(CatalogSnapshot snapshot, String declaredSource) {
        if (declaredSource == null || declaredSource.isBlank()) {
            return new Resolution(null, "소스 표가 비어 있습니다");
        }
        List<CatalogObject> tables = find(snapshot, declaredSource);
        if (tables.isEmpty()) {
            return new Resolution(null, "소스 표를 inventory 에서 찾을 수 없습니다");
        }
        if (tables.size() > 1) {
            return new Resolution(null, "소스 표가 inventory 에서 모호합니다(같은 이름의 표가 둘 이상) — catalog 까지 적으세요");
        }
        return new Resolution(tables.getFirst(), null);
    }

    /** 컬럼이 이 표({@link CatalogObject#referenceId()})에 속하는가. */
    public static boolean belongsTo(CatalogObject column, String tableReferenceId) {
        for (ObjectReference dependency : column.dependencies()) {
            if (dependency.kind() == ObjectKind.TABLE && tableReferenceId.equals(dependency.stableId())) {
                return true;
            }
        }
        return false;
    }

    /**
     * 표의 COLUMN 객체를 모두 나열한다. 순서는 컬럼 정의 순서({@code ordinal})이고 같으면 이름 순이다 — inventory 산출물은
     * 객체를 식별자 해시 순으로 담으므로 그 순서를 쓰지 않는다. COLUMN 객체가 없거나, 이름(originalName)이 없는 컬럼이
     * 있거나, 대소문자만 다른 컬럼이 있으면 원장과 대조할 수 없으므로 이유를 돌려준다.
     */
    public static TableColumns columns(CatalogSnapshot snapshot, CatalogObject table) {
        Objects.requireNonNull(snapshot, "snapshot");
        Objects.requireNonNull(table, "table");
        String reference = table.referenceId();
        List<CatalogObject> columns = snapshot.objects().stream()
                .filter(object -> object.kind() == ObjectKind.COLUMN)
                .filter(column -> belongsTo(column, reference))
                .sorted(Comparator.comparingInt(InventoryTables::ordinal)
                        .thenComparing(column -> Objects.toString(column.attributes().get("originalName"), "")))
                .toList();
        if (columns.isEmpty()) {
            return new TableColumns(List.of(), "inventory 에 이 표의 컬럼(COLUMN) 객체가 없습니다 — COLUMN 을 포함해"
                    + " discover 를 다시 실행하세요");
        }
        Set<String> seen = new HashSet<>();
        Set<String> pairs = new LinkedHashSet<>();
        for (CatalogObject column : columns) {
            String name = column.attributes().get("originalName");
            if (name == null || name.isBlank()) {
                return new TableColumns(List.of(), "컬럼 이름(originalName)이 없는 COLUMN 객체가 있어 판정할 수 없습니다");
            }
            String folded = name.toLowerCase(Locale.ROOT);
            if (!seen.add(folded)) {
                pairs.add(folded);
            }
        }
        if (!pairs.isEmpty()) {
            return new TableColumns(List.of(), "대소문자만 다른 컬럼(" + String.join(", ", pairs)
                    + ")이 있어 판정할 수 없습니다 — 원장은 컬럼을 대소문자 없이 가립니다");
        }
        return new TableColumns(columns, null);
    }

    /** 원장·mapping 의 컬럼 이름이 이 COLUMN 객체를 가리키는가. quoted 컬럼은 대소문자를 가린다. */
    public static boolean columnMatches(String declaredColumn, CatalogObject column) {
        return declaredColumn != null
                && identifierEquals(declaredColumn, column.attributes().get("originalName"), column.quoted());
    }

    /** 컬럼의 원래 이름(inventory 표기). */
    public static String columnName(CatalogObject column) {
        return column.attributes().get("originalName");
    }

    /** 컬럼 정의 순서. 없거나 읽을 수 없으면 맨 뒤다. */
    private static int ordinal(CatalogObject column) {
        String ordinal = column.attributes().get("ordinal");
        if (ordinal == null) {
            return Integer.MAX_VALUE;
        }
        try {
            return Integer.parseInt(ordinal.trim());
        } catch (NumberFormatException unreadable) {
            return Integer.MAX_VALUE;
        }
    }

    private static boolean identifierEquals(String declared, String actual, boolean caseSensitive) {
        if (actual == null) {
            return false;
        }
        return caseSensitive
                ? declared.equals(actual)
                : declared.toLowerCase(Locale.ROOT).equals(actual.toLowerCase(Locale.ROOT));
    }
}
