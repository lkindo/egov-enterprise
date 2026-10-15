package nuri.migration.archive;

import nuri.migration.archive.ArchiveFileWriter.PersonalShapes;
import nuri.migration.archive.ArchiveRun.DumpOnlyRead;
import nuri.migration.archive.ArchiveRun.TableArchive;
import nuri.migration.isolate.RowIsolationPolicy;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ArchiveDump;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.Isolate;
import nuri.migration.model.MappingSpec.TableMapping;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 한 load 실행의 보관 덤프·격리 키 반출(ADR-0029 L3e) — 표마다 읽은 행을 덤프하고, 격리 행의 키를 반출하고, 끝까지 읽은
 * 표만 파일을 옮기며 멈춘 표의 파일은 지운다. dry-run 은 파일 없이 세고 COMMIT 과 같은 값 종류 판정을 받는다.
 */
class ArchiveRunTest {

    private static final String PLAN = "a".repeat(64);
    private static final String MAPPING = "b".repeat(64);
    private static final String RRN = "9101011234567";

    @TempDir
    Path temp;

    private Path directory;

    @BeforeEach
    void realDirectory() throws IOException {
        directory = temp.toRealPath();
    }

    @Test
    void aWritingRunDumpsEveryRowExportsIsolatedKeysAndRecordsTheFilesOnlyWhenTheTableIsComplete() throws Exception {
        ArchiveRun run = ArchiveRun.writing(directory, PLAN, MAPPING);
        MappingSpec spec = spec(List.of(users()), List.of(userDump("2031-12-31", "ETC1")));
        TableMapping users = spec.tables().getFirst();

        assertThat(run.writesFiles()).isTrue();
        try (TableArchive archive = run.mappedTable(spec, users)) {
            assertThat(archive.columns()).containsExactly("ETC1");
            archive.row(row(1, RRN));
            archive.row(row(2, "memo"));
            archive.isolated(row(2, "memo"), 2, List.of(new RowIsolationPolicy.Match("U4", "end_ymd",
                    "PLACEHOLDER_DATE")));
            archive.complete(2);
        }

        ArchiveOutcome outcome = run.outcome();
        assertThat(outcome.writesFiles()).isTrue();
        assertThat(outcome.errors()).isEmpty();
        ArchiveOutcome.Dumped dumped = outcome.dumps().getFirst();
        assertThat(outcome.dumps()).hasSize(1);
        assertThat(dumped.id()).isEqualTo("legacy_user_20311231");
        assertThat(dumped.source()).isEqualTo("legacy.user_mst");
        assertThat(dumped.dumpOnly()).isFalse();
        assertThat(dumped.sourceRows()).isEqualTo(2);
        assertThat(dumped.rows()).isEqualTo(2);
        assertThat(dumped.retainUntil()).isEqualTo("2031-12-31");
        assertThat(dumped.ledgerEntries()).containsExactly("U7");
        assertThat(dumped.personalShapes()).containsExactly(Map.entry("ETC1", new PersonalShapes(1, 0, 0)));
        assertThat(dumped.sha256()).matches("[0-9a-f]{64}");
        assertThat(dumped.bytes()).isEqualTo(Files.size(directory.resolve(dumped.fileName())));
        assertThat(Files.readString(directory.resolve(dumped.fileName()), StandardCharsets.UTF_8))
                .contains("{\"k\":[1],\"v\":{\"ETC1\":\"" + RRN + "\"}}", "{\"k\":[2],\"v\":{\"ETC1\":\"memo\"}}");
        assertThat(outcome.keyExports()).singleElement().satisfies(export -> {
            assertThat(export.source()).isEqualTo("legacy.user_mst");
            assertThat(export.rows()).isEqualTo(1);
            assertThat(export.fileName()).startsWith("isolated-legacy.user_mst-");
            assertThat(export.sha256()).matches("[0-9a-f]{64}");
            assertThat(export.bytes()).isPositive();
        });
        try (Stream<Path> files = Files.list(directory)) {
            assertThat(files).hasSize(2);
        }
    }

