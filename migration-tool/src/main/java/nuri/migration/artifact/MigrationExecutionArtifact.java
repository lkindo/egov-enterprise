package nuri.migration.artifact;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.migration.archive.ArchiveFileWriter.PersonalShapes;
import nuri.migration.archive.ArchiveOutcome;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.plan.MigrationPlan;
import nuri.migration.verify.MigrationReport;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

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
 *
 * <p>형식 3(ADR-0029 L3e): 같은 run·같은 읽기 세션에서 쓴 보관 덤프({@code archives} — 보관 id·원천 표·파일 이름·행 수·
 * 바이트·nonce 를 포함한 SHA-256·보존 기한·원장 행·보관 컬럼과 정렬 키 컬럼마다의 주민등록번호·전화번호·이메일 모양 행
 * 수)와 격리 키 반출({@code isolatedKeyExports} — 원천 표·파일 이름·행 수·바이트·SHA-256·정렬 키 컬럼마다의 모양 행 수)을
 * 담는다. 파일은 디렉터리를 뺀 이름으로만 담고, 값·키·경로는 담지 않는다. 덤프를 쓴 실행은 {@code keymapRetention} 에
 * 가장 늦은 보존 기한과 의무 문구 "keymap 은 덤프의 가장 늦은 retainUntil 까지 보존" 을 남긴다. dry-run 덤프는 파일 없이
 * 행 수만 담는다. COMMIT 은 표의 덤프·격리 키를 옮길 때마다 그때까지의 목록으로 STARTED 증거를 다시 쓴다.
 *
 * <p>형식 4(ADR-0029 L3c·L3d): {@code tables[].mapping} 은 한 소스를 나눈 매핑의 id 다(기본 매핑은 싣지 않는다).
 * {@code controlSchema} 는 COMMIT 이 본 제어 스키마 버전의 적용 전후다 — 처음 만든 대상은 {@code before} 가 {@code none}
 * 이고, 두 값이 없으면 싣지 않는다. {@code lookupMisses} 는 {@code at_most_one} 조회의 별칭마다 짝이 없어 NULL 을 넣은 행
 * 수다 — 키·값은 담지 않고, 짝 없는 행이 없으면 싣지 않는다. 형식 1·2·3 증거도 읽을 수 있다(없는 목록은 비어 있고 없는
 * 값은 null 이다).
 */
