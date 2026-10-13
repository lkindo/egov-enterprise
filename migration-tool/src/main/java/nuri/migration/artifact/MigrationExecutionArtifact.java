package nuri.migration.artifact;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.plan.MigrationPlan;
import nuri.migration.verify.MigrationReport;

import java.time.Instant;
import java.util.List;

/**
 * 행 값·키·예외 원문 없이 승인 digest와 실제 검증 건수만 남기는 실행 증거.
 *
 * <p>{@code sequenceResets} 는 원본 키를 쓴 대상 컬럼의 시퀀스 재설정 기록이다(DEC-OPS-306) — 테이블·컬럼·시퀀스
 * 이름과 결과만 담고 키 최댓값이나 시퀀스 값은 담지 않는다.
 */
public record MigrationExecutionArtifact(int schemaVersion, String planDigest, String mappingDigest,
        String targetDigest, String mode, String status, String startedAt, String updatedAt,
        List<TableCounts> tables, List<SequenceResetRecord> sequenceResets) {
    public record TableCounts(String source, String target, long read, long written, long errors,
                              long targetRows, String status) { }

    public record SequenceResetRecord(String target, String column, String sequence, String action) { }

    public static String encode(MigrationPlan plan, MigrationMode mode, String status,
                                Instant startedAt, MigrationReport report) {
        return encode(plan, mode, status, startedAt, report, List.of());
    }

    public static String encode(MigrationPlan plan, MigrationMode mode, String status,
                                Instant startedAt, MigrationReport report, List<EtlExecutor.TableResult> results) {
        List<TableCounts> counts = report == null ? List.of() : report.tables().stream()
                .map(table -> new TableCounts(table.source(), table.target(), table.read(), table.written(),
                        table.errors(), table.targetRows(), table.status().name())).toList();
        List<SequenceResetRecord> resets = results == null ? List.of() : results.stream()
                .flatMap(result -> result.sequenceResets().stream())
                .map(reset -> new SequenceResetRecord(reset.targetTable(), reset.column(), reset.sequence(),
                        reset.action().name()))
                .toList();
        var artifact = new MigrationExecutionArtifact(1, CanonicalArtifactDigest.sha256(plan),
                plan.mappingDigest(), plan.targetSchemaDigest(), mode.name(), status,
                startedAt.toString(), Instant.now().toString(), counts, resets);
        try {
            String json = new ObjectMapper().writeValueAsString(artifact);
            ArtifactRedactionGuard.assertSafe(new ObjectMapper().readTree(json));
            return json;
        } catch (JsonProcessingException failure) {
            throw new IllegalArgumentException("execution artifact encoding failed");
        }
    }
}