    @Test
    void anUnfinishedTableLeavesNoFileAndClosingAgainOrAfterCompletionChangesNothing() throws Exception {
        ArchiveRun run = ArchiveRun.writing(directory, PLAN, MAPPING);
        MappingSpec spec = spec(List.of(users()), List.of(userDump("2031-12-31", "ETC1")));
        TableArchive archive = run.mappedTable(spec, spec.tables().getFirst());
        archive.row(row(1, "memo"));
        archive.isolated(row(1, "memo"), 1, List.of(new RowIsolationPolicy.Match("U4", "end_ymd", "BLANK")));

        archive.close();
        archive.close();

        try (Stream<Path> files = Files.list(directory)) {
            assertThat(files).as("멈춘 표의 덤프·격리 키·예약·임시 파일은 남지 않는다").isEmpty();
        }
        assertThat(run.outcome().dumps()).isEmpty();
        assertThat(run.outcome().keyExports()).isEmpty();

        TableArchive finished = run.mappedTable(spec, spec.tables().getFirst());
        finished.row(row(1, "memo"));
        finished.complete(1);
        finished.close();
        try (Stream<Path> files = Files.list(directory)) {
            assertThat(files).as("마친 파일은 닫아도 남는다").hasSize(1);
        }
    }

    @Test
    void aCountingRunWritesNoFileButCountsRowsAndShapesAndRejectsUnwritableValuesLikeACommit() throws Exception {
        ArchiveRun run = ArchiveRun.counting();
        MappingSpec spec = spec(List.of(users()), List.of(userDump("2031-12-31", "ETC1", "RMRK2")));
        TableArchive archive = run.mappedTable(spec, spec.tables().getFirst());
        Map<String, Object> first = row(1, RRN);
        first.put("rmrk2", "a@b.co / 010-1234-5678");
        archive.row(first);
        Map<String, Object> second = row(2, null);
        second.put("rmrk2", null);
        archive.row(second);
        archive.isolated(second, 2, List.of(new RowIsolationPolicy.Match("U4", "end_ymd", "BLANK")));
        archive.complete(2);

        assertThat(run.writesFiles()).isFalse();
        ArchiveOutcome.Dumped dumped = run.outcome().dumps().getFirst();
        assertThat(dumped.rows()).isEqualTo(2);
        assertThat(dumped.sourceRows()).isEqualTo(2);
        assertThat(dumped.fileName()).isNull();
        assertThat(dumped.sha256()).isNull();
        assertThat(dumped.bytes()).isZero();
        assertThat(dumped.personalShapes()).containsExactly(Map.entry("ETC1", new PersonalShapes(1, 0, 0)),
                Map.entry("RMRK2", new PersonalShapes(0, 1, 1)));
        assertThat(run.outcome().keyExports()).as("dry-run 은 키를 반출하지 않는다").isEmpty();
        try (Stream<Path> files = Files.list(directory)) {
            assertThat(files).isEmpty();
        }

        TableArchive rejecting = ArchiveRun.counting().mappedTable(spec, spec.tables().getFirst());
        Map<String, Object> unwritable = row(3, new Object());
        unwritable.put("rmrk2", null);
        assertThatThrownBy(() -> rejecting.row(unwritable))
                .isInstanceOf(ArchiveWriteException.class)
                .hasMessage("보관 파일을 쓰지 못했습니다: ARCHIVE_VALUE_TYPE_UNSUPPORTED");
        Map<String, Object> unwritableKey = row(3, "memo");
        unwritableKey.put("id", new Object());
        unwritableKey.put("rmrk2", null);
        assertThatThrownBy(() -> rejecting.row(unwritableKey))
                .isInstanceOf(ArchiveWriteException.class)
                .hasMessage("보관 파일을 쓰지 못했습니다: ARCHIVE_VALUE_TYPE_UNSUPPORTED");
    }

