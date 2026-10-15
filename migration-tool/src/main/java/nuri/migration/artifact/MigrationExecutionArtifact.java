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
 *
 * <p>{@code nullified} 는 {@code nullify} 로 NULL 이 된 값의 대상 테이블·컬럼별 행 수다(ADR-0029 L3a-1) — 바꾼 값은
 * 담지 않는다. 끝까지 적재한 실행에서는 표 전체의 수이고, 멈춘 실행에서는 변환한 행까지의 수다.
 *
 * <p>형식 2(ADR-0029 L3b): 표마다 {@code isolated}(원장이 승인한 위반으로 적재하지 않은 행 수)와, {@code isolations} 에
 * (대상 테이블, 원장 행, 컬럼, 위반)마다의 행 수와 모든 행 순번(원천 정렬 순서의 위치)을 담는다. 값·키·digest 는 담지
 * 않는다 — 격리 행을 찾으려면 같은 정렬로 소스를 다시 읽는다. 형식 1 증거도 읽을 수 있다(없는 목록은 비어 있고
 * {@code isolated} 는 0 이다).
 */
public record MigrationExecutionArtifact(int schemaVersion, String planDigest, String mappingDigest,
        String targetDigest, String mode, String status, String startedAt, String updatedAt,
        List<TableCounts> tables, List<SequenceResetRecord> sequenceResets, List<NullifiedRecord> nullified,
        List<IsolationRecord> isolations) {

    /** 지금 쓰는 실행 증거 형식. 형식 1 은 격리 기록이 없다. */
    public static final int CURRENT_SCHEMA_VERSION = 2;

    public MigrationExecutionArtifact {
        tables = tables == null ? List.of() : List.copyOf(tables);
        sequenceResets = sequenceResets == null ? List.of() : List.copyOf(sequenceResets);
        nullified = nullified == null ? List.of() : List.copyOf(nullified);
        isolations = isolations == null ? List.of() : List.copyOf(isolations);
    }

    public record TableCounts(String source, String target, long read, long written, long errors,
                              long targetRows, String status, long isolated) { }

    public record SequenceResetRecord(String target, String column, String sequence, String action) { }

    public record NullifiedRecord(String target, String column, long rows) { }

    /** 격리 한 무리. {@code ordinals} 는 원천 정렬 순서의 1부터 위치다(원장 행마다 상한 1000 이하). */
    public record IsolationRecord(String source, String target, String ledgerEntry, String column,
                                  String violation, long rows, List<Long> ordinals) {

        public IsolationRecord {
            ordinals = ordinals == null ? List.of() : List.copyOf(ordinals);
        }
    }

    public static String encode(MigrationPlan plan, MigrationMode mode, String status,
                                Instant startedAt, MigrationReport report) {
        return encode(plan, mode, status, startedAt, report, List.of());
    }

    public static String encode(MigrationPlan plan, MigrationMode mode, String status,
                                Instant startedAt, MigrationReport report, List<EtlExecutor.TableResult> results) {
        List<TableCounts> counts = report == null ? List.of() : report.tables().stream()
                .map(table -> new TableCounts(table.source(), table.target(), table.read(), table.written(),
                        table.errors(), table.targetRows(), table.status().name(), table.isolated())).toList();
        List<SequenceResetRecord> resets = results == null ? List.of() : results.stream()
                .flatMap(result -> result.sequenceResets().stream())
                .map(reset -> new SequenceResetRecord(reset.targetTable(), reset.column(), reset.sequence(),
                        reset.action().name()))
                .toList();
        List<NullifiedRecord> nullified = results == null ? List.of() : results.stream()
                .flatMap(result -> result.nullified().entrySet().stream()
                        .map(column -> new NullifiedRecord(result.targetTable(), column.getKey(), column.getValue())))
                .toList();
        List<IsolationRecord> isolations = results == null ? List.of() : results.stream()
                .flatMap(result -> result.isolations().stream()
                        .map(isolation -> new IsolationRecord(result.sourceTable(), result.targetTable(),
                                isolation.ledgerEntry(), isolation.column(), isolation.violation(), isolation.rows(),
                                isolation.ordinals())))
                .toList();
        var artifact = new MigrationExecutionArtifact(CURRENT_SCHEMA_VERSION, CanonicalArtifactDigest.sha256(plan),
                plan.mappingDigest(), plan.targetSchemaDigest(), mode.name(), status,
                startedAt.toString(), Instant.now().toString(), counts, resets, nullified, isolations);
        try {
            String json = new ObjectMapper().writeValueAsString(artifact);
            ArtifactRedactionGuard.assertSafe(new ObjectMapper().readTree(json));
            return json;
        } catch (JsonProcessingException failure) {
            throw new IllegalArgumentException("execution artifact encoding failed");
        }
    }
}
