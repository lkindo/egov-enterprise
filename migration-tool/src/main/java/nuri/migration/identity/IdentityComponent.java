package nuri.migration.identity;

import nuri.migration.type.LogicalType;

import java.util.Objects;

/** 복합 identity를 이루는 순서 보존 컬럼 하나. SQL quoting은 target dialect가 담당한다. */
public record IdentityComponent(String column, LogicalType logicalType) {
    public IdentityComponent {
        Objects.requireNonNull(column, "column");
        if (column.isBlank() || !column.equals(column.trim())) {
            throw new IllegalArgumentException("identity column must be non-blank and trimmed");
        }
        Objects.requireNonNull(logicalType, "logicalType");
    }
}
