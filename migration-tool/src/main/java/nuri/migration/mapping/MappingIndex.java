package nuri.migration.mapping;

import nuri.migration.model.MappingSpec.TableMapping;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.regex.Pattern;

/**
 * 매핑과 그 소스 표의 관계를 판정하는 유일한 곳(ADR-0029 L3c). 정적 검증·실행 순서·실행기·플래너가 같은 규칙을 쓴다.
 *
 * <ul>
 *   <li>매핑은 (소스 노드 키, 실효 id) 로 유일하다. 같은 소스에서 id 를 생략할 수 있는 매핑은 하나뿐이고, 명시한 id 는
 *       mapping 전체에서 유일하다.</li>
 *   <li>keymap 소유 규칙 — 같은 소스에서 keymap 을 만드는 매핑(idStrategy·typed identity)은 많아야 하나다. fkRef·
 *       foreignKeys 의 부모 소스는 그 소유 매핑으로 풀린다. 소유 매핑이 없고 매핑이 하나뿐이면 그 매핑이다(부모의
 *       idStrategy 가 불완전하다는 오류는 검증기가 알린다). keymap 은 소스 표 단위 그대로라 같은 소스에서 서로 다른 생성
 *       ID 가 조용히 갈리는 경로를 이 규칙이 막는다.</li>
 *   <li>자기참조는 fkRef 가 자기 소스를 가리키고 이 매핑이 그 소스의 부모(소유 매핑)일 때뿐이다. 소유 매핑이 아닌
 *       매핑이 자기 소스를 가리키면 소유 매핑에 대한 일반 간선이다(1:1 확장 표의 대리키 공유).</li>
 * </ul>
 *
 * <p>소스 노드 키는 정적 검증이 소문자로 정규화한 소스 표기를, 플래너가 inventory stableId 를 쓴다. 같은 노드를 가리키는
 * 매핑들은 정규화한 소스 표기가 같아야 한다 — 제어 테이블의 {@code source_table} 문자열을 하나로 유지하기 위해서다.
 * 오류 문구는 소스 표기·매핑 id·고정 어휘만 담는다.</p>
 */
public final class MappingIndex {

    /** 매핑 id 형식. 원장의 mapping·via 형식과 같다. */
    public static final Pattern ID = Pattern.compile("[a-z][a-z0-9_]{0,62}");

    private final Function<String, String> sourceKeys;
    private final Map<MappingKey, TableMapping> byKey = new LinkedHashMap<>();
    private final Map<String, List<TableMapping>> bySource = new LinkedHashMap<>();
    private final Map<String, TableMapping> owners = new LinkedHashMap<>();
    private final List<String> errors = new ArrayList<>();

    private MappingIndex(List<TableMapping> tables, Function<String, String> sourceKeys) {
        this.sourceKeys = sourceKeys;
        Map<String, String> notations = new LinkedHashMap<>();
        Map<String, String> idSources = new LinkedHashMap<>();
        for (TableMapping table : tables) {
            if (table == null || table.source() == null || table.source().isBlank()) {
                continue;
            }
            String id = table.id();
            if (id != null && !ID.matcher(id).matches()) {
                errors.add(table.source() + ": 매핑 id 는 소문자로 시작하는 소문자·숫자·밑줄 63자 이내여야 합니다");
            }
            String source = sourceKeys.apply(table.source());
            if (source == null) {
                continue; // 플래너가 inventory 에서 찾지 못한 표는 그 사유로 따로 알린다.
            }
            String notation = normalize(table.source());
            String previousNotation = notations.putIfAbsent(source, notation);
            if (previousNotation != null && !previousNotation.equals(notation)) {
                errors.add("같은 소스 표를 가리키는 매핑의 소스 표기가 다릅니다: '" + table.source()
                        + "' — 분할한 매핑은 소스 표를 같은 표기로 적으십시오");
            }
            if (id != null) {
                String previousSource = idSources.putIfAbsent(id, source);
                if (previousSource != null && !previousSource.equals(source)) {
                    errors.add("매핑 id '" + id + "' 를 두 소스 표가 씁니다 — 매핑 id 는 mapping 전체에서 유일해야 합니다");
                }
            }
            MappingKey key = new MappingKey(source, table.effectiveId());
            if (byKey.putIfAbsent(key, table) != null) {
                errors.add(id == null
                        ? "중복 소스 테이블 매핑 금지: '" + table.source() + "' — 한 소스 표를 나누려면 매핑마다 id 를"
                                + " 두십시오(id 를 생략할 수 있는 매핑은 하나)"
                        : "중복 소스 테이블 매핑 금지: '" + table.source() + "#" + id + "' — 같은 소스의 매핑 id 가"
                                + " 두 번 있습니다");
                continue;
            }
            bySource.computeIfAbsent(source, ignored -> new ArrayList<>()).add(table);
            if (table.ownsKeyMap() && owners.putIfAbsent(source, table) != null) {
                errors.add(table.source() + ": keymap 을 만드는 매핑(idStrategy·identity)이 둘 이상입니다 — 한 소스 표의"
                        + " keymap 은 한 매핑만 만듭니다. 다른 매핑은 그 키를 fkRef 로 가리키십시오");
            }
        }
    }

