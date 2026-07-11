package nuri.migration.transform;

import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.UnaryOperator;

/**
 * 값 변환기 레지스트리 — {@code mapping.yml}의 {@code transform: <name>} 을 실제 함수로 해석.
 * 내장: trim / upper / lower / date(→LocalDate) / timestamp(→LocalDateTime).
 * 프로젝트별 확장은 {@link #register(String, UnaryOperator)}.
 */
@Component
public class TransformerRegistry {

    private final Map<String, UnaryOperator<Object>> transformers = new ConcurrentHashMap<>();

    public TransformerRegistry() {
        register("trim", v -> v == null ? null : v.toString().trim());
        register("upper", v -> v == null ? null : v.toString().toUpperCase());
        register("lower", v -> v == null ? null : v.toString().toLowerCase());
        register("date", v -> v == null ? null : LocalDate.parse(v.toString().trim(), DateTimeFormatter.ISO_LOCAL_DATE));
        register("timestamp", TransformerRegistry::parseTimestamp);
    }

    public final void register(String name, UnaryOperator<Object> fn) {
        transformers.put(name, fn);
    }

    public boolean has(String name) {
        return transformers.containsKey(name);
    }

    /** 변환기 적용. 이름이 비었으면 원본, 미등록이면 원본 반환(검증 단계가 경고). */
    public Object apply(String name, Object value) {
        if (name == null || name.isBlank()) {
            return value;
        }
        UnaryOperator<Object> fn = transformers.get(name);
        return fn == null ? value : fn.apply(value);
    }

    private static Object parseTimestamp(Object v) {
        if (v == null) {
            return null;
        }
        return LocalDateTime.parse(v.toString().trim().replace(' ', 'T'));
    }
}
