package nuri.migration.archive;

import com.fasterxml.jackson.core.JsonGenerator;
import nuri.migration.archive.ArchiveFileWriter.ArchiveHeader;
import nuri.migration.archive.ArchiveFileWriter.ArchiveSession;
import nuri.migration.archive.ArchiveFileWriter.IsolatedKeyHeader;
import nuri.migration.archive.ArchiveFileWriter.IsolatedKeySession;
import nuri.migration.archive.ArchiveFileWriter.Written;
import nuri.migration.archive.ArchiveOutcome.Dumped;
import nuri.migration.archive.ArchiveOutcome.KeyExport;
import nuri.migration.isolate.RowIsolationPolicy;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ArchiveDump;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.TableMapping;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Consumer;

/**
 * 한 load 실행의 외부 보관 덤프와 격리 키 반출(ADR-0029 L3e). 실행기가 적재와 같은 원천 읽기 세션에서 읽은 행을 표마다
 * {@link TableArchive} 로 넘긴다 — 매핑된 표는 읽은 행을 모두(재개로 건너뛴 행·격리한 행 포함), 덤프만 하는 표는 매핑된 표들
 * 다음에 따로 읽은 행을 쓴다. 격리한 행은 정렬 키 원값·순번·위반 코드를 격리 키 파일로 반출한다.
 *
 * <p>COMMIT({@link #writing})은 승인한 보관 디렉터리에 실행마다 새 파일을 쓴다 — 이전 파일은 지우지 않는다. 표를 끝까지
 * 읽었을 때만 파일을 최종 이름으로 옮기고({@link #onPublished} 로 실행 증거를 그때마다 다시 쓴다), 실패해 멈춘 표의 파일은
 * 지운다. 프로세스가 강제로 끝나면 지우지 못하므로 다음 load 시작이 남은 임시 파일·예약을 거부한다
 * ({@link ArchiveLocationGuard#requireSafeDirectory}). dry-run·보관이 없는 실행({@link #counting})은 파일을
 * 쓰지 않고, 덤프할 행 수와 개인정보 모양 수만 세며 쓸 수 없는 값 종류는 COMMIT 과 같은 사유로 멈춘다.</p>
 */
public final class ArchiveRun {

    private final Path directory;
    private final String planDigest;
    private final String mappingDigest;
    private final ArchiveFileWriter writer;
    private final List<Dumped> dumps = new ArrayList<>();
    private final List<KeyExport> keyExports = new ArrayList<>();
    private final List<String> errors = new ArrayList<>();
    private Consumer<ArchiveOutcome> published = outcome -> { };

    private ArchiveRun(Path directory, String planDigest, String mappingDigest, ArchiveFileWriter writer) {
        this.directory = directory;
        this.planDigest = planDigest;
        this.mappingDigest = mappingDigest;
        this.writer = writer;
    }

    /** 파일을 쓰지 않고 센다(dry-run, 보관·격리가 없는 COMMIT). */
    public static ArchiveRun counting() {
        return new ArchiveRun(null, null, null, null);
    }

    /**
     * COMMIT 의 보관 디렉터리에 쓴다. {@code directory} 는 load 시작 때 {@link ArchiveLocationGuard#requireSafeDirectory}
     * 를 지난 실제 경로, 두 digest 는 승인 plan 과 mapping 의 SHA-256 이다(파일 머리에 들어간다).
     */
    public static ArchiveRun writing(Path directory, String planDigest, String mappingDigest) {
        return writing(directory, planDigest, mappingDigest, new ArchiveFileWriter());
    }

    static ArchiveRun writing(Path directory, String planDigest, String mappingDigest, ArchiveFileWriter writer) {
        Objects.requireNonNull(directory, "directory");
        Objects.requireNonNull(writer, "writer");
        ArchiveFileWriter.requireDigests(planDigest, mappingDigest);
        return new ArchiveRun(directory, planDigest, mappingDigest, writer);
    }

