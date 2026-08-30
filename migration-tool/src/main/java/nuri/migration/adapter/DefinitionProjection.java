package nuri.migration.adapter;

import java.util.Objects;

/** 정의 원문은 버리거나 hash만 보존한다. */
public record DefinitionProjection(DefinitionCaptureMode mode, ResultColumnProjection source) {

    public DefinitionProjection {
        mode = Objects.requireNonNull(mode, "mode");
        source = Objects.requireNonNull(source, "source");
        if (mode == DefinitionCaptureMode.NONE && source.present()) {
            throw new IllegalArgumentException("NONE definition projection must not read a column");
        }
        if (mode == DefinitionCaptureMode.HASH_ONLY && !source.present()) {
            throw new IllegalArgumentException("HASH_ONLY definition projection requires a column");
        }
    }

    public static DefinitionProjection none() {
        return new DefinitionProjection(DefinitionCaptureMode.NONE, ResultColumnProjection.absent());
    }

    public static DefinitionProjection hashOnly(String column) {
        return new DefinitionProjection(DefinitionCaptureMode.HASH_ONLY, ResultColumnProjection.column(column));
    }
}
