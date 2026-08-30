package nuri.migration.artifact;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.StreamReadFeature;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.io.UncheckedIOException;

/** 같은 의미의 값을 언제나 같은 UTF-8 JSON byte로 만드는 내부 지원 코드. */
final class CanonicalJsonSupport {

    private static final ObjectMapper MAPPER = JsonMapper.builder()
            .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
            .enable(MapperFeature.SORT_PROPERTIES_ALPHABETICALLY)
            .enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS)
            .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .build();

    private CanonicalJsonSupport() {}

    static byte[] bytes(Object value) {
        try {
            return MAPPER.writeValueAsBytes(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("canonical JSON 생성 실패", exception);
        }
    }

    static String string(Object value) {
        try {
            return MAPPER.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("canonical JSON 생성 실패", exception);
        }
    }

    static JsonNode tree(Object value) {
        return MAPPER.valueToTree(value);
    }

    static JsonNode parseTree(String json) {
        try {
            return MAPPER.readTree(json);
        } catch (IOException exception) {
            throw new UncheckedIOException("JSON artifact 파싱 실패", exception);
        }
    }

    static <T> T read(String json, Class<T> type) {
        try {
            return MAPPER.readValue(json, type);
        } catch (IOException exception) {
            throw new UncheckedIOException("JSON artifact 파싱 실패", exception);
        }
    }
}