    /**
     * 이 mapping 의 COMMIT 에 보관 디렉터리가 필요한가 — 보관 선언이 있거나, 원장 승인 행을 격리(isolate)할 수 있으면(격리
     * 행의 키를 반출한다) 필요하다.
     */
    public static boolean required(MappingSpec spec) {
        return !spec.archives().isEmpty() || spec.tables().stream()
                .filter(Objects::nonNull)
                .flatMap(table -> table.columns().stream())
                .anyMatch(column -> column != null && column.isolate() != null);
    }

    public boolean writesFiles() {
        return directory != null;
    }

    /**
     * 표의 덤프·격리 키 파일을 최종 이름으로 옮길 때마다 그때까지의 결과를 받는다(COMMIT 만). load 는 실행 증거를 다시 써
     * 옮긴 파일이 실행이 강제로 끝나도 어떤 증거에 실리게 한다. 받는 쪽이 실패하면 그 표의 처리가 실패한다.
     */
    public void onPublished(Consumer<ArchiveOutcome> listener) {
        this.published = Objects.requireNonNull(listener, "listener");
    }

    /**
     * 보관 선언을 읽기 전에 확인한다 — 덤프 머리(보관 id·정렬 키·컬럼·원장 행·보존 기한)가 올바르지 않으면 연결을 열기 전에
     * 멈춘다. 매핑된 표의 정렬 키는 그 표 매핑의 것이다.
     */
    public void check(MappingSpec spec) {
        for (ArchiveDump dump : spec.archives()) {
            header(dump, keyColumns(spec, dump), "a".repeat(64), "b".repeat(64));
        }
    }

    /** 매핑된 표의 보관 선언들. 보관이 없어도 격리 키 반출을 위해 만든다. */
    public TableArchive mappedTable(MappingSpec spec, TableMapping table) {
        List<ArchiveDump> owned = spec.archives().stream()
                .filter(dump -> spec.mappedTableOf(dump.source()) == table)
                .toList();
        return new TableArchive(table.source(), table.effectiveOrderKeys(), owned, false);
    }

    /** 덤프만 하는 표 하나(같은 source 의 보관 선언들). 정렬 키는 선언의 {@code orderByKeys} 다. */
    public TableArchive dumpOnlyTable(DumpOnlyRead read) {
        return new TableArchive(read.table().source(), read.table().effectiveOrderKeys(), read.dumps(), true);
    }

    /**
     * 덤프만 하는 표를 source 마다 묶어 읽을 형태로 만든다. 같은 source 의 선언은 where·정렬 키가 같아야 한다(mapping
     * 검증과 같은 전제). 읽기 형태는 보관 컬럼을 원천 컬럼으로만 담은 표 매핑이다 — 적재하지 않는다.
     */
    public static List<DumpOnlyRead> dumpOnlyReads(MappingSpec spec) {
        Map<String, List<ArchiveDump>> groups = new LinkedHashMap<>();
        for (ArchiveDump dump : spec.archives()) {
            if (spec.mappedTableOf(dump.source()) == null) {
                groups.computeIfAbsent(dump.source().trim().toLowerCase(Locale.ROOT), ignored -> new ArrayList<>())
                        .add(dump);
            }
        }
        List<DumpOnlyRead> reads = new ArrayList<>(groups.size());
        for (List<ArchiveDump> group : groups.values()) {
            ArchiveDump first = group.getFirst();
            Set<String> columns = new LinkedHashSet<>();
            for (ArchiveDump dump : group) {
                if (!Objects.equals(dump.where(), first.where()) || !dump.orderByKeys().equals(first.orderByKeys())) {
                    throw new IllegalArgumentException(first.source()
                            + ": 덤프만 하는 같은 표의 보관 선언은 where·orderByKeys 가 같아야 합니다");
                }
                columns.addAll(dump.columns());
            }
            List<ColumnMapping> projection = columns.stream()
                    .map(column -> new ColumnMapping(column, column, null, null, null, null, null))
                    .toList();
            reads.add(new DumpOnlyRead(new TableMapping(first.source(), null, first.where(), null,
                    first.orderByKeys(), null, projection, null), List.copyOf(group)));
        }
        return List.copyOf(reads);
    }

