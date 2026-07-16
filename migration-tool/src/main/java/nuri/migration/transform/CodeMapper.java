package nuri.migration.transform;

import java.util.Map;

/** 코드값 매핑 적용: 레거시 코드 → 표준 코드. {@code "default"} 키로 미매핑 방어. */
public final class CodeMapper {

    private CodeMapper() {
    }

    public static String map(Map<String, String> codemap, String sourceValue) {
        if (codemap == null) {
            return sourceValue;
        }
        String mapped = codemap.get(sourceValue);
        if (mapped != null) {
            return mapped;
        }
        return codemap.getOrDefault("default", sourceValue);
    }
}
