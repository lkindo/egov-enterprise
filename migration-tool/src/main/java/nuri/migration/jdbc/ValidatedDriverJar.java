package nuri.migration.jdbc;

import java.nio.file.Path;
import java.util.Objects;

/** 정책 검증 시점의 canonical local path와 content hash. */
public record ValidatedDriverJar(Path path, String sha256) {
    public ValidatedDriverJar {
        path = Objects.requireNonNull(path, "path");
        sha256 = Objects.requireNonNull(sha256, "sha256");
    }
}