    @Test
    void orderKeyShapesAreCountedAndEveryTableThatPublishesFilesIsReportedAtOnce() throws Exception {
        // 정렬 키 원값도 덤프 행마다·격리 키 파일에 실린다 — 키 컬럼마다 센다(U2). 파일을 옮길 때마다 결과를 알린다.
        ArchiveRun run = ArchiveRun.writing(directory, PLAN, MAPPING);
        List<ArchiveOutcome> published = new java.util.ArrayList<>();
        run.onPublished(published::add);
        MappingSpec spec = spec(List.of(users()), List.of(userDump("2031-12-31", "ETC1")));
        Map<String, Object> keyed = new HashMap<>();
        keyed.put("id", RRN);
        keyed.put("etc1", "memo");
        try (TableArchive archive = run.mappedTable(spec, spec.tables().getFirst())) {
            archive.row(keyed);
            archive.row(row(2, "memo"));
            archive.isolated(keyed, 1, List.of(new RowIsolationPolicy.Match("U4", "end_ymd", "BLANK")));
            assertThat(published).as("표를 마치기 전에는 알리지 않는다").isEmpty();
            archive.complete(2);
        }
        try (TableArchive nothing = run.mappedTable(spec(List.of(users()), List.of()), users())) {
            nothing.row(row(3, "x"));
            nothing.complete(1);
        }

        assertThat(published).as("파일을 옮긴 표만 알린다").singleElement().satisfies(outcome -> {
            assertThat(outcome.dumps()).hasSize(1);
            assertThat(outcome.keyExports()).hasSize(1);
        });
        assertThat(run.outcome().dumps().getFirst().keyPersonalShapes())
                .containsExactly(Map.entry("ID", new PersonalShapes(1, 0, 0)));
        assertThat(run.outcome().keyExports().getFirst().keyPersonalShapes())
                .containsExactly(Map.entry("ID", new PersonalShapes(1, 0, 0)));

        ArchiveRun counting = ArchiveRun.counting();
        counting.onPublished(published::add);
        TableArchive counted = counting.mappedTable(spec, spec.tables().getFirst());
        counted.row(keyed);
        counted.complete(1);
        assertThat(counting.outcome().dumps().getFirst().keyPersonalShapes()).as("dry-run 도 센다")
                .containsExactly(Map.entry("ID", new PersonalShapes(1, 0, 0)));
        assertThat(published).as("파일을 쓰지 않는 실행은 알리지 않는다").hasSize(1);
    }

