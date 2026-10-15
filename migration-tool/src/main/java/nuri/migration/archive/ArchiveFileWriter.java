package nuri.migration.archive;

import com.fasterxml.jackson.core.JsonEncoding;
import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonFactoryBuilder;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.StreamWriteFeature;
import nuri.migration.artifact.PersonalDataPatterns;
import nuri.migration.isolate.RowIsolationPolicy;

import java.io.FilterOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.nio.channels.Channels;
import java.nio.channels.FileChannel;
import java.nio.file.AccessDeniedException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.FileAttribute;
import java.nio.file.attribute.PosixFilePermission;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.TemporalAccessor;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.random.RandomGenerator;
import java.util.regex.Pattern;

/**
 * 외부 보관 덤프와 격리 행 키 반출 파일을 쓴다(ADR-0029 L3e). 두 파일 모두 한 줄에 JSON 하나인 형식(JSON Lines)이고, 첫 줄은
 * 머리다. 데이터 줄은 원시 값을 담는다 — 덤프는 결정 6(Q4)에 따라 기관 통제 아래 원천 값을 그대로 보관한다.
 *
 * <ul>
 *   <li>덤프({@code archive-<id>-<UTC>-<rand8>.jsonl}) — 머리
 *       {@code {format, version, nonce, archiveId, table, keyColumns, columns, ledgerEntries, retainUntil, timeZone,
 *       planDigest, mappingDigest}} 뒤에 행마다 {@code {"k":[정렬 키 값…],"v":{컬럼: 값…}}} 이다.</li>
 *   <li>격리 키({@code isolated-<표>-<UTC>-<rand8>.jsonl}) — 머리
 *       {@code {format, version, nonce, table, keyColumns, timeZone, planDigest, mappingDigest}} 뒤에 격리한 행마다
 *       {@code {"k":[…],"ordinal":순번,"violations":[{ledgerEntry, column, violation}…]}} 이다.</li>
 * </ul>
 *
 * <p>쓰는 순서: 최종 이름을 {@code CREATE_NEW} 로 빈 파일로 예약해 덮어쓰기를 막고(있으면 거부), 같은 디렉터리에 그 이름에서
 * 정한 임시 파일({@code .<최종 이름>.tmp})을 링크를 따르지 않는 {@code CREATE_NEW} 로 한 번에 만들어 쓴 뒤 fsync 하고, 예약이
 * 그대로인지 본 다음 {@code ATOMIC_MOVE} 로 예약 자리에 옮긴다. 실패하거나 commit 없이 닫으면 임시 파일과 빈 예약을 지운다
 * — 프로세스가 강제로 끝나면 남으므로 load 시작이 거부한다({@link ArchiveLocationGuard#requireSafeDirectory}). POSIX 파일
 * 시스템이면 두 파일을 0600 으로 만든다(Windows 는 강제하지 못한다). 파일 SHA-256 은 머리의 무작위 nonce 를 포함해
 * 계산하므로 작은 덤프의 내용을 digest 로 맞혀 볼 수 없다.</p>
 *
 * <p>값 표기: 문자는 문자, 참·거짓은 boolean, 정수·십진수는 수(지수 없이), 유한한 부동소수는 수, 날짜·시각은 ISO-8601
 * 문자, UUID 는 문자, 이진은 {@code {"$base64": …}} 다. JDBC {@code Timestamp}·{@code Date}·{@code Time} 은 이 JVM
 * 시간대의 날짜·시각으로 쓰고 그 시간대 ID 를 머리 {@code timeZone} 에 남긴다 — 시간대가 붙은 원천 값(예: timestamptz)은
 * 그 시간대로 시각을 되찾는다(시간대 오프셋이 겹치는 일광절약 전환 구간은 구분하지 못한다). 그 밖의 값 종류는 쓰지 않고
 * 멈춘다. 덤프는 값 열과 정렬 키 열마다 주민등록번호·전화번호·이메일 모양({@link PersonalDataPatterns}, 과잉 탐지)이 든
 * 행 수를, 격리 키 파일은 정렬 키 열마다 그 수를 센다 — 가리지 않는다(DEC-OPS-321 U2).</p>
 *
 * <p>오류 문구는 고정 어휘와 사유 코드뿐이다({@link ArchiveWriteException}). 경로·값을 싣지 않는다.</p>
 */
