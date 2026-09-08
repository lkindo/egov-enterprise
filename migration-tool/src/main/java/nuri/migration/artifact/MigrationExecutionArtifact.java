package nuri.migration.artifact;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.migration.etl.MigrationMode;
import nuri.migration.plan.MigrationPlan;
import nuri.migration.verify.MigrationReport;

import java.time.Instant;
import java.util.List;

/** 행 값·키·예외 원문 없이 승인 digest와 실제 검증 건수만 남기는 실행 증거. */
public record MigrationExecutionArtifact(int schemaVersion, String planDigest, String mappingDigest,
        String targetDigest, String mode, String status, String startedAt, String updatedAt,
        List<TableCounts> tables) {
    public record TableCounts(String source, String target, long read, long written, long errors,
                              long targetRows, String status) { }

    public static String encode(MigrationPlan plan, MigrationMode mode, String status,
                                Instant startedAt, MigrationReport report) {
        List<TableCounts> counts = report == null ? List.of() : report.tables().stream()
                .map(table -> new TableCounts(table.source(), table.target(), table.read(), table.written(),
                        table.errors(), table.targetRows(), table.status().name())).toList();
        var artifact = new MigrationExecutionArtifact(1, CanonicalArtifactDigest.sha256(plan),
                plan.mappingDigest(), plan.targetSchemaDigest(), mode.name(), status,
                startedAt.toString(), Instant.now().toString(), counts);
        try {
            String json = new ObjectMapper().writeValueAsString(artifact);
            ArtifactRedactionGuard.assertSafe(new ObjectMapper().readTree(json));
            return json;
        } catch (JsonProcessingException failure) {
            throw new IllegalArgumentException("execution artifact encoding failed");
        }
    }
}