    /** 정적 검증용 — 소스 노드 키는 소문자로 정규화한 소스 표기다. */
    public static MappingIndex of(List<TableMapping> tables) {
        return of(tables, MappingIndex::normalize);
    }

    /** 소스 표기를 노드 키로 바꾸는 규칙을 준다. 바꿀 수 없으면 null 을 돌려 그 매핑을 색인에서 뺀다. */
    public static MappingIndex of(List<TableMapping> tables, Function<String, String> sourceKeys) {
        Objects.requireNonNull(tables, "tables");
        Objects.requireNonNull(sourceKeys, "sourceKeys");
        return new MappingIndex(tables, sourceKeys);
    }

    /** 판정 오류. 비어 있으면 매핑 키가 모두 유일하고 소스마다 keymap 소유 매핑이 많아야 하나다. */
    public List<String> errors() {
        return Collections.unmodifiableList(errors);
    }

    /** 매핑의 키. 소스가 비었거나 노드 키로 바꿀 수 없으면 null 이다. */
    public MappingKey key(TableMapping table) {
        if (table == null || table.source() == null || table.source().isBlank()) {
            return null;
        }
        String source = sourceKeys.apply(table.source());
        return source == null ? null : new MappingKey(source, table.effectiveId());
    }

    /** 키가 가리키는 매핑. 없으면 null. */
    public TableMapping find(MappingKey key) {
        return key == null ? null : byKey.get(key);
    }

    /** 색인한 매핑 키(선언 순서). */
    public List<MappingKey> keys() {
        return List.copyOf(byKey.keySet());
    }

    /** 이 소스 표를 읽는 매핑(선언 순서). */
    public List<TableMapping> mappingsOf(String declaredSource) {
        String source = sourceKey(declaredSource);
        return source == null ? List.of() : List.copyOf(bySource.getOrDefault(source, List.of()));
    }

    /** 이 소스 표의 keymap 소유 매핑. 없으면 null. */
    public TableMapping owner(String declaredSource) {
        String source = sourceKey(declaredSource);
        return source == null ? null : owners.get(source);
    }

    /**
     * fkRef·foreignKeys 가 이 소스를 부모로 가리킬 때의 부모 매핑 — 소유 매핑, 없고 매핑이 하나뿐이면 그 매핑이다.
     * 매핑이 없거나, 여럿인데 소유 매핑이 없으면 null 이다.
     */
    public TableMapping parent(String declaredSource) {
        String source = sourceKey(declaredSource);
        if (source == null) {
            return null;
        }
        TableMapping owner = owners.get(source);
        if (owner != null) {
            return owner;
        }
        List<TableMapping> mappings = bySource.getOrDefault(source, List.of());
        return mappings.size() == 1 ? mappings.getFirst() : null;
    }

    /** 부모 소스를 이 매핑 자신으로 푸는가 — fkRef·foreignKeys 의 자기참조다. */
    public boolean resolvesTo(String declaredSource, TableMapping table) {
        TableMapping parent = parent(declaredSource);
        MappingKey self = key(table);
        return parent != null && self != null && self.equals(key(parent));
    }

    /** 이 매핑과 같은 소스 표를 가리키는가. */
    public boolean sameSource(TableMapping table, String declaredSource) {
        MappingKey self = key(table);
        String source = sourceKey(declaredSource);
        return self != null && source != null && self.source().equals(source);
    }

    /** 문구 라벨 — 기본 매핑은 소스 표기 그대로, 나머지는 {@code source#id} 다. */
    public static String label(TableMapping table) {
        if (table == null) {
            return "<null>";
        }
        return table.id() == null ? String.valueOf(table.source()) : table.source() + "#" + table.id();
    }

    private String sourceKey(String declaredSource) {
        return declaredSource == null || declaredSource.isBlank() ? null : sourceKeys.apply(declaredSource);
    }

    private static String normalize(String value) {
        return value.trim().toLowerCase(Locale.ROOT);
    }
}
