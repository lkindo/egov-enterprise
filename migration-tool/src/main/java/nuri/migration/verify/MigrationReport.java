package nuri.migration.verify;

import nuri.migration.etl.EtlExecutor.TableResult;

import java.util.List;

/** 이관 결과 리포트(테이블별 read/written/errors + 종합 ok). */
public record MigrationReport(List<TableReport> tables, boolean ok) {

    public record TableReport(String source, String target, int read, int written, int errors) {}

    public static MigrationReport from(List<TableResult> results) {
        List<TableReport> tables = results.stream()
                .map(r -> new TableReport(r.sourceTable(), r.targetTable(), r.read(), r.written(), r.errors().size()))
                .toList();
        boolean ok = results.stream().allMatch(r -> r.errors().isEmpty());
        return new MigrationReport(tables, ok);
    }

    public String toSummary() {
        StringBuilder sb = new StringBuilder("=== Migration Report ===\n");
        for (TableReport t : tables) {
            sb.append(String.format("  %-24s -> %-24s read=%d written=%d errors=%d%n",
                    t.source(), t.target(), t.read(), t.written(), t.errors()));
        }
        sb.append(ok ? "RESULT: OK\n" : "RESULT: ERRORS PRESENT\n");
        return sb.toString();
    }
}
