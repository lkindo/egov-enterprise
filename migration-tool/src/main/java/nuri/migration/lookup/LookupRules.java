package nuri.migration.lookup;

import nuri.migration.mapping.MappingIndex;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.Lookup;
import nuri.migration.model.MappingSpec.LookupCardinality;
import nuri.migration.model.MappingSpec.TableMapping;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * 조회 조인 선언(ADR-0029 L3d)의 정적 규칙. 정적 검증기와 실행기가 같은 판정을 쓴다. 오류 문구는 소스 표기·매핑 id·별칭과
 * 고정 어휘만 담는다.
 *
 * <ul>
 *   <li>조회를 쓰는 매핑에는 id 가 있어야 한다 — 원장의 {@code via.mapping} 이 이 id 를 가리킨다.</li>
 *   <li>조회를 쓰는 매핑에는 순서 키가 있어야 한다 — 순서 없는 읽기는 결과를 연 채 chunk 를 처리하고, MySQL 은 열린
 *       스트리밍 결과가 있는 동안 다른 문장을 거부한다. 그래서 모드와 무관하게 요구한다.</li>
 *   <li>별칭은 매핑 id 형식이고 매핑 안에서 유일하다. 키는 단일 컬럼 하나씩이다. {@code at_most_one} 은 0 이상의
 *       {@code maxMissing} 이 필요하고 {@code exactly_one} 에는 둘 수 없다.</li>
 *   <li>컬럼 항목의 {@code alias.COLUMN} 은 선언한 별칭만 가리키고, fkRef 로 번역할 수 없다. 어떤 컬럼도 읽지 않는
 *       조회는 거부한다.</li>
 * </ul>
 */
public final class LookupRules {

    /** 별칭 형식. 원장의 via.lookup 형식과 같다. */
    public static final Pattern ALIAS = MappingIndex.ID;
    private static final Pattern IDENTIFIER = Pattern.compile("[A-Za-z_][A-Za-z0-9_$]*");
    private static final Pattern QUALIFIED = Pattern.compile(
            "[A-Za-z_][A-Za-z0-9_$]*(\\.[A-Za-z_][A-Za-z0-9_$]*){0,2}");

    private LookupRules() {
    }

    /** mapping 전체의 위반. 비어 있으면 실행기가 조회를 수행할 수 있다. */
    public static List<String> violations(List<TableMapping> tables) {
        Objects.requireNonNull(tables, "tables");
        List<String> errors = new ArrayList<>();
        for (TableMapping table : tables) {
            if (table != null) {
                errors.addAll(violations(table));
            }
        }
        return errors;
    }

    /** 매핑 하나의 위반. */
    public static List<String> violations(TableMapping table) {
        Objects.requireNonNull(table, "table");
        List<String> errors = new ArrayList<>();
        String label = MappingIndex.label(table);
        Set<String> aliases = new HashSet<>();
        if (!table.lookups().isEmpty()) {
            if (table.id() == null) {
                errors.add(label + ": 조회 조인(lookups)을 쓰는 매핑에는 id 가 필요합니다 — 원장의 via.mapping 이 이 id 를"
                        + " 가리킵니다");
            }
            if (table.effectiveOrderKeys().isEmpty()) {
                errors.add(label + ": 조회 조인(lookups)에는 orderBy/orderByKeys 가 필수입니다 — 순서 없는 읽기는 결과를 연 채"
                        + " 조회 문장을 보낼 수 없습니다");
            }
        }
        for (int index = 0; index < table.lookups().size(); index++) {
            Lookup lookup = table.lookups().get(index);
            if (lookup == null) {
                errors.add(label + ": lookups[" + index + "] 항목은 null 일 수 없습니다");
                continue;
            }
            String alias = lookup.alias();
            if (alias == null || !ALIAS.matcher(alias).matches()) {
                errors.add(label + ": lookups[" + index + "] 의 alias 는 소문자로 시작하는 소문자·숫자·밑줄 63자 이내여야"
                        + " 합니다");
                continue;
            }
            String at = label + ".lookups[" + alias + "]";
            if (!aliases.add(alias)) {
                errors.add(at + ": 같은 별칭을 두 번 선언했습니다");
            }
            if (lookup.source() == null || !QUALIFIED.matcher(lookup.source()).matches()) {
                errors.add(at + ": source 는 조회할 소스 표(schema.table)여야 합니다");
            }
            if (lookup.key() == null || !identifier(lookup.key().from()) || !identifier(lookup.key().to())) {
                errors.add(at + ": key 에는 이 매핑의 컬럼(from)과 조회 표의 컬럼(to)이 하나씩 필요합니다 — 복합 키는 받지"
                        + " 않습니다");
            }
            if (lookup.cardinality() == null) {
                errors.add(at + ": cardinality(exactly_one·at_most_one)가 필요합니다");
            } else if (lookup.cardinality() == LookupCardinality.AT_MOST_ONE
                    && (lookup.maxMissing() == null || lookup.maxMissing() < 0)) {
                errors.add(at + ": at_most_one 에는 0 이상의 maxMissing 이 필요합니다 — 짝 없는 행을 몇 행까지 받을지"
                        + " 정합니다");
            } else if (lookup.cardinality() == LookupCardinality.EXACTLY_ONE && lookup.maxMissing() != null) {
                errors.add(at + ": exactly_one 에는 maxMissing 을 둘 수 없습니다 — 짝 없는 행은 멈춥니다");
            }
        }
        Set<String> read = new HashSet<>();
        for (ColumnMapping column : table.columns()) {
            LookupRef ref = column == null ? null : LookupRef.parse(column.source());
            if (ref == null) {
                continue;
            }
            String at = label + "." + column.target();
            if (table.lookup(ref.alias()) == null) {
                errors.add(at + ": 조회 별칭 '" + safe(ref.alias()) + "' 를 이 매핑의 lookups 에 선언하지 않았습니다");
                continue;
            }
            read.add(ref.alias());
            if (!identifier(ref.column())) {
                errors.add(at + ": 조회 컬럼은 별칭.컬럼 형식이어야 합니다");
            }
            if (column.fkRef() != null && !column.fkRef().isBlank()) {
                errors.add(at + ": 조회한 컬럼은 fkRef 로 번역할 수 없습니다 — 부모 키는 이 매핑 소스의 컬럼에서 읽으세요");
            }
        }
        for (Lookup lookup : table.lookups()) {
            if (lookup != null && lookup.alias() != null && ALIAS.matcher(lookup.alias()).matches()
                    && !read.contains(lookup.alias())) {
                errors.add(label + ".lookups[" + lookup.alias() + "]: 어떤 컬럼도 읽지 않는 조회입니다 — 쓰지 않으면"
                        + " 지우세요");
            }
        }
        return errors;
    }

    private static boolean identifier(String value) {
        return value != null && IDENTIFIER.matcher(value).matches();
    }

    /** 별칭 자리에 값이 들어가지 않게 식별자 형식일 때만 싣는다. */
    private static String safe(String alias) {
        return alias != null && IDENTIFIER.matcher(alias).matches() && alias.length() <= 63 ? alias : "<형식 밖>";
    }
}
