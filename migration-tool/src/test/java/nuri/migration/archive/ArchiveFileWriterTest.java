package nuri.migration.archive;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.migration.archive.ArchiveFileWriter.ArchiveHeader;
import nuri.migration.archive.ArchiveFileWriter.ArchiveSession;
import nuri.migration.archive.ArchiveFileWriter.IsolatedKeyHeader;
import nuri.migration.archive.ArchiveFileWriter.IsolatedKeySession;
import nuri.migration.archive.ArchiveFileWriter.PersonalShapes;
import nuri.migration.archive.ArchiveFileWriter.Written;
import nuri.migration.isolate.RowIsolationPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.PosixFilePermission;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Base64;
import java.util.EnumSet;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;
import java.util.random.RandomGenerator;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 보관 덤프·격리 키 반출 파일 쓰기(ADR-0029 L3e) — 머리와 nonce, 파일 SHA-256, 원시 값 표기, 개인정보 모양 건수, 덮어쓰기
 * 거부, 실패·중단 때 임시 파일과 예약 정리, 문구에 경로·값 없음.
 */
class ArchiveFileWriterTest {

    private static final String PLAN = "a".repeat(64);
    private static final String MAPPING = "b".repeat(64);
    private static final Instant NOW = Instant.parse("2026-10-15T01:02:03Z");
    private static final ObjectMapper JSON = new ObjectMapper();

    @TempDir
    Path temp;

    private Path directory;

    @BeforeEach
    void realDirectory() throws IOException {
        directory = temp.toRealPath();
    }

