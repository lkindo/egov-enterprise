package nuri.migration.etl;

import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.TableMapping;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * {@code fkRef} 선언으로 이루는 테이블 의존 DAG 를 위상정렬(Kahn)해 <b>부모 먼저</b> 적재 순서를 만든다.
 *
 * <p>부모 PK 가 자식 FK 번역보다 먼저 채번돼야 하므로(키맵 keystone), 선언 순서가 아니라 의존 순서로
 * 실행해야 참조 무결성이 성립한다. 자기참조(fkRef == 자기 소스)는 간선에서 제외하고 실행기가
 * 선채번/후 FK 변환 2-pass로 처리한다. 서로 다른 테이블의 사이클은 실행 순서를 임의로 만들지 않고 차단한다.
 */
final class TableOrderer {

    private TableOrderer() {
    }

    static List<TableMapping> order(List<TableMapping> tables) {
        Map<String, TableMapping> byName = new LinkedHashMap<>();
        for (TableMapping t : tables) {
            if (t.source() != null) {
                byName.put(t.source().toLowerCase(), t);
            }
        }

        Map<String, List<String>> children = new LinkedHashMap<>();
        Map<String, Integer> indegree = new LinkedHashMap<>();
        for (TableMapping t : tables) {
            indegree.putIfAbsent(nodeKey(t), 0);
            children.putIfAbsent(nodeKey(t), new ArrayList<>());
        }

        for (TableMapping t : tables) {
            String self = nodeKey(t);
            for (ColumnMapping c : t.columns()) {
                String ref = c.fkRef();
                if (ref == null || ref.isBlank()) {
                    continue;
                }
                String parent = ref.toLowerCase();
                if (parent.equals(self) || !byName.containsKey(parent)) {
                    continue; // 자기참조·외부참조는 위상 간선에서 제외
                }
                children.get(parent).add(self);
                indegree.merge(self, 1, (a, b) -> Integer.sum(a, b));
            }
        }

        // indegree 0 노드를 원래 선언 순서로 큐잉(결정적)
        Deque<String> queue = new ArrayDeque<>();
        for (TableMapping t : tables) {
            if (indegree.get(nodeKey(t)) == 0) {
                queue.add(nodeKey(t));
            }
        }

        List<TableMapping> ordered = new ArrayList<>();
        java.util.Set<String> emitted = new java.util.HashSet<>();
        while (!queue.isEmpty()) {
            String n = queue.poll();
            if (!emitted.add(n)) {
                continue;
            }
            ordered.add(byName.get(n));
            for (String child : children.getOrDefault(n, List.of())) {
                if (indegree.merge(child, -1, (a, b) -> Integer.sum(a, b)) == 0) {
                    queue.add(child);
                }
            }
        }

        if (emitted.size() != byName.size()) {
            List<String> blocked = tables.stream()
                    .map(TableOrderer::nodeKey)
                    .filter(name -> !emitted.contains(name))
                    .toList();
            throw new IllegalArgumentException("교차 테이블 FK 순환으로 실행 순서를 결정할 수 없습니다: " + blocked);
        }
        return ordered;
    }

    private static String nodeKey(TableMapping t) {
        return t.source() == null ? "" : t.source().toLowerCase();
    }
}
