package nuri.migration.artifact;

import com.fasterxml.jackson.annotation.JsonInclude;
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
 *
 * <p>{@code nullified} 는 {@code nullify} 로 NULL 이 된 값의 대상 테이블·컬럼별 행 수다(ADR-0029 L3a-1) — 바꾼 값은
 * 담지 않는다. 끝까지 적재한 실행에서는 표 전체의 수이고, 멈춘 실행에서는 변환한 행까지의 수다.
 *
 * <p>[ADR-0029 L3c] {@code tables[].mapping} 은 한 소스를 나눈 매핑의 id 다(기본 매핑은 싣지 않는다).
 * {@code controlSchema} 는 COMMIT 이 본 제어 스키마 버전의 적용 전후다 — 처음 만든 대상은 {@code before} 가 {@code none} 이다.
 * dry-run 과 두 필드가 없는 실행의 증거는 종전과 바이트가 같다.
 *
 * <p>[ADR-0029 L3d] {@code lookupMisses} 는 {@code at_most_one} 조회의 별칭마다 짝이 없어 NULL 을 넣은 행 수다 — 키·값은
 * 담지 않는다. 짝 없는 행이 없으면 싣지 않아 조회하지 않는 실행의 증거는 종전과 바이트가 같다.
 */
public record MigrationExecutionArtifact(int schemaVersion, String planDigest, String mappingDigest,
        String targetDigest, String mode, String status, String startedAt, String updatedAt,
        List<TableCounts> tables, List<SequenceResetRecord> sequenceResets, List<NullifiedRecord> nullified,
        @JsonInclude(JsonInclude.Include.NON_NULL) ControlSchemaRecord controlSchema,
        @JsonInclude(JsonInclude.Include.NON_EMPTY) List<LookupMissRecord> lookupMisses) {
    public record TableCounts(String source, String target, long read, long written, long errors,
                              long targetRows, String status,
                              @JsonInclude(JsonInclude.Include.NON_NULL) String mapping) { }

    /** 제어 스키마 버전의 적용 전후. 아직 끝나지 않은 실행의 {@code after} 는 싣지 않는다. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ControlSchemaRecord(String before, String after) { }

    public record SequenceResetRecord(String target, String column, String sequence, String action) { }

    public record NullifiedRecord(String target, String column, long rows) { }

    /** 조회 하나의 짝 없는 행 수. {@code mapping} 은 조회를 쓴 매핑의 id 다. */
    public record LookupMissRecord(String source, String mapping, String lookup, long rows) { }

    public static String encode(MigrationPlan plan, MigrationMode mode, String status,
                                Instant startedAt, MigrationReport report) {
        return encode(plan, mode, status, startedAt, report, List.of());
    }

    public static String encode(MigrationPlan plan, MigrationMode mode, String status,
                                Instant startedAt, MigrationReport report, List<EtlExecutor.TableResult> results) {
        return encode(plan, mode, status, startedAt, report, results, null);
    }

    public static String encode(MigrationPlan plan, MigrationMode mode, String status,
                                Instant startedAt, MigrationReport report, List<EtlExecutor.TableResult> results,
                                ControlSchemaRecord controlSchema) {
        List<TableCounts> counts = report == null ? List.of() : report.tables().stream()
                .map(table -> new TableCounts(table.source(), table.target(), table.read(), table.written(),
                        table.errors(), table.targetRows(), table.status().name(), table.mappingId())).toList();
        List<SequenceResetRecord> resets = results == null ? List.of() : results.stream()
                .flatMap(result -> result.sequenceResets().stream())
                .map(reset -> new SequenceResetRecord(reset.targetTable(), reset.column(), reset.sequence(),
                        reset.action().name()))
                .toList();
        List<NullifiedRecord> nullified = results == null ? List.of() : results.stream()
                .flatMap(result -> result.nullified().entrySet().stream()
                        .map(column -> new NullifiedRecord(result.targetTable(), column.getKey(), column.getValue())))
                .toList();
        List<LookupMissRecord> lookupMisses = results == null ? List.of() : results.stream()
                .flatMap(result -> result.lookupMisses().entrySet().stream()
                        .map(alias -> new LookupMissRecord(result.sourceTable(), result.mappingId(), alias.getKey(),
                                alias.getValue())))
                .toList();
        var artifact = new MigrationExecutionArtifact(1, CanonicalArtifactDigest.sha256(plan),
                plan.mappingDigest(), plan.targetSchemaDigest(), mode.name(), status,
                startedAt.toString(), Instant.now().toString(), counts, resets, nullified, controlSchema,
                lookupMisses);
        try {
            String json = new ObjectMapper().writeValueAsString(artifact);
            ArtifactRedactionGuard.assertSafe(new ObjectMapper().readTree(json));
            return json;
        } catch (JsonProcessingException failure) {
            throw new IllegalArgumentException("execution artifact encoding failed");
        }
    }
}
