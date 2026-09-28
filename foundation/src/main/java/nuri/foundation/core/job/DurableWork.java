package nuri.foundation.core.job;

import java.util.Objects;
import java.util.UUID;

/** Immutable intent. The payload is a bounded reference, never a copy of a secret or file. */
public record DurableWork(UUID key, String type, String payload) {
    public DurableWork {
        Objects.requireNonNull(key, "key");
        if (type == null || !type.matches("[A-Z][A-Z0-9_]{0,99}")) {
            throw new IllegalArgumentException("Invalid durable work type");
        }
        if (payload == null || payload.length() > 4000) {
            throw new IllegalArgumentException("Durable work payload exceeds its storage contract");
        }
    }
}
