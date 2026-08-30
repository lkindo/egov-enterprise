package nuri.migration.identity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Locale;

/** 타깃 PK를 보존, 재매핑 또는 DB 생성값으로 확보하는 방식. */
public enum TargetIdentityPolicy {
    PRESERVE,
    REMAP,
    TARGET_GENERATED;

    @JsonCreator
    public static TargetIdentityPolicy parse(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("target identity policy must not be blank");
        }
        try {
            return valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("unsupported target identity policy: " + value, e);
        }
    }

    @JsonValue
    public String externalName() {
        return name().toLowerCase(Locale.ROOT);
    }
}
