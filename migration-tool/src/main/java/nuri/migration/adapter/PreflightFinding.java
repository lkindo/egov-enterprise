package nuri.migration.adapter;

import java.util.Objects;

/** 비밀·접속 문자열을 포함하지 않는 source preflight 판정. */
public record PreflightFinding(PreflightSeverity severity, String code, String message) {
    public PreflightFinding {
        severity = Objects.requireNonNull(severity, "severity");
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("code must not be blank");
        }
        if (message == null || message.isBlank()) {
            throw new IllegalArgumentException("message must not be blank");
        }
    }
}