    /** 덤프만 하는 표 하나를 읽는 형태와 그 표의 보관 선언들. */
    public record DumpOnlyRead(TableMapping table, List<ArchiveDump> dumps) {}

    /** 덤프·반출을 마치지 못한 이유를 남긴다. 문구는 표 이름과 고정 사유 코드뿐이어야 한다. */
    public void fail(String error) {
        errors.add(Objects.requireNonNull(error, "error"));
    }

    /** 지금까지의 결과. */
    public ArchiveOutcome outcome() {
        return new ArchiveOutcome(writesFiles(), dumps, keyExports, errors);
    }

    private static List<String> keyColumns(MappingSpec spec, ArchiveDump dump) {
        TableMapping mapped = spec.mappedTableOf(dump.source());
        return mapped == null ? dump.orderByKeys() : mapped.effectiveOrderKeys();
    }

    private static ArchiveHeader header(ArchiveDump dump, List<String> keyColumns, String plan, String mapping) {
        return new ArchiveHeader(dump.id(), dump.source(), keyColumns, dump.columns(), dump.ledgerEntries(),
                dump.retainUntil(), plan, mapping);
    }

    /**
     * 표 하나의 덤프와 격리 키 반출. 읽은 행마다 {@link #row}, 격리한 행마다 {@link #isolated} 를 부르고, 표를 끝까지 읽으면
     * {@link #complete}, 아니면 {@link #close} 로 이 실행의 파일을 지운다.
     */
    public final class TableArchive implements AutoCloseable {

        private final String source;
        private final List<String> keyColumns;
        private final boolean dumpOnly;
        private final List<Tap> taps;
        private final List<String> columns;
        private IsolatedKeySession isolatedKeys;
        private boolean finished;

        private TableArchive(String source, List<String> keyColumns, List<ArchiveDump> dumps, boolean dumpOnly) {
            this.source = source;
            this.keyColumns = List.copyOf(keyColumns);
            this.dumpOnly = dumpOnly;
            Set<String> union = new LinkedHashSet<>();
            List<Tap> opened = new ArrayList<>(dumps.size());
            try {
                for (ArchiveDump dump : dumps) {
                    opened.add(new Tap(dump, keyColumns, writesFiles()
                            ? writer.openArchive(directory, header(dump, keyColumns, planDigest, mappingDigest))
                            : null));
                    union.addAll(dump.columns());
                }
            } catch (RuntimeException failure) {
                opened.forEach(Tap::close);
                throw failure;
            }
            this.taps = List.copyOf(opened);
            this.columns = List.copyOf(union);
        }

        /** 원천 읽기에 더할 보관 컬럼(선언 이름). 보관이 없으면 비어 있다. */
        public List<String> columns() {
            return columns;
        }

        /** 읽은 행 하나를 이 표의 모든 덤프에 쓴다. {@code row} 는 소문자 컬럼 이름 → 값이다. */
        public void row(Map<String, Object> row) {
            if (taps.isEmpty()) {
                return;
            }
            List<Object> key = values(row, keyColumns);
            for (Tap tap : taps) {
                Map<String, Object> values = new LinkedHashMap<>();
                for (String column : tap.dump.columns()) {
                    values.put(column, value(row, column));
                }
                tap.append(key, values);
            }
        }

        /**
         * 격리한 행 하나의 정렬 키 원값·순번·위반을 반출한다(COMMIT 만). 첫 격리 행에서 파일을 연다. dry-run 은 반출하지
         * 않는다 — 격리 집계는 실행 결과가 이미 담는다.
         */
        public void isolated(Map<String, Object> row, long ordinal, List<RowIsolationPolicy.Match> matches) {
            if (!writesFiles()) {
                return;
            }
            if (isolatedKeys == null) {
                isolatedKeys = writer.openIsolatedKeys(directory,
                        new IsolatedKeyHeader(source, keyColumns, planDigest, mappingDigest));
            }
            isolatedKeys.append(values(row, keyColumns), ordinal, matches);
        }