    @Test
    void aDumpHasAHeaderWithANonceAndOneJsonLinePerRowAndItsDigestCoversTheWholeFile() throws Exception {
        Written written;
        try (ArchiveSession session = new ArchiveFileWriter().openArchive(directory, header())) {
            session.append(List.of(1L), values("910101-1234567 메모", null));
            byte[] photo = {0, 1, 2, (byte) 0xff};
            session.append(List.of(2L), values(new BigDecimal("1E+3"), photo));
            session.append(List.of(3L), values(Timestamp.valueOf(LocalDateTime.of(2024, 1, 31, 9, 30, 15)),
                    "a@b.co / 010-1234-5678"));
            written = session.commit();
        }

        assertThat(written.fileName()).matches("archive-legacy_user_20311231-20[0-9]{6}T[0-9]{6}Z-[0-9a-f]{8}\\.jsonl");
        Path file = directory.resolve(written.fileName());
        byte[] bytes = Files.readAllBytes(file);
        assertThat(written.rows()).isEqualTo(3);
        assertThat(written.bytes()).isEqualTo(bytes.length);
        assertThat(written.sha256()).isEqualTo(HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256").digest(bytes)));
        assertThat(written.personalShapes()).containsExactly(
                Map.entry("ETC1", new PersonalShapes(1, 0, 0)),
                Map.entry("RMRK2", new PersonalShapes(0, 1, 1)));
        try (Stream<Path> files = Files.list(directory)) {
            assertThat(files).as("임시 파일이 남지 않는다").containsExactly(file);
        }

        List<String> lines = new String(bytes, StandardCharsets.UTF_8).lines().toList();
        assertThat(lines).hasSize(4);
        assertThat(new String(bytes, StandardCharsets.UTF_8)).endsWith("}\n");
        JsonNode head = JSON.readTree(lines.getFirst());
        List<String> fields = new ArrayList<>();
        head.fieldNames().forEachRemaining(fields::add);
        assertThat(fields).containsExactly("format", "version", "nonce", "archiveId", "table", "keyColumns", "columns",
                "ledgerEntries", "retainUntil", "timeZone", "planDigest", "mappingDigest");
        assertThat(head.get("format").asText()).isEqualTo(ArchiveFileWriter.ARCHIVE_FORMAT);
        assertThat(head.get("version").asInt()).isEqualTo(1);
        assertThat(head.get("nonce").asText()).matches("[0-9a-f]{32}");
        assertThat(head.get("table").asText()).isEqualTo("legacy.USER_MST");
        assertThat(head.get("ledgerEntries")).hasSize(2);
        assertThat(head.get("retainUntil").asText()).isEqualTo("2031-12-31");
        assertThat(head.get("planDigest").asText()).isEqualTo(PLAN);
        assertThat(lines.get(1)).isEqualTo("{\"k\":[1],\"v\":{\"ETC1\":\"910101-1234567 메모\",\"RMRK2\":null}}");
        assertThat(lines.get(2)).isEqualTo("{\"k\":[2],\"v\":{\"ETC1\":1000,\"RMRK2\":{\"$base64\":\""
                + Base64.getEncoder().encodeToString(new byte[]{0, 1, 2, (byte) 0xff}) + "\"}}}");
        assertThat(lines.get(3)).isEqualTo("{\"k\":[3],\"v\":{\"ETC1\":\"2024-01-31T09:30:15\","
                + "\"RMRK2\":\"a@b.co / 010-1234-5678\"}}");
    }

    @Test
    void theNonceMakesTwoDumpsOfTheSameRowsDiffer() throws Exception {
        Written first;
        Written second;
        try (ArchiveSession session = new ArchiveFileWriter().openArchive(directory, header())) {
            session.append(List.of(1L), values("x", "y"));
            first = session.commit();
        }
        try (ArchiveSession session = new ArchiveFileWriter().openArchive(directory, header())) {
            session.append(List.of(1L), values("x", "y"));
            second = session.commit();
        }

        assertThat(second.fileName()).isNotEqualTo(first.fileName());
        assertThat(second.sha256()).isNotEqualTo(first.sha256());
        assertThat(second.bytes()).isEqualTo(first.bytes());
    }

    @Test
    void ownerOnlyPermissionsWhereTheFileSystemSupportsThem() throws Exception {
        Written written;
        try (ArchiveSession session = new ArchiveFileWriter().openArchive(directory, header())) {
            written = session.commit();
        }

        assertThat(written.rows()).isZero();
        if (directory.getFileSystem().supportedFileAttributeViews().contains("posix")) {
            assertThat(Files.getPosixFilePermissions(directory.resolve(written.fileName())))
                    .isEqualTo(EnumSet.of(PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE));
        }
    }

    @Test
    void anExistingFileIsNeverOverwritten() throws Exception {
        ArchiveFileWriter fixed = fixedWriter(ArchiveFileWriterTest::move);
        Written written;
        try (ArchiveSession session = fixed.openArchive(directory, header())) {
            session.append(List.of(1L), values("first", null));
            written = session.commit();
        }
        Path file = directory.resolve(written.fileName());
        byte[] before = Files.readAllBytes(file);

        assertThatThrownBy(() -> fixed.openArchive(directory, header()))
                .isInstanceOf(ArchiveWriteException.class)
                .hasMessage("보관 파일을 쓰지 못했습니다: ARCHIVE_FILE_EXISTS")
                .satisfies(failure -> assertThat(((ArchiveWriteException) failure).reason())
                        .isEqualTo(ArchiveWriteException.FILE_EXISTS));
        assertThat(Files.readAllBytes(file)).isEqualTo(before);
        try (Stream<Path> files = Files.list(directory)) {
            assertThat(files).containsExactly(file);
        }
    }

    @Test
    void aFailedPublishRemovesTheTemporaryFileAndTheReservation() throws Exception {
        for (ArchiveFileWriter.Publisher publisher : List.<ArchiveFileWriter.Publisher>of(
                (temporary, target) -> {
                    throw new IOException("disk full at " + temporary);
                },
                (temporary, target) -> {
                    throw new AtomicMoveNotSupportedException(temporary.toString(), target.toString(), "no");
                })) {
            ArchiveSession session = fixedWriter(publisher).openArchive(directory, header());
            session.append(List.of(1L), values("910101-1234567", null));

            assertThatThrownBy(session::commit).isInstanceOf(ArchiveWriteException.class)
                    .hasMessageStartingWith("보관 파일을 쓰지 못했습니다: ARCHIVE_")
                    .hasMessageNotContaining(directory.toString())
                    .hasMessageNotContaining("910101");
            session.close();
            try (Stream<Path> files = Files.list(directory)) {
                assertThat(files).as("임시 파일과 예약이 남지 않는다").isEmpty();
            }
        }
    }

    @Test
    void closingWithoutCommitOrAfterAFailedRowLeavesNothingAndRefusesFurtherWrites() throws Exception {
        try (ArchiveSession session = new ArchiveFileWriter().openArchive(directory, header())) {
            session.append(List.of(1L), values("x", "y"));
        }
        try (Stream<Path> files = Files.list(directory)) {
            assertThat(files).as("commit 없이 닫으면 아무것도 남지 않는다").isEmpty();
        }

        for (Object unsupported : List.<Object>of(new Object(), Double.NaN, Float.POSITIVE_INFINITY, List.of(1))) {
            ArchiveSession session = new ArchiveFileWriter().openArchive(directory, header());
            assertThatThrownBy(() -> session.append(List.of(1L), values(unsupported, null)))
                    .isInstanceOf(ArchiveWriteException.class)
                    .hasMessage("보관 파일을 쓰지 못했습니다: ARCHIVE_VALUE_TYPE_UNSUPPORTED");
            assertThatThrownBy(() -> session.append(List.of(2L), values("x", "y")))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("이미 닫았거나 실패한 보관 파일에는 쓸 수 없습니다");
            assertThatThrownBy(session::commit).hasMessage("이미 닫았거나 실패한 보관 파일에는 쓸 수 없습니다");
            session.close();
            session.close();
            try (Stream<Path> files = Files.list(directory)) {
                assertThat(files).as(String.valueOf(unsupported)).isEmpty();
            }
        }
    }

    @Test
    void aReservationChangedByAnotherProcessIsNeitherReplacedNorDeleted() throws Exception {
        ArchiveFileWriter fixed = fixedWriter(ArchiveFileWriterTest::move);
        ArchiveSession session = fixed.openArchive(directory, header());
        session.append(List.of(1L), values("x", "y"));
        Path reservation;
        try (Stream<Path> files = Files.list(directory)) {
            reservation = files.filter(path -> path.getFileName().toString().startsWith("archive-"))
                    .findFirst().orElseThrow();
        }
        Files.writeString(reservation, "someone else");

        assertThatThrownBy(session::commit).isInstanceOf(ArchiveWriteException.class)
                .hasMessage("보관 파일을 쓰지 못했습니다: ARCHIVE_RESERVATION_CHANGED");
        assertThat(Files.readString(reservation)).isEqualTo("someone else");
        try (Stream<Path> files = Files.list(directory)) {
            assertThat(files).containsExactly(reservation);
        }
    }

    @Test
    void rowsAndHeadersMustMatchTheirShape() {
        try (ArchiveSession session = new ArchiveFileWriter().openArchive(directory, header())) {
            String mismatch = "보관 행의 정렬 키·보관 컬럼이 덤프 머리와 맞지 않습니다";
            assertThatThrownBy(() -> session.append(List.of(1L, 2L), values("x", "y"))).hasMessage(mismatch);
            assertThatThrownBy(() -> session.append(List.of(1L), Map.of("ETC1", "x"))).hasMessage(mismatch);
            Map<String, Object> extra = new LinkedHashMap<>(values("x", "y"));
            extra.put("OTHER", "z");
            assertThatThrownBy(() -> session.append(List.of(1L), extra)).hasMessage(mismatch);
            Map<String, Object> renamed = new LinkedHashMap<>();
            renamed.put("etc1", "x");
            renamed.put("RMRK2", "y");
            assertThatThrownBy(() -> session.append(List.of(1L), renamed)).hasMessage(mismatch);
        }

        assertThatThrownBy(() -> new ArchiveHeader("Legacy", "t", List.of("K"), List.of("C"), List.of("L1"),
                "2031-12-31", PLAN, MAPPING)).hasMessage("보관 id 는 소문자로 시작하는 소문자·숫자·밑줄 63자 이내여야 합니다");
        assertThatThrownBy(() -> new ArchiveHeader("a", "t", List.of("K"), List.of("C", "D"), List.of("L1"),
                "2031-12-31", PLAN, MAPPING)).hasMessage("보관 덤프의 원장 행 ID 는 보관 컬럼과 같은 순서·같은 수여야 합니다");
        assertThatThrownBy(() -> new ArchiveHeader("a", "t", List.of("K"), List.of("C", "C"), List.of("L1", "L2"),
                "2031-12-31", PLAN, MAPPING)).hasMessage("보관 덤프의 보관 컬럼은 한 번씩 둡니다");
        assertThatThrownBy(() -> new ArchiveHeader("a", "t", List.of(), List.of("C"), List.of("L1"),
                "2031-12-31", PLAN, MAPPING)).hasMessage("보관 덤프에는 정렬 키 컬럼이 필요합니다");
        assertThatThrownBy(() -> new ArchiveHeader("a", "t", List.of("K"), List.of("C"), List.of("L1"),
                "2031-02-30", PLAN, MAPPING)).hasMessage("보관 덤프의 보존 기한은 yyyy-MM-dd 날짜여야 합니다");
        assertThatThrownBy(() -> new ArchiveHeader("a", "t", List.of("K"), List.of("C"), List.of("L1"),
                "2031-12-31", "A".repeat(64), MAPPING))
                .hasMessage("보관 파일 머리의 plan·mapping digest 는 소문자 SHA-256 이어야 합니다");
    }

    @Test
    void theDirectoryMustBeAnAbsoluteExistingRealDirectory() {
        assertThatThrownBy(() -> new ArchiveFileWriter().openArchive(Path.of("relative"), header()))
                .hasMessage("보관 디렉터리는 절대 경로여야 합니다");
        assertThatThrownBy(() -> new ArchiveFileWriter().openArchive(directory.resolve("missing"), header()))
                .hasMessage("보관 디렉터리가 없거나 디렉터리가 아닙니다");
    }

    @Test
    void isolatedKeysAreExportedWithOrdinalsAndViolationCodesOnly() throws Exception {
        Written written;
        try (IsolatedKeySession session = new ArchiveFileWriter().openIsolatedKeys(directory,
                new IsolatedKeyHeader("legacy.\"USER MST\"", List.of("USER_SN", "SEQ"), PLAN, MAPPING))) {
            session.append(List.of(812L, "A1"), 3, List.of(new RowIsolationPolicy.Match("L7", "end_ymd",
                    "INVALID_DATE")));
            assertThatThrownBy(() -> session.append(List.of(813L, "A2"), 3, List.of(new RowIsolationPolicy.Match(
                    "L7", "end_ymd", "INVALID_DATE")))).hasMessage("격리 행 순번은 1 이상이고 늘어나기만 합니다");
            assertThatThrownBy(() -> session.append(List.of(813L, "A2"), 4, List.of()))
                    .hasMessage("격리 행에는 격리 위반이 필요합니다");
            assertThatThrownBy(() -> session.append(List.of(813L), 4, List.of(new RowIsolationPolicy.Match(
                    "L7", "end_ymd", "INVALID_DATE")))).hasMessage("격리 행의 정렬 키가 반출 머리와 맞지 않습니다");
            session.append(List.of(900L, "B1"), 9, List.of(new RowIsolationPolicy.Match("L7", "end_ymd",
                    "INVALID_DATE"), new RowIsolationPolicy.Match("L8", "use_yn", "CODEMAP_UNMAPPED")));
            written = session.commit();
        }

        assertThat(written.fileName()).matches("isolated-legacy\\._USER_MST_-20[0-9]{6}T[0-9]{6}Z-[0-9a-f]{8}\\.jsonl");
        assertThat(written.rows()).isEqualTo(2);
        assertThat(written.personalShapes()).isEmpty();
        assertThat(written.keyShapes()).containsExactly(Map.entry("USER_SN", new PersonalShapes(0, 0, 0)),
                Map.entry("SEQ", new PersonalShapes(0, 0, 0)));
        List<String> lines = Files.readAllLines(directory.resolve(written.fileName()), StandardCharsets.UTF_8);
        JsonNode head = JSON.readTree(lines.getFirst());
        List<String> fields = new ArrayList<>();
        head.fieldNames().forEachRemaining(fields::add);
        assertThat(fields).containsExactly("format", "version", "nonce", "table", "keyColumns", "timeZone",
                "planDigest", "mappingDigest");
        assertThat(head.get("format").asText()).isEqualTo(ArchiveFileWriter.ISOLATED_KEYS_FORMAT);
        assertThat(head.get("table").asText()).isEqualTo("legacy.\"USER MST\"");
        assertThat(lines.get(1)).isEqualTo("{\"k\":[812,\"A1\"],\"ordinal\":3,\"violations\":[{\"ledgerEntry\":"
                + "\"L7\",\"column\":\"end_ymd\",\"violation\":\"INVALID_DATE\"}]}");
        assertThat(lines.get(2)).startsWith("{\"k\":[900,\"B1\"],\"ordinal\":9,\"violations\":[{");
    }

    @Test
    void fileNamesUseOnlySafeCharacters() {
        assertThat(ArchiveFileWriter.safeTableName("legacy.USER_MST")).isEqualTo("legacy.USER_MST");
        assertThat(ArchiveFileWriter.safeTableName("..\\..\\etc/passwd")).as("경로 구분자와 맨 앞 점이 남지 않는다")
                .isEqualTo("_._.._etc_passwd");
        assertThat(ArchiveFileWriter.safeTableName("사용자")).isEqualTo("___");
        assertThat(ArchiveFileWriter.safeTableName("x".repeat(80))).hasSize(64);
        assertThat(ArchiveFileWriter.safeTableName("")).isEqualTo("table");
    }

    @Test
    void valuesAreWrittenInAStableTextualForm() throws Exception {
        Written written;
        try (ArchiveSession session = new ArchiveFileWriter().openArchive(directory, header())) {
            session.append(List.of(LocalDate.of(2024, 2, 29)), values(java.sql.Date.valueOf("2024-02-29"), true));
            session.append(List.of(new BigDecimal("12.3400")), values(java.util.UUID.fromString(
                    "123e4567-e89b-12d3-a456-426614174000"), 'Y'));
            written = session.commit();
        }

        List<String> lines = Files.readAllLines(directory.resolve(written.fileName()), StandardCharsets.UTF_8);
        assertThat(lines.get(1)).isEqualTo("{\"k\":[\"2024-02-29\"],\"v\":{\"ETC1\":\"2024-02-29\",\"RMRK2\":true}}");
        assertThat(lines.get(2)).isEqualTo("{\"k\":[12.3400],\"v\":{\"ETC1\":\"123e4567-e89b-12d3-a456-426614174000\","
                + "\"RMRK2\":\"Y\"}}");
    }

    @Test
    void orderKeyValuesAreCountedForPersonalShapesInDumpsAndIsolatedKeys() throws Exception {
        // 정렬 키 원값도 덤프 행마다·격리 키 파일에 그대로 실린다 — 키 컬럼마다 모양 수를 센다(DEC-OPS-321 U2).
        Written dump;
        try (ArchiveSession session = new ArchiveFileWriter().openArchive(directory, header())) {
            session.append(List.of("9101011234567"), values("x", null));
            session.append(List.of("k2"), values("910101-1234567", null));
            dump = session.commit();
        }
        Written keys;
        try (IsolatedKeySession session = new ArchiveFileWriter().openIsolatedKeys(directory,
                new IsolatedKeyHeader("legacy.USER_MST", List.of("USER_SN", "MAIL"), PLAN, MAPPING))) {
            session.append(List.of("9101011234567", "a@b.co"), 1, List.of(new RowIsolationPolicy.Match("L7",
                    "end_ymd", "INVALID_DATE")));
            keys = session.commit();
        }

        assertThat(dump.keyShapes()).containsExactly(Map.entry("USER_SN", new PersonalShapes(1, 0, 0)));
        assertThat(dump.personalShapes()).containsExactly(Map.entry("ETC1", new PersonalShapes(1, 0, 0)),
                Map.entry("RMRK2", new PersonalShapes(0, 0, 0)));
        assertThat(keys.keyShapes()).containsExactly(Map.entry("USER_SN", new PersonalShapes(1, 0, 0)),
                Map.entry("MAIL", new PersonalShapes(0, 0, 1)));
    }

    @Test
    void timestampsAreWrittenInTheJvmTimeZoneThatTheHeaderRecords() throws Exception {
        // 시간대가 붙은 원천 값(timestamptz)은 JVM 시간대의 날짜·시각으로 쓴다 — 그 시간대를 머리에 남겨 시각을 되찾는다.
        TimeZone original = TimeZone.getDefault();
        Timestamp instant = Timestamp.from(Instant.parse("2026-01-01T00:00:00Z"));
        try {
            for (Map.Entry<String, String> zone : List.of(Map.entry("Asia/Seoul", "2026-01-01T09:00"),
                    Map.entry("UTC", "2026-01-01T00:00"))) {
                TimeZone.setDefault(TimeZone.getTimeZone(zone.getKey()));
                Written dump;
                try (ArchiveSession session = new ArchiveFileWriter().openArchive(directory, header())) {
                    session.append(List.of(1L), values(instant, null));
                    dump = session.commit();
                }
                Written keys;
                try (IsolatedKeySession session = new ArchiveFileWriter().openIsolatedKeys(directory,
                        new IsolatedKeyHeader("legacy.USER_MST", List.of("REG_DT"), PLAN, MAPPING))) {
                    session.append(List.of(instant), 1, List.of(new RowIsolationPolicy.Match("L7", "end_ymd",
                            "INVALID_DATE")));
                    keys = session.commit();
                }

                List<String> lines = Files.readAllLines(directory.resolve(dump.fileName()), StandardCharsets.UTF_8);
                assertThat(JSON.readTree(lines.getFirst()).get("timeZone").asText()).isEqualTo(zone.getKey());
                assertThat(lines.get(1)).isEqualTo("{\"k\":[1],\"v\":{\"ETC1\":\"" + zone.getValue()
                        + "\",\"RMRK2\":null}}");
                List<String> keyLines = Files.readAllLines(directory.resolve(keys.fileName()), StandardCharsets.UTF_8);
                assertThat(JSON.readTree(keyLines.getFirst()).get("timeZone").asText()).isEqualTo(zone.getKey());
                assertThat(keyLines.get(1)).startsWith("{\"k\":[\"" + zone.getValue() + "\"]");
            }
        } finally {
            TimeZone.setDefault(original);
        }
    }

    @Test
    void anExistingTemporaryNameIsRefusedNotFollowedAndNotDeleted() throws Exception {
        // 임시 파일은 링크를 따르지 않는 CREATE_NEW 로 한 번에 만든다 — 같은 이름이 있으면(남은 파일·링크) 거부하고 지우지
        //   않으며, 예약은 지운다.
        ArchiveFileWriter fixed = fixedWriter(ArchiveFileWriterTest::move);
        String fileName;
        try (ArchiveSession session = fixed.openArchive(directory, header())) {
            fileName = session.commit().fileName();
        }
        Files.delete(directory.resolve(fileName));
        Path planted = Files.writeString(directory.resolve("." + fileName + ".tmp"), "planted");

        assertThatThrownBy(() -> fixed.openArchive(directory, header()))
                .isInstanceOf(ArchiveWriteException.class)
                .hasMessage("보관 파일을 쓰지 못했습니다: ARCHIVE_FILE_EXISTS");
        assertThat(Files.readString(planted)).isEqualTo("planted");
        try (Stream<Path> files = Files.list(directory)) {
            assertThat(files).as("예약은 지우고 남의 파일은 그대로 둔다").containsExactly(planted);
        }
    }

    private static ArchiveHeader header() {
        return new ArchiveHeader("legacy_user_20311231", "legacy.USER_MST", List.of("USER_SN"),
                List.of("ETC1", "RMRK2"), List.of("U7", "U8"), "2031-12-31", PLAN, MAPPING);
    }

    private static Map<String, Object> values(Object etc, Object remark) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("ETC1", etc);
        values.put("RMRK2", remark);
        return values;
    }

    /** 같은 시각·같은 난수 — 같은 파일 이름을 다시 만든다. */
    private static ArchiveFileWriter fixedWriter(ArchiveFileWriter.Publisher publisher) {
        RandomGenerator fixed = () -> 0x0123456789abcdefL;
        return new ArchiveFileWriter(Clock.fixed(NOW, ZoneOffset.UTC), fixed, publisher);
    }

    private static void move(Path temporary, Path target) throws IOException {
        Files.move(temporary, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
    }
}
