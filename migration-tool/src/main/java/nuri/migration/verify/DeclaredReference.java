package nuri.migration.verify;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;

/**
 * [ADR-0029 L4 D2] 대사할 참조 하나 — 자식 표의 컬럼이 부모 표의 컬럼을 가리킨다. 물리 FK·mapping 선언
 * ({@code verify.references})·fkRef/foreignKeys 에서 온다. 표는 {@code schema.table} 이고 이름만 담는다.
 */
public record DeclaredReference(String child, List<String> childColumns, String parent, List<String> parentColumns,
                                Origin origin) {

    /** 참조의 출처. */
    public enum Origin { PHYSICAL, DECLARED, FKREF }

    public DeclaredReference {
        child = requireText(child, "child");
        parent = requireText(parent, "parent");
        childColumns = List.copyOf(Objects.requireNonNull(childColumns, "childColumns"));
        parentColumns = List.copyOf(Objects.requireNonNull(parentColumns, "parentColumns"));
        if (childColumns.isEmpty() || childColumns.size() != parentColumns.size()) {
            throw new IllegalArgumentException("reference columns must pair up");
        }
        origin = Objects.requireNonNull(origin, "origin");
    }

    /** 같은 자식·부모·컬럼 짝(순서 무관, 대소문자 무시)이면 같은 참조다. 출처는 보지 않는다. */
    public boolean sameAs(DeclaredReference other) {
        return child.equalsIgnoreCase(other.child) && parent.equalsIgnoreCase(other.parent)
                && pairs().equals(other.pairs());
    }

    Set<String> pairs() {
        Set<String> pairs = new TreeSet<>();
        for (int i = 0; i < childColumns.size(); i++) {
            pairs.add(childColumns.get(i).toLowerCase(Locale.ROOT) + '\u0000'
                    + parentColumns.get(i).toLowerCase(Locale.ROOT));
        }
        return pairs;
    }

    /** 같은 참조를 하나로 합친다. 먼저 온 것을 남긴다. */
    static List<DeclaredReference> distinct(List<DeclaredReference> references) {
        List<DeclaredReference> distinct = new ArrayList<>();
        for (DeclaredReference reference : references) {
            if (distinct.stream().noneMatch(reference::sameAs)) {
                distinct.add(reference);
            }
        }
        return distinct;
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value;
    }
}