public record MigrationExecutionArtifact(int schemaVersion, String planDigest, String mappingDigest,
        String targetDigest, String mode, String status, String startedAt, String updatedAt,
        List<TableCounts> tables, List<SequenceResetRecord> sequenceResets, List<NullifiedRecord> nullified,
        List<IsolationRecord> isolations, List<ArchiveRecord> archives, List<IsolatedKeyRecord> isolatedKeyExports,
        KeymapRetention keymapRetention,
        @JsonInclude(JsonInclude.Include.NON_NULL) ControlSchemaRecord controlSchema,
        @JsonInclude(JsonInclude.Include.NON_EMPTY) List<LookupMissRecord> lookupMisses) {

    /**
     * 지금 쓰는 실행 증거 형식. 형식 1 은 격리 기록이, 형식 2 는 보관 덤프 기록이, 형식 3 은 매핑 id·제어 스키마 버전·조회
     * 짝 없는 행 기록이 없다.
     */
    public static final int CURRENT_SCHEMA_VERSION = 4;

    /** 덤프를 쓴 실행이 남기는 keymap 보존 의무(ADR-0029 L3e, DEC-OPS-321). */
    public static final String KEYMAP_RETENTION_DUTY = "keymap 은 덤프의 가장 늦은 retainUntil 까지 보존";

    public MigrationExecutionArtifact {
        tables = tables == null ? List.of() : List.copyOf(tables);
        sequenceResets = sequenceResets == null ? List.of() : List.copyOf(sequenceResets);
        nullified = nullified == null ? List.of() : List.copyOf(nullified);
        isolations = isolations == null ? List.of() : List.copyOf(isolations);
        archives = archives == null ? List.of() : List.copyOf(archives);
        isolatedKeyExports = isolatedKeyExports == null ? List.of() : List.copyOf(isolatedKeyExports);
        lookupMisses = lookupMisses == null ? List.of() : List.copyOf(lookupMisses);
    }

    public record TableCounts(String source, String target, long read, long written, long errors,
                              long targetRows, String status, long isolated,
                              @JsonInclude(JsonInclude.Include.NON_NULL) String mapping) { }

    /** 제어 스키마 버전의 적용 전후. 아직 끝나지 않은 실행의 {@code after} 는 싣지 않는다. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ControlSchemaRecord(String before, String after) { }

    public record SequenceResetRecord(String target, String column, String sequence, String action) { }

    public record NullifiedRecord(String target, String column, long rows) { }

    /** 조회 하나의 짝 없는 행 수. {@code mapping} 은 조회를 쓴 매핑의 id 다. */
    public record LookupMissRecord(String source, String mapping, String lookup, long rows) { }

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

    /**
     * 보관 덤프 하나(ADR-0029 L3e). {@code file} 은 디렉터리를 뺀 파일 이름이고 dry-run 에서는 비어 있다.
     * {@code personalData} 는 보관 컬럼마다(선언 순서), {@code keyPersonalData} 는 덤프 행마다 원값을 싣는 정렬 키 컬럼마다
     * 개인정보 모양이 든 행 수다 — 값은 담지 않는다(DEC-OPS-321 U2).
     */
    public record ArchiveRecord(String id, String source, boolean dumpOnly, String file, long rows, long bytes,
                                String sha256, String retainUntil, List<String> ledgerEntries,
                                List<PersonalDataRecord> personalData, List<PersonalDataRecord> keyPersonalData) {

        public ArchiveRecord {
            ledgerEntries = ledgerEntries == null ? List.of() : List.copyOf(ledgerEntries);
            personalData = personalData == null ? List.of() : List.copyOf(personalData);
            keyPersonalData = keyPersonalData == null ? List.of() : List.copyOf(keyPersonalData);
        }
    }

    /** 컬럼 하나의 주민등록번호·전화번호·이메일 모양 행 수(과잉 탐지). */
    public record PersonalDataRecord(String column, long rrn, long phone, long email) { }

    /**
     * 격리 키 반출 파일 하나(ADR-0029 L3e). {@code file} 은 디렉터리를 뺀 파일 이름이고, {@code keyPersonalData} 는 정렬 키
     * 컬럼마다 개인정보 모양이 든 행 수다.
     */
    public record IsolatedKeyRecord(String source, String file, long rows, long bytes, String sha256,
                                    List<PersonalDataRecord> keyPersonalData) {

        public IsolatedKeyRecord {
            keyPersonalData = keyPersonalData == null ? List.of() : List.copyOf(keyPersonalData);
        }
    }

    /** 덤프를 쓴 실행의 keymap 보존 의무 — 가장 늦은 보존 기한까지 keymap 을 지우지 않는다. */
    public record KeymapRetention(String retainUntil, String duty) { }

    public static String encode(MigrationPlan plan, MigrationMode mode, String status,
                                Instant startedAt, MigrationReport report, List<EtlExecutor.TableResult> results) {
        return encode(plan, mode, status, startedAt, report, results, null, null);
    }

    public static String encode(MigrationPlan plan, MigrationMode mode, String status,
                                Instant startedAt, MigrationReport report, List<EtlExecutor.TableResult> results,
                                ControlSchemaRecord controlSchema) {
        return encode(plan, mode, status, startedAt, report, results, null, controlSchema);
    }

    /** {@code archives} 는 같은 실행의 보관 덤프·격리 키 반출 결과다(없으면 null). */
    public static String encode(MigrationPlan plan, MigrationMode mode, String status, Instant startedAt,
                                MigrationReport report, List<EtlExecutor.TableResult> results,
                                ArchiveOutcome archives) {
        return encode(plan, mode, status, startedAt, report, results, archives, null);
    }

    /**
     * 실행 증거를 만든다. {@code archives} 는 같은 실행의 보관 덤프·격리 키 반출 결과(ADR-0029 L3e), {@code controlSchema}
     * 는 COMMIT 이 본 제어 스키마 버전의 적용 전후(ADR-0029 L3c)다. 둘 다 없으면 null 이다.
     */
    public static String encode(MigrationPlan plan, MigrationMode mode, String status, Instant startedAt,
                                MigrationReport report, List<EtlExecutor.TableResult> results,
                                ArchiveOutcome archives, ControlSchemaRecord controlSchema) {
        List<TableCounts> counts = report == null ? List.of() : report.tables().stream()
                .map(table -> new TableCounts(table.source(), table.target(), table.read(), table.written(),
                        table.errors(), table.targetRows(), table.status().name(), table.isolated(),
                        table.mappingId())).toList();
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
        List<IsolationRecord> isolations = results == null ? List.of() : results.stream()
                .flatMap(result -> result.isolations().stream()
                        .map(isolation -> new IsolationRecord(result.sourceTable(), result.targetTable(),
                                isolation.ledgerEntry(), isolation.column(), isolation.violation(), isolation.rows(),
                                isolation.ordinals())))
                .toList();
        List<ArchiveRecord> dumps = archives == null ? List.of() : archives.dumps().stream()
                .map(dump -> new ArchiveRecord(dump.id(), dump.source(), dump.dumpOnly(), dump.fileName(), dump.rows(),
                        dump.bytes(), dump.sha256(), dump.retainUntil(), dump.ledgerEntries(),
                        personalData(dump.personalShapes()), personalData(dump.keyPersonalShapes())))
                .toList();
        List<IsolatedKeyRecord> keyExports = archives == null ? List.of() : archives.keyExports().stream()
                .map(export -> new IsolatedKeyRecord(export.source(), export.fileName(), export.rows(), export.bytes(),
                        export.sha256(), personalData(export.keyPersonalShapes())))
                .toList();
        KeymapRetention retention = dumps.stream()
                .filter(dump -> dump.file() != null && dump.retainUntil() != null)
                .map(ArchiveRecord::retainUntil)
                .max(Comparator.naturalOrder())
                .map(latest -> new KeymapRetention(latest, KEYMAP_RETENTION_DUTY))
                .orElse(null);
        var artifact = new MigrationExecutionArtifact(CURRENT_SCHEMA_VERSION, CanonicalArtifactDigest.sha256(plan),
                plan.mappingDigest(), plan.targetSchemaDigest(), mode.name(), status,
                startedAt.toString(), Instant.now().toString(), counts, resets, nullified, isolations, dumps,
                keyExports, retention, controlSchema, lookupMisses);
        try {
            String json = new ObjectMapper().writeValueAsString(artifact);
            ArtifactRedactionGuard.assertSafe(new ObjectMapper().readTree(json));
            return json;
        } catch (JsonProcessingException failure) {
            throw new IllegalArgumentException("execution artifact encoding failed");
        }
    }

    private static List<PersonalDataRecord> personalData(
            Map<String, PersonalShapes> shapes) {
        return shapes.entrySet().stream()
                .map(column -> new PersonalDataRecord(column.getKey(), column.getValue().rrn(),
                        column.getValue().phone(), column.getValue().email()))
                .toList();
    }
}
