package nuri.migration.source;

import java.util.List;

/** 소스 스키마 인트로스펙션 결과. */
public record SourceCatalog(List<SourceTable> tables) {

    public record SourceTable(String name, List<SourceColumn> columns, long rowCount) {}

    public record SourceColumn(String name, String type, boolean nullable) {}

    public SourceTable table(String name) {
        return tables.stream()
                .filter(t -> t.name().equalsIgnoreCase(name))
                .findFirst()
                .orElse(null);
    }
}