public final class ArchiveFileWriter {

    public static final String ARCHIVE_FORMAT = "nuri-migration-archive";
    public static final String ISOLATED_KEYS_FORMAT = "nuri-migration-isolated-keys";
    public static final int VERSION = 1;

    private static final Pattern ARCHIVE_ID = Pattern.compile("[a-z][a-z0-9_]{0,62}");
    private static final Pattern LEDGER_ENTRY = Pattern.compile("[A-Za-z0-9_.-]{1,64}");
    private static final Pattern DIGEST = Pattern.compile("[0-9a-f]{64}");
    private static final Pattern UNSAFE_NAME = Pattern.compile("[^A-Za-z0-9_.-]");
    private static final int MAX_TABLE_NAME = 64;
    private static final DateTimeFormatter STAMP =
            DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC);
    private static final JsonFactory JSON = new JsonFactoryBuilder()
            .rootValueSeparator((String) null)
            .disable(StreamWriteFeature.AUTO_CLOSE_TARGET)
            .enable(StreamWriteFeature.WRITE_BIGDECIMAL_AS_PLAIN)
            .build();

    /** 임시 파일을 예약한 최종 이름으로 옮긴다. 같은 디렉터리 안의 원자적 이동이어야 한다. */
    @FunctionalInterface
    interface Publisher {
        void publish(Path temporary, Path target) throws IOException;
    }

    private final Clock clock;
    private final RandomGenerator random;
    private final Publisher publisher;

    public ArchiveFileWriter() {
        this(Clock.systemUTC(), new SecureRandom(), (temporary, target) -> Files.move(temporary, target,
                StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING));
    }

    ArchiveFileWriter(Clock clock, RandomGenerator random, Publisher publisher) {
        this.clock = Objects.requireNonNull(clock, "clock");
        this.random = Objects.requireNonNull(random, "random");
        this.publisher = Objects.requireNonNull(publisher, "publisher");
    }

    /**
     * 덤프 머리. {@code table} 은 mapping 의 소스 표 표기, {@code keyColumns} 는 정렬 키, {@code columns} 는 보관 컬럼,
     * {@code ledgerEntries} 는 {@code columns} 와 같은 순서의 원장 외부 보관 행 ID, {@code retainUntil} 은 yyyy-MM-dd 보존
     * 기한, 두 digest 는 승인 plan 과 mapping 의 SHA-256 이다.
     */
    public record ArchiveHeader(String archiveId, String table, List<String> keyColumns, List<String> columns,
                                List<String> ledgerEntries, String retainUntil, String planDigest,
                                String mappingDigest) {

        public ArchiveHeader {
            if (archiveId == null || !ARCHIVE_ID.matcher(archiveId).matches()) {
                throw new IllegalArgumentException("보관 id 는 소문자로 시작하는 소문자·숫자·밑줄 63자 이내여야 합니다");
            }
            requireText(table, "보관 덤프의 소스 표가 필요합니다");
            keyColumns = names(keyColumns, "보관 덤프에는 정렬 키 컬럼이 필요합니다");
            columns = names(columns, "보관 덤프에는 보관 컬럼이 필요합니다");
            if (new HashSet<>(columns).size() != columns.size()) {
                throw new IllegalArgumentException("보관 덤프의 보관 컬럼은 한 번씩 둡니다");
            }
            ledgerEntries = ledgerEntries == null ? List.of() : List.copyOf(ledgerEntries);
            if (ledgerEntries.size() != columns.size()
                    || !ledgerEntries.stream().allMatch(entry -> LEDGER_ENTRY.matcher(entry).matches())) {
                throw new IllegalArgumentException("보관 덤프의 원장 행 ID 는 보관 컬럼과 같은 순서·같은 수여야 합니다");
            }
            if (date(retainUntil) == null) {
                throw new IllegalArgumentException("보관 덤프의 보존 기한은 yyyy-MM-dd 날짜여야 합니다");
            }
            requireDigest(planDigest);
            requireDigest(mappingDigest);
        }
    }

    /** 격리 키 반출 머리. {@code table} 은 mapping 의 소스 표 표기, {@code keyColumns} 는 정렬 키다. */
    public record IsolatedKeyHeader(String table, List<String> keyColumns, String planDigest, String mappingDigest) {

        public IsolatedKeyHeader {
            requireText(table, "격리 키 반출의 소스 표가 필요합니다");
            keyColumns = names(keyColumns, "격리 키 반출에는 정렬 키 컬럼이 필요합니다");
            requireDigest(planDigest);
            requireDigest(mappingDigest);
        }
    }

    /** 값 열 하나에서 주민등록번호·전화번호·이메일 모양이 든 행 수(과잉 탐지). */
    public record PersonalShapes(long rrn, long phone, long email) {}

    /**
     * 쓴 파일. {@code fileName} 은 디렉터리를 뺀 이름, {@code rows} 는 데이터 줄 수(머리 제외), {@code bytes} 는 머리를 포함한
     * 파일 크기, {@code sha256} 은 nonce 를 포함한 파일 전체의 SHA-256, {@code personalShapes} 는 덤프의 보관 컬럼마다(머리
     * 순서) 개인정보 모양 행 수(격리 키 파일은 비어 있다), {@code keyShapes} 는 정렬 키 컬럼마다(머리 순서) 그 수다.
     */
    public record Written(String fileName, long rows, long bytes, String sha256,
                          Map<String, PersonalShapes> personalShapes, Map<String, PersonalShapes> keyShapes) {

        public Written {
            personalShapes = Collections.unmodifiableMap(new LinkedHashMap<>(personalShapes));
            keyShapes = Collections.unmodifiableMap(new LinkedHashMap<>(keyShapes));
        }
    }

    /** 덤프를 연다. 같은 이름의 파일이 있으면 거부한다. */
    public ArchiveSession openArchive(Path directory, ArchiveHeader header) {
        Objects.requireNonNull(header, "header");
        String nonce = nonce();
        JsonLinesFile file = new JsonLinesFile(directory,
                "archive-" + header.archiveId() + "-" + STAMP.format(clock.instant()) + "-" + rand8() + ".jsonl",
                publisher);
        try {
            file.line(json -> {
                json.writeStartObject();
                json.writeStringField("format", ARCHIVE_FORMAT);
                json.writeNumberField("version", VERSION);
                json.writeStringField("nonce", nonce);
                json.writeStringField("archiveId", header.archiveId());
                json.writeStringField("table", header.table());
                writeNames(json, "keyColumns", header.keyColumns());
                writeNames(json, "columns", header.columns());
                writeNames(json, "ledgerEntries", header.ledgerEntries());
                json.writeStringField("retainUntil", header.retainUntil());
                json.writeStringField("timeZone", ZoneId.systemDefault().getId());
                json.writeStringField("planDigest", header.planDigest());
                json.writeStringField("mappingDigest", header.mappingDigest());
                json.writeEndObject();
            });
        } catch (RuntimeException failure) {
            file.close();
            throw failure;
        }
        return new ArchiveSession(file, header);
    }

    /** 격리 키 반출 파일을 연다. 같은 이름의 파일이 있으면 거부한다. */
    public IsolatedKeySession openIsolatedKeys(Path directory, IsolatedKeyHeader header) {
        Objects.requireNonNull(header, "header");
        String nonce = nonce();
        JsonLinesFile file = new JsonLinesFile(directory,
                "isolated-" + safeTableName(header.table()) + "-" + STAMP.format(clock.instant()) + "-" + rand8()
                        + ".jsonl",
                publisher);
        try {
            file.line(json -> {
                json.writeStartObject();
                json.writeStringField("format", ISOLATED_KEYS_FORMAT);
                json.writeNumberField("version", VERSION);
                json.writeStringField("nonce", nonce);
                json.writeStringField("table", header.table());
                writeNames(json, "keyColumns", header.keyColumns());
                json.writeStringField("timeZone", ZoneId.systemDefault().getId());
                json.writeStringField("planDigest", header.planDigest());
                json.writeStringField("mappingDigest", header.mappingDigest());
                json.writeEndObject();
            });
        } catch (RuntimeException failure) {
            file.close();
            throw failure;
        }
        return new IsolatedKeySession(file, header);
    }

    /**
     * 파일 이름에 쓰는 표 이름 — 영문·숫자·{@code _.-} 밖의 글자와 맨 앞 점은 밑줄로 바꾸고 64자로 자른다. 비면
     * {@code table} 이다.
     */
    static String safeTableName(String table) {
        String safe = UNSAFE_NAME.matcher(table == null ? "" : table).replaceAll("_");
        if (safe.startsWith(".")) {
            safe = "_" + safe.substring(1);
        }
        if (safe.length() > MAX_TABLE_NAME) {
            safe = safe.substring(0, MAX_TABLE_NAME);
        }
        return safe.isEmpty() ? "table" : safe;
    }

    /** 덤프 쓰기. 행을 다 쓰면 {@link #commit()}, 그렇지 않으면 {@link #close()} 가 임시 파일과 예약을 지운다. */
    public static final class ArchiveSession implements AutoCloseable {

        private final JsonLinesFile file;
        private final ArchiveHeader header;
        private final long[][] shapes;
        private final long[][] keyShapes;

        private ArchiveSession(JsonLinesFile file, ArchiveHeader header) {
            this.file = file;
            this.header = header;
            this.shapes = new long[header.columns().size()][3];
            this.keyShapes = new long[header.keyColumns().size()][3];
        }

        /**
         * 원천 행 하나를 쓴다. {@code key} 는 머리의 정렬 키 순서의 값, {@code values} 는 보관 컬럼 이름(머리 표기 그대로)마다의
         * 값이다 — 키·컬럼이 머리와 맞지 않으면 거부한다.
         */
        public void append(List<?> key, Map<String, ?> values) {
            Objects.requireNonNull(key, "key");
            Objects.requireNonNull(values, "values");
            if (key.size() != header.keyColumns().size() || values.size() != header.columns().size()
                    || !values.keySet().containsAll(header.columns())) {
                throw new IllegalArgumentException("보관 행의 정렬 키·보관 컬럼이 덤프 머리와 맞지 않습니다");
            }
            file.line(json -> {
                json.writeStartObject();
                json.writeArrayFieldStart("k");
                for (Object value : key) {
                    writeValue(json, value);
                }
                json.writeEndArray();
                json.writeObjectFieldStart("v");
                for (String column : header.columns()) {
                    json.writeFieldName(column);
                    writeValue(json, values.get(column));
                }
                json.writeEndObject();
                json.writeEndObject();
            });
            for (int index = 0; index < header.columns().size(); index++) {
                countShapes(shapes[index], values.get(header.columns().get(index)));
            }
            for (int index = 0; index < key.size(); index++) {
                countShapes(keyShapes[index], key.get(index));
            }
        }

        /** 다 쓴 덤프를 최종 이름으로 옮긴다. */
        public Written commit() {
            return file.commit(shapeCounts(header.columns(), shapes), shapeCounts(header.keyColumns(), keyShapes));
        }

        @Override
        public void close() {
            file.close();
        }
    }

    /** 격리 키 반출 쓰기. 다 쓰면 {@link #commit()}, 그렇지 않으면 {@link #close()} 가 임시 파일과 예약을 지운다. */
    public static final class IsolatedKeySession implements AutoCloseable {

        private final JsonLinesFile file;
        private final IsolatedKeyHeader header;
        private final long[][] keyShapes;
        private long lastOrdinal;

        private IsolatedKeySession(JsonLinesFile file, IsolatedKeyHeader header) {
            this.file = file;
            this.header = header;
            this.keyShapes = new long[header.keyColumns().size()][3];
        }

        /**
         * 격리한 행 하나를 쓴다. {@code key} 는 정렬 키 값, {@code ordinal} 은 원천 정렬 순서의 1부터 위치(늘어나기만 한다),
         * {@code violations} 는 그 행의 격리({@link RowIsolationPolicy.Isolated#matches()})다.
         */
        public void append(List<?> key, long ordinal, List<RowIsolationPolicy.Match> violations) {
            Objects.requireNonNull(key, "key");
            Objects.requireNonNull(violations, "violations");
            if (key.size() != header.keyColumns().size()) {
                throw new IllegalArgumentException("격리 행의 정렬 키가 반출 머리와 맞지 않습니다");
            }
            if (ordinal < 1 || ordinal <= lastOrdinal) {
                throw new IllegalArgumentException("격리 행 순번은 1 이상이고 늘어나기만 합니다");
            }
            if (violations.isEmpty() || violations.stream().anyMatch(Objects::isNull)) {
                throw new IllegalArgumentException("격리 행에는 격리 위반이 필요합니다");
            }
            file.line(json -> {
                json.writeStartObject();
                json.writeArrayFieldStart("k");
                for (Object value : key) {
                    writeValue(json, value);
                }
                json.writeEndArray();
                json.writeNumberField("ordinal", ordinal);
                json.writeArrayFieldStart("violations");
                for (RowIsolationPolicy.Match match : violations) {
                    json.writeStartObject();
                    json.writeStringField("ledgerEntry", match.ledgerEntry());
                    json.writeStringField("column", match.column());
                    json.writeStringField("violation", match.violation());
                    json.writeEndObject();
                }
                json.writeEndArray();
                json.writeEndObject();
            });
            lastOrdinal = ordinal;
            for (int index = 0; index < key.size(); index++) {
                countShapes(keyShapes[index], key.get(index));
            }
        }

        /** 다 쓴 반출 파일을 최종 이름으로 옮긴다. */
        public Written commit() {
            return file.commit(Map.of(), shapeCounts(header.keyColumns(), keyShapes));
        }

        @Override
        public void close() {
            file.close();
        }
    }

    /** JSON 한 줄을 쓰는 동작. */
    @FunctionalInterface
    private interface LineWriter {
        void write(JsonGenerator json) throws IOException;
    }

    /**
     * 예약·임시 파일·fsync·원자적 이동을 맡는 파일 하나. 한 줄을 쓰다 실패하면 그 뒤 쓰기·commit 을 받지 않는다 — 반쯤 쓴
     * 줄이 남은 파일을 내보내지 않는다.
     */
    private static final class JsonLinesFile {

        private final Path target;
        private final String fileName;
        private final Publisher publisher;
        private final MessageDigest digest = sha256();
        private Path temporary;
        private FileChannel channel;
        private CountingOutput output;
        private JsonGenerator json;
        private long lines;
        private boolean failed;
        private boolean committed;
        private boolean closed;

        JsonLinesFile(Path directory, String fileName, Publisher publisher) {
            Path real = ArchiveLocationGuard.requireDirectory(directory);
            this.fileName = fileName;
            this.publisher = publisher;
            this.target = real.resolve(fileName);
            FileAttribute<?>[] ownerOnly = ownerOnly(real);
            try {
                Files.createFile(target, ownerOnly);
            } catch (IOException failure) {
                closed = true;
                throw failure(failure);
            }
            try {
                // 만들기와 열기를 한 번에 한다 — 그 사이 다른 프로세스가 임시 파일을 링크로 바꿔 원시 값을 다른 곳에 쓰게
                //   하지 못한다. 이미 있으면(남은 파일·링크) 거부하고 지우지 않는다.
                Path created = real.resolve(temporaryName(fileName));
                channel = FileChannel.open(created, Set.of(StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE,
                        LinkOption.NOFOLLOW_LINKS), ownerOnly);
                temporary = created;
                output = new CountingOutput(Channels.newOutputStream(channel), digest);
                json = JSON.createGenerator(output, JsonEncoding.UTF8);
            } catch (IOException failure) {
                close();
                throw failure(failure);
            }
        }

        void line(LineWriter writer) {
            requireWritable();
            try {
                writer.write(json);
                json.writeRaw('\n');
                lines++;
            } catch (ArchiveWriteException failure) {
                failed = true;
                throw failure;
            } catch (IOException failure) {
                failed = true;
                throw failure(failure);
            } catch (RuntimeException failure) {
                failed = true;
                throw failure;
            }
        }

        Written commit(Map<String, PersonalShapes> shapes, Map<String, PersonalShapes> keyShapes) {
            requireWritable();
            try {
                json.flush();
                channel.force(true);
                json.close();
                channel.close();
                if (!Files.isRegularFile(target, LinkOption.NOFOLLOW_LINKS) || Files.size(target) != 0) {
                    throw new ArchiveWriteException(ArchiveWriteException.RESERVATION_CHANGED);
                }
                publisher.publish(temporary, target);
                committed = true;
                closed = true;
                // 머리 줄은 데이터 줄이 아니다.
                return new Written(fileName, lines - 1, output.count(), HexFormat.of().formatHex(digest.digest()),
                        shapes, keyShapes);
            } catch (IOException failure) {
                throw failure(failure);
            } finally {
                if (!committed) {
                    close();
                }
            }
        }

        /** commit 하지 않았으면 임시 파일과 빈 예약을 지운다. 여러 번 불러도 된다. */
        void close() {
            if (closed && temporary == null) {
                return;
            }
            closed = true;
            if (committed) {
                return;
            }
            closeQuietly();
            deleteQuietly(temporary);
            temporary = null;
            try {
                // 예약은 이 실행이 만든 빈 파일이다 — 내용이 있으면 다른 것이므로 지우지 않는다.
                if (Files.isRegularFile(target, LinkOption.NOFOLLOW_LINKS) && Files.size(target) == 0) {
                    Files.deleteIfExists(target);
                }
            } catch (IOException ignored) {
                // 원래 실패 신호를 보존한다.
            }
        }

        private void requireWritable() {
            if (closed || committed || failed) {
                throw new IllegalStateException("이미 닫았거나 실패한 보관 파일에는 쓸 수 없습니다");
            }
        }

        private void closeQuietly() {
            try {
                if (json != null) {
                    json.close();
                }
            } catch (IOException | RuntimeException ignored) {
                // 정리 중 실패는 원래 실패를 가리지 않는다.
            }
            try {
                if (channel != null) {
                    channel.close();
                }
            } catch (IOException ignored) {
                // 정리 중 실패는 원래 실패를 가리지 않는다.
            }
        }

        private static void deleteQuietly(Path path) {
            if (path == null) {
                return;
            }
            try {
                Files.deleteIfExists(path);
            } catch (IOException ignored) {
                // 원래 실패 신호를 보존한다.
            }
        }

        private static FileAttribute<?>[] ownerOnly(Path directory) {
            if (!directory.getFileSystem().supportedFileAttributeViews().contains("posix")) {
                return new FileAttribute<?>[0];
            }
            return new FileAttribute<?>[]{PosixFilePermissions.asFileAttribute(
                    EnumSet.of(PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE))};
        }
    }

    /** 쓴 바이트를 세고 SHA-256 에 더하는 출력. */
    private static final class CountingOutput extends FilterOutputStream {

        private final MessageDigest digest;
        private long count;

        CountingOutput(OutputStream out, MessageDigest digest) {
            super(out);
            this.digest = digest;
        }

        @Override
        public void write(int value) throws IOException {
            out.write(value);
            digest.update((byte) value);
            count++;
        }

        @Override
        public void write(byte[] bytes, int offset, int length) throws IOException {
            out.write(bytes, offset, length);
            digest.update(bytes, offset, length);
            count += length;
        }

        long count() {
            return count;
        }
    }

    /** 값 하나를 쓴다. 쓸 수 없는 값 종류는 값을 싣지 않고 멈춘다. */
    static void writeValue(JsonGenerator json, Object value) throws IOException {
        switch (value) {
            case null -> json.writeNull();
            case CharSequence text -> json.writeString(text.toString());
            case Character character -> json.writeString(character.toString());
            case Boolean bool -> json.writeBoolean(bool);
            case Byte number -> json.writeNumber(number.longValue());
            case Short number -> json.writeNumber(number.longValue());
            case Integer number -> json.writeNumber(number.longValue());
            case Long number -> json.writeNumber(number);
            case BigInteger number -> json.writeNumber(number);
            case BigDecimal number -> json.writeNumber(number);
            case Double number when Double.isFinite(number) -> json.writeNumber(number);
            case Float number when Float.isFinite(number) -> json.writeNumber(number);
            case java.sql.Timestamp timestamp -> json.writeString(timestamp.toLocalDateTime().toString());
            case java.sql.Date date -> json.writeString(date.toLocalDate().toString());
            case java.sql.Time time -> json.writeString(time.toLocalTime().toString());
            case java.util.Date date -> json.writeString(date.toInstant().toString());
            case TemporalAccessor temporal -> json.writeString(temporal.toString());
            case UUID uuid -> json.writeString(uuid.toString());
            case byte[] bytes -> {
                json.writeStartObject();
                json.writeStringField("$base64", Base64.getEncoder().encodeToString(bytes));
                json.writeEndObject();
            }
            default -> throw new ArchiveWriteException(ArchiveWriteException.VALUE_TYPE_UNSUPPORTED);
        }
    }

    /**
     * 쓴 바이트를 버리는 JSON 생성기 — dry-run 이 파일을 쓰지 않고 {@link #writeValue} 와 같은 값 종류 판정을 받는다.
     */
    static JsonGenerator discardingGenerator() {
        try {
            return JSON.createGenerator(OutputStream.nullOutputStream(), JsonEncoding.UTF8);
        } catch (IOException impossible) {
            throw new IllegalStateException("보관 값 확인용 생성기를 만들지 못했습니다");
        }
    }

    /** 두 digest 가 파일 머리에 쓸 수 있는 소문자 SHA-256 인지 본다. */
    static void requireDigests(String planDigest, String mappingDigest) {
        requireDigest(planDigest);
        requireDigest(mappingDigest);
    }

    /**
     * 최종 이름의 임시 파일 이름 — 점으로 시작하는 {@code .<최종 이름>.tmp} 다. 강제 종료 뒤 남은 것을 load 시작이 이 모양으로
     * 찾는다({@link ArchiveLocationGuard}).
     */
    static String temporaryName(String fileName) {
        return "." + fileName + ".tmp";
    }

    /** 이름 순서대로 센 개인정보 모양 수. */
    static Map<String, PersonalShapes> shapeCounts(List<String> names, long[][] shapes) {
        Map<String, PersonalShapes> counts = new LinkedHashMap<>();
        for (int index = 0; index < names.size(); index++) {
            long[] column = shapes[index];
            counts.put(names.get(index), new PersonalShapes(column[0], column[1], column[2]));
        }
        return counts;
    }

    /** 값 하나가 개인정보 모양인지 센다 — 문자와 수의 표기만 본다. */
    static void countShapes(long[] shapes, Object value) {
        String text = switch (value) {
            case null -> null;
            case CharSequence chars -> chars.toString();
            case Character character -> character.toString();
            case BigDecimal decimal -> decimal.toPlainString();
            case Number number -> number.toString();
            default -> null;
        };
        if (text == null) {
            return;
        }
        Set<PersonalDataPatterns.Kind> kinds = PersonalDataPatterns.find(text);
        if (kinds.contains(PersonalDataPatterns.Kind.RRN)) {
            shapes[0]++;
        }
        if (kinds.contains(PersonalDataPatterns.Kind.PHONE)) {
            shapes[1]++;
        }
        if (kinds.contains(PersonalDataPatterns.Kind.EMAIL)) {
            shapes[2]++;
        }
    }

    private static void writeNames(JsonGenerator json, String field, List<String> names) throws IOException {
        json.writeArrayFieldStart(field);
        for (String name : names) {
            json.writeString(name);
        }
        json.writeEndArray();
    }

    private String nonce() {
        byte[] bytes = new byte[16];
        random.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private String rand8() {
        byte[] bytes = new byte[4];
        random.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private static ArchiveWriteException failure(IOException failure) {
        if (failure instanceof FileAlreadyExistsException) {
            return new ArchiveWriteException(ArchiveWriteException.FILE_EXISTS);
        }
        if (failure instanceof AccessDeniedException) {
            return new ArchiveWriteException(ArchiveWriteException.ACCESS_DENIED);
        }
        if (failure instanceof AtomicMoveNotSupportedException) {
            return new ArchiveWriteException(ArchiveWriteException.ATOMIC_MOVE_UNSUPPORTED);
        }
        return new ArchiveWriteException(ArchiveWriteException.WRITE_FAILED);
    }

    private static MessageDigest sha256() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException(impossible);
        }
    }

    private static void requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
    }

    private static List<String> names(List<String> values, String message) {
        if (values == null || values.isEmpty() || values.stream().anyMatch(name -> name == null || name.isBlank())) {
            throw new IllegalArgumentException(message);
        }
        return List.copyOf(values);
    }

    private static void requireDigest(String value) {
        if (value == null || !DIGEST.matcher(value).matches()) {
            throw new IllegalArgumentException("보관 파일 머리의 plan·mapping digest 는 소문자 SHA-256 이어야 합니다");
        }
    }

    private static LocalDate date(String value) {
        if (value == null || !value.matches("\\d{4}-\\d{2}-\\d{2}")) {
            return null;
        }
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException invalid) {
            return null;
        }
    }
}