    @Test
    void aColumnMissingFromTheReadRowStopsInsteadOfDumpingANull() {
        MappingSpec spec = spec(List.of(users()), List.of(userDump("2031-12-31", "ETC1")));
        TableArchive archive = ArchiveRun.counting().mappedTable(spec, spec.tables().getFirst());
        Map<String, Object> keyOnly = new HashMap<>();
        keyOnly.put("id", 1);

        assertThatThrownBy(() -> archive.row(keyOnly))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("legacy.user_mst: 보관할 컬럼을 원천 읽기에서 찾지 못했습니다");
        assertThatThrownBy(() -> archive.row(Map.of("etc1", "x")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("legacy.user_mst: 보관할 컬럼을 원천 읽기에서 찾지 못했습니다");
    }

    @Test
    void aTableWithoutArchivesReadsNothingExtraAndDumpsNothing() {
        ArchiveRun run = ArchiveRun.counting();
        MappingSpec spec = spec(List.of(users()), List.of());
        TableArchive archive = run.mappedTable(spec, spec.tables().getFirst());

        assertThat(archive.columns()).isEmpty();
        archive.row(Map.of());
        archive.complete(5);

        assertThat(run.outcome().dumps()).isEmpty();
        assertThat(run.outcome()).isEqualTo(new ArchiveOutcome(false, List.of(), List.of(), List.of()));
    }

    @Test
    void aCommitNeedsTheRunWhenThereAreArchivesOrIsolationOnly() {
        TableMapping isolating = new TableMapping("legacy.user_mst", "tb_user", null, "ID", "id", List.of(
                new ColumnMapping("ID", "id", null, null, null, null, null),
                new ColumnMapping("END_YMD", "end_ymd", "ymd8", null, null, null, null, null, List.of(),
                        new Isolate("U4", 3L, List.of("PLACEHOLDER_DATE")))), null);

        assertThat(ArchiveRun.required(spec(List.of(users()), List.of()))).isFalse();
        assertThat(ArchiveRun.required(spec(List.of(users()), List.of(userDump("2031-12-31", "ETC1"))))).isTrue();
        assertThat(ArchiveRun.required(spec(List.of(isolating), List.of()))).isTrue();
        assertThat(ArchiveRun.required(spec(java.util.Arrays.asList(null, users()), List.of()))).isFalse();
    }

    @Test
    void headersAreCheckedBeforeAnyConnectionAndAWritingRunNeedsLowerCaseDigests() {
        MappingSpec valid = spec(List.of(users()), List.of(userDump("2031-12-31", "ETC1"),
                new ArchiveDump("legacy_log_20291231", "legacy.log", null, List.of("LOG_NO"), List.of("MEMO"),
                        List.of("L2"), "2029-12-31")));
        ArchiveRun.counting().check(valid);
        MappingSpec badDate = spec(List.of(users()), List.of(userDump("2031-13-31", "ETC1")));
        MappingSpec noKeys = spec(List.of(users()), List.of(new ArchiveDump("legacy_log_20291231", "legacy.log", null,
                List.of(), List.of("MEMO"), List.of("L2"), "2029-12-31")));

        assertThatThrownBy(() -> ArchiveRun.counting().check(badDate))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("보관 덤프의 보존 기한은 yyyy-MM-dd 날짜여야 합니다");
        assertThatThrownBy(() -> ArchiveRun.counting().check(noKeys))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("보관 덤프에는 정렬 키 컬럼이 필요합니다");
        assertThatThrownBy(() -> ArchiveRun.writing(directory, "A".repeat(64), MAPPING))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("보관 파일 머리의 plan·mapping digest 는 소문자 SHA-256 이어야 합니다");
        assertThatThrownBy(() -> ArchiveRun.writing(directory, PLAN, "short"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void dumpOnlyTablesAreGroupedPerSourceWithTheUnionOfTheirColumnsAndMappedTablesAreLeftOut() throws Exception {
        MappingSpec spec = spec(List.of(users()), List.of(
                userDump("2031-12-31", "ETC1"),
                new ArchiveDump("legacy_log_20291231", "legacy.log", "kind = 'A'", List.of("LOG_NO"), List.of("MEMO"),
                        List.of("L2"), "2029-12-31"),
                new ArchiveDump("legacy_log_20351231", " LEGACY.LOG ", "kind = 'A'", List.of("LOG_NO"),
                        List.of("NOTE", "MEMO2"), List.of("L3", "L4"), "2035-12-31")));

        List<DumpOnlyRead> reads = ArchiveRun.dumpOnlyReads(spec);

        assertThat(reads).singleElement().satisfies(read -> {
            assertThat(read.table().source()).isEqualTo("legacy.log");
            assertThat(read.table().where()).isEqualTo("kind = 'A'");
            assertThat(read.table().effectiveOrderKeys()).containsExactly("LOG_NO");
            assertThat(read.table().target()).isNull();
            assertThat(read.table().columns()).extracting(ColumnMapping::source)
                    .containsExactly("MEMO", "NOTE", "MEMO2");
            assertThat(read.dumps()).extracting(ArchiveDump::id)
                    .containsExactly("legacy_log_20291231", "legacy_log_20351231");
        });

        ArchiveRun run = ArchiveRun.writing(directory, PLAN, MAPPING);
        try (TableArchive archive = run.dumpOnlyTable(reads.getFirst())) {
            Map<String, Object> row = new HashMap<>();
            row.put("log_no", 1L);
            row.put("memo", "m");
            row.put("note", "n");
            row.put("memo2", null);
            archive.row(row);
            archive.complete(1);
        }
        assertThat(run.outcome().dumps()).extracting(ArchiveOutcome.Dumped::dumpOnly).containsExactly(true, true);
        assertThat(run.outcome().dumps()).extracting(ArchiveOutcome.Dumped::rows).containsExactly(1L, 1L);

        MappingSpec mismatched = spec(List.of(users()), List.of(
                new ArchiveDump("legacy_log_20291231", "legacy.log", null, List.of("LOG_NO"), List.of("MEMO"),
                        List.of("L2"), "2029-12-31"),
                new ArchiveDump("legacy_log_20351231", "legacy.log", null, List.of("LOG_SN"), List.of("NOTE"),
                        List.of("L3"), "2035-12-31")));
        assertThatThrownBy(() -> ArchiveRun.dumpOnlyReads(mismatched))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("legacy.log: 덤프만 하는 같은 표의 보관 선언은 where·orderByKeys 가 같아야 합니다");
        MappingSpec otherWhere = spec(List.of(users()), List.of(
                new ArchiveDump("legacy_log_20291231", "legacy.log", "a = 1", List.of("LOG_NO"), List.of("MEMO"),
                        List.of("L2"), "2029-12-31"),
                new ArchiveDump("legacy_log_20351231", "legacy.log", "a = 2", List.of("LOG_NO"), List.of("NOTE"),
                        List.of("L3"), "2035-12-31")));
        assertThatThrownBy(() -> ArchiveRun.dumpOnlyReads(otherWhere))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aFailureIsKeptInTheOutcome() {
        ArchiveRun run = ArchiveRun.counting();

        run.fail("보관 덤프 읽기 실패(legacy.log): SQL_EXECUTION_FAILED");

        assertThat(run.outcome().errors()).containsExactly("보관 덤프 읽기 실패(legacy.log): SQL_EXECUTION_FAILED");
        assertThatThrownBy(() -> run.fail(null)).isInstanceOf(NullPointerException.class);
    }

    @Test
    void aReservationThatCannotBeOpenedLeavesTheOtherDumpsOfTheTableClosed() throws Exception {
        // 같은 표의 둘째 덤프를 열지 못하면 먼저 연 덤프의 예약·임시 파일도 지운다.
        ArchiveRun run = ArchiveRun.writing(directory, PLAN, MAPPING);
        MappingSpec spec = spec(List.of(users()), List.of(userDump("2031-12-31", "ETC1"),
                new ArchiveDump("legacy_user_20350230", "legacy.user_mst", null, List.of(), List.of("ETC2"),
                        List.of("U9"), "2035-02-30")));

        assertThatThrownBy(() -> run.mappedTable(spec, spec.tables().getFirst()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("보관 덤프의 보존 기한은 yyyy-MM-dd 날짜여야 합니다");
        try (Stream<Path> files = Files.list(directory)) {
            assertThat(files).as("먼저 연 덤프의 예약·임시 파일도 지운다").isEmpty();
        }
    }

    private static Map<String, Object> row(int id, Object etc1) {
        Map<String, Object> row = new HashMap<>();
        row.put("id", id);
        row.put("etc1", etc1);
        return row;
    }

    private static TableMapping users() {
        return new TableMapping("legacy.user_mst", "tb_user", null, "ID", "id", List.of(
                new ColumnMapping("ID", "id", null, null, null, null, null)), null);
    }

    private static ArchiveDump userDump(String retainUntil, String... columns) {
        List<String> entries = new java.util.ArrayList<>();
        for (int index = 0; index < columns.length; index++) {
            entries.add("U" + (7 + index));
        }
        return new ArchiveDump("legacy_user_" + retainUntil.replace("-", ""), "legacy.user_mst", null, List.of(),
                List.of(columns), entries, retainUntil);
    }

    private static MappingSpec spec(List<TableMapping> tables, List<ArchiveDump> archives) {
        return new MappingSpec(null, null, tables, Map.of(), null, null, archives);
    }
}
