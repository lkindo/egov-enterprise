package nuri.migration.mapping;

import java.util.Objects;

/**
 * 매핑 하나를 가리는 키(ADR-0029 L3c). {@code source} 는 소스 표의 노드 키다 — 정적 검증은 소문자로 정규화한 소스
 * 표기, 플래너는 inventory stableId 를 쓴다. {@code mappingId} 는 실효 매핑 id 이고 기본 매핑은 빈 문자열이다.
 */
public record MappingKey(String source, String mappingId) {

    public MappingKey {
        Objects.requireNonNull(source, "source");
        Objects.requireNonNull(mappingId, "mappingId");
    }

    /** 문구 라벨. 기본 매핑은 소스 노드 키 그대로, 나머지는 {@code source#id} 다. */
    public String label() {
        return mappingId.isEmpty() ? source : source + "#" + mappingId;
    }
}