        /**
         * 표를 끝까지 읽었다. 덤프마다 파일을 최종 이름으로 옮기고(dry-run 은 센 수만) 결과에 더한다. {@code sourceRows} 는
         * 이 읽기에서 읽은 행 수다. 옮기다 실패하면 그때까지 옮긴 파일만 결과에 남는다.
         */
        public void complete(long sourceRows) {
            for (Tap tap : taps) {
                dumps.add(tap.finish(source, dumpOnly, sourceRows));
            }
            if (isolatedKeys != null) {
                Written written = isolatedKeys.commit();
                keyExports.add(new KeyExport(source, written.rows(), written.fileName(), written.bytes(),
                        written.sha256(), written.keyShapes()));
            }
            finished = true;
            if (writesFiles() && (!taps.isEmpty() || isolatedKeys != null)) {
                published.accept(outcome());
            }
        }

        /** 마치지 않았으면 이 표의 임시 파일과 예약을 지운다. 여러 번 불러도 된다. */
        @Override
        public void close() {
            if (finished) {
                return;
            }
            taps.forEach(Tap::close);
            if (isolatedKeys != null) {
                isolatedKeys.close();
            }
        }

        private List<Object> values(Map<String, Object> row, List<String> names) {
            List<Object> values = new ArrayList<>(names.size());
            for (String name : names) {
                values.add(value(row, name));
            }
            return values;
        }

        private Object value(Map<String, Object> row, String column) {
            String key = column.toLowerCase(Locale.ROOT);
            if (!row.containsKey(key)) {
                // 읽기에 보관·정렬 컬럼이 빠졌다 — NULL 로 덤프하면 원천 값을 잃은 것을 숨긴다.
                throw new IllegalStateException(source + ": 보관할 컬럼을 원천 읽기에서 찾지 못했습니다");
            }
            return row.get(key);
        }
    }

    /** 보관 선언 하나의 쓰기(COMMIT) 또는 세기(dry-run). */
    private static final class Tap {

        private final ArchiveDump dump;
        private final List<String> keyColumns;
        private final ArchiveSession session;
        private final long[][] shapes;
        private final long[][] keyShapes;
        private final JsonGenerator discard;
        private long rows;

        Tap(ArchiveDump dump, List<String> keyColumns, ArchiveSession session) {
            this.dump = dump;
            this.keyColumns = List.copyOf(keyColumns);
            this.session = session;
            this.shapes = new long[dump.columns().size()][3];
            this.keyShapes = new long[keyColumns.size()][3];
            this.discard = session == null ? ArchiveFileWriter.discardingGenerator() : null;
        }

        void append(List<Object> key, Map<String, Object> values) {
            if (session != null) {
                session.append(key, values);
                return;
            }
            try {
                // dry-run 도 COMMIT 이 쓸 수 없는 값 종류에서 같은 사유로 멈춘다.
                for (Object value : key) {
                    ArchiveFileWriter.writeValue(discard, value);
                }
                for (Object value : values.values()) {
                    ArchiveFileWriter.writeValue(discard, value);
                }
            } catch (IOException impossible) {
                throw new UncheckedIOException(impossible);
            }
            for (int index = 0; index < dump.columns().size(); index++) {
                ArchiveFileWriter.countShapes(shapes[index], values.get(dump.columns().get(index)));
            }
            for (int index = 0; index < key.size(); index++) {
                ArchiveFileWriter.countShapes(keyShapes[index], key.get(index));
            }
            rows++;
        }

        Dumped finish(String source, boolean dumpOnly, long sourceRows) {
            if (session != null) {
                Written written = session.commit();
                return new Dumped(dump.id(), source, dumpOnly, sourceRows, written.rows(), written.fileName(),
                        written.bytes(), written.sha256(), dump.retainUntil(), dump.ledgerEntries(),
                        written.personalShapes(), written.keyShapes());
            }
            return new Dumped(dump.id(), source, dumpOnly, sourceRows, rows, null, 0L, null, dump.retainUntil(),
                    dump.ledgerEntries(), ArchiveFileWriter.shapeCounts(dump.columns(), shapes),
                    ArchiveFileWriter.shapeCounts(keyColumns, keyShapes));
        }

        void close() {
            if (session != null) {
                session.close();
            }
        }
    }
}
