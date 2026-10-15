package nuri.migration.etl;

import nuri.migration.mapping.MappingIndex;
import nuri.migration.mapping.MappingKey;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.CompositeForeignKey;
import nuri.migration.model.MappingSpec.TableMapping;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * {@code fkRef} 선언으로 이루는 매핑 의존 DAG 를 위상정렬(Kahn)해 <b>부모 먼저</b> 적재 순서를 만든다.
 *
 * <p>부모 PK 가 자식 FK 번역보다 먼저 채번돼야 하므로(키맵 keystone), 선언 순서가 아니라 의존 순서로
 * 실행해야 참조 무결성이 성립한다. 자기참조(fkRef 가 자기 소스이고 이 매핑이 그 소스의 keymap 소유 매핑)는 간선에서
 * 제외하고 실행기가 선채번/후 FK 변환 2-pass로 처리한다. 서로 다른 매핑의 사이클은 실행 순서를 임의로 만들지 않고 차단한다.
 *
 * <p>[ADR-0029 L3c] 노드는 소스 이름이 아니라 매핑 키(소스, 매핑 id)다 — 한 소스를 둘로 나누면 두 노드다. 간선은
 * {@link MappingIndex#parent} 가 푸는 keymap 소유 매핑으로 잇는다. 그래서 소유 매핑이 아닌 매핑이 자기 소스를 fkRef 로
 * 가리키면 소유 매핑 → 그 매핑 간선이고, 형제 매핑을 거치는 의존은 소스 단위로는 순환처럼 보여도 매핑 단위로는 DAG 다.
 * 같은 키가 둘이면 순서를 정하지 않고 멈춘다.
 */
final class TableOrderer {

    private TableOrderer() {
    }

    static List<TableMapping> order(List<TableMapping> tables) {
        MappingIndex index = MappingIndex.of(tables);
        Map<MappingKey, TableMapping> nodes = new LinkedHashMap<>();
        for (TableMapping t : tables) {
            MappingKey key = nodeKey(index, t);
            if (nodes.putIfAbsent(key, t) != null) {
                throw new IllegalArgumentException("같은 매핑 키가 두 번 있어 실행 순서를 결정할 수 없습니다: " + key.label());
            }
        }

        Map<MappingKey, List<MappingKey>> children = new LinkedHashMap<>();
        Map<MappingKey, Integer> indegree = new LinkedHashMap<>();
        for (MappingKey key : nodes.keySet()) {
            indegree.put(key, 0);
            children.put(key, new ArrayList<>());
        }

        for (Map.Entry<MappingKey, TableMapping> node : nodes.entrySet()) {
            MappingKey self = node.getKey();
            TableMapping t = node.getValue();
            Set<MappingKey> parents = new LinkedHashSet<>();
            for (ColumnMapping c : t.columns()) {
                String ref = c.fkRef();
                if (ref == null || ref.isBlank()) {
                    continue;
                }
                addParent(index, ref, self, parents);
            }
            for (CompositeForeignKey foreignKey : t.foreignKeys()) {
                addParent(index, foreignKey.parentSource(), self, parents);
            }
            for (MappingKey parent : parents) {
                children.get(parent).add(self);
                indegree.merge(self, 1, Integer::sum);
            }
        }

        // indegree 0 노드를 원래 선언 순서로 큐잉(결정적)
        Deque<MappingKey> queue = new ArrayDeque<>();
        for (MappingKey key : nodes.keySet()) {
            if (indegree.get(key) == 0) {
                queue.add(key);
            }
        }

        List<TableMapping> ordered = new ArrayList<>();
        Set<MappingKey> emitted = new HashSet<>();
        while (!queue.isEmpty()) {
            MappingKey n = queue.poll();
            if (!emitted.add(n)) {
                continue;
            }
            ordered.add(nodes.get(n));
            for (MappingKey child : children.getOrDefault(n, List.of())) {
                if (indegree.merge(child, -1, Integer::sum) == 0) {
                    queue.add(child);
                }
            }
        }

        if (emitted.size() != nodes.size()) {
            List<String> blocked = nodes.keySet().stream()
                    .filter(key -> !emitted.contains(key))
                    .map(MappingKey::label)
                    .toList();
            throw new IllegalArgumentException("교차 테이블 FK 순환으로 실행 순서를 결정할 수 없습니다: " + blocked);
        }
        return ordered;
    }

    /** 부모 소스를 소유 매핑으로 풀어 더한다. 자기참조·외부참조·풀 수 없는 부모는 위상 간선에서 제외한다. */
    private static void addParent(MappingIndex index, String parentSource, MappingKey self, Set<MappingKey> parents) {
        MappingKey parent = index.key(index.parent(parentSource));
        if (parent != null && !parent.equals(self)) {
            parents.add(parent);
        }
    }

    private static MappingKey nodeKey(MappingIndex index, TableMapping t) {
        MappingKey key = index.key(t);
        return key == null ? new MappingKey("", t.effectiveId()) : key;
    }
}
