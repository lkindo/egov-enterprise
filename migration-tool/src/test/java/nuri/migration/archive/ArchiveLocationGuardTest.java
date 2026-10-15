package nuri.migration.archive;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 보관 디렉터리 검사(ADR-0029 L3e) — 절대 경로, 링크 없음, 승인 산출물 디렉터리 밖, Git 작업 트리 밖. 문구에 경로가 없다.
 *
 * <p>Gradle 은 시험 JVM 의 임시 디렉터리를 저장소 안에 둘 수 있다 — 그러면 모든 디렉터리가 Git 작업 트리 안이라 정상 경로를
 * 볼 수 없다. 그래서 운영체제 임시 디렉터리 가운데 Git 트리 밖의 것을 골라 그 아래에서 시험한다.</p>
 */
class ArchiveLocationGuardTest {

    private static final String RELATIVE = "보관 디렉터리는 절대 경로여야 합니다";
    private static final String MISSING = "보관 디렉터리가 없거나 디렉터리가 아닙니다";
    private static final String LINKED = "보관 디렉터리 경로에 심볼릭 링크(또는 실제 경로와 다른 이름)가 있습니다";
    private static final String NEXT_TO_INPUTS = "보관 디렉터리는 mapping·plan·원장·inventory 파일이 있는 디렉터리나 그"
            + " 아래에 둘 수 없습니다 — 원시 값 덤프가 승인 산출물과 섞입니다";
    private static final String IN_GIT = "보관 디렉터리가 Git 작업 트리 안에 있습니다 — 원시 값 덤프가 커밋될 수 있습니다";
    private static final String LEFTOVERS = "보관 디렉터리에 끝나지 않은 이전 실행의 임시 파일이나 빈 예약이 있습니다 —"
            + " 이관 복구 런북에 따라 확인·폐기한 뒤 다시 실행하세요";
    private static final String OTHERS_WRITE = "보관 디렉터리를 다른 사용자도 쓸 수 있습니다 — 원시 값 덤프를 남이 바꾸거나"
            + " 지울 수 있습니다";

    private Path base;

    @BeforeEach
    void createBaseOutsideAnyGitTree() throws IOException {
        Path root = Stream.of(System.getProperty("java.io.tmpdir"), System.getenv("TMPDIR"), System.getenv("TEMP"),
                        System.getenv("TMP"), "/tmp")
                .filter(candidate -> candidate != null && !candidate.isBlank())
                .map(Path::of)
                .filter(candidate -> Files.isDirectory(candidate) && !insideGit(candidate))
                .findFirst()
                .orElse(null);
        Assumptions.assumeTrue(root != null, "Git 작업 트리 밖의 임시 디렉터리가 없습니다");
        base = Files.createTempDirectory(root.toRealPath(), "archive-guard-").toRealPath();
    }

    @AfterEach
    void removeBase() throws IOException {
        if (base == null) {
            return;
        }
        try (Stream<Path> paths = Files.walk(base)) {
            for (Path path : paths.sorted(Comparator.reverseOrder()).toList()) {
                Files.deleteIfExists(path);
            }
        }
    }

    @Test
    void anAbsoluteRealDirectoryOutsideTheInputsAndGitIsAccepted() throws IOException {
        Path dumps = Files.createDirectories(base.resolve("dumps"));
        Path work = Files.createDirectories(base.resolve("work"));

        assertThat(ArchiveLocationGuard.requireSafeDirectory(dumps, List.of(work.resolve("mapping.yml"),
                work.resolve("plan.json"), work.resolve("ledger").resolve("terms.yml"), work.resolve("inventory.json"))))
                .isEqualTo(dumps);
    }

    @Test
    void aRelativeMissingOrNonDirectoryPathIsRefused() throws IOException {
        Path file = Files.writeString(base.resolve("file.txt"), "x");

        assertThatThrownBy(() -> ArchiveLocationGuard.requireSafeDirectory(Path.of("dumps"), List.of()))
                .isInstanceOf(IllegalArgumentException.class).hasMessage(RELATIVE);
        assertThatThrownBy(() -> ArchiveLocationGuard.requireSafeDirectory(base.resolve("missing"), List.of()))
                .hasMessage(MISSING);
        assertThatThrownBy(() -> ArchiveLocationGuard.requireSafeDirectory(file, List.of())).hasMessage(MISSING);
    }

    @Test
    void theDirectoriesOfTheApprovedInputsAndEverythingBelowThemAreRefused() throws IOException {
        Path work = Files.createDirectories(base.resolve("work"));
        Path below = Files.createDirectories(work.resolve("dumps"));
        Path ledgerDirectory = Files.createDirectories(base.resolve("ledger"));

        for (Path input : List.of(work.resolve("mapping.yml"), work.resolve("plan.json"),
                work.resolve("inventory.json"))) {
            assertThatThrownBy(() -> ArchiveLocationGuard.requireSafeDirectory(work, List.of(input))).as(input.toString())
                    .hasMessage(NEXT_TO_INPUTS);
            assertThatThrownBy(() -> ArchiveLocationGuard.requireSafeDirectory(below, List.of(input)))
                    .hasMessage(NEXT_TO_INPUTS).hasMessageNotContaining(base.toString());
        }
        assertThatThrownBy(() -> ArchiveLocationGuard.requireSafeDirectory(ledgerDirectory,
                List.of(ledgerDirectory.resolve("terms.yml")))).hasMessage(NEXT_TO_INPUTS);
        assertThat(ArchiveLocationGuard.requireSafeDirectory(ledgerDirectory, List.of(below.resolve("mapping.yml"))))
                .as("입력이 덤프 디렉터리 아래에 있는 것은 막지 않는다 — 덤프가 입력과 섞이지 않는다").isEqualTo(ledgerDirectory);
    }

    @Test
    void aGitWorkTreeAboveOrAtTheDirectoryIsRefused() throws IOException {
        Path repository = Files.createDirectories(base.resolve("repo"));
        Path dumps = Files.createDirectories(repository.resolve("out").resolve("dumps"));
        Files.createDirectories(repository.resolve(".git"));
        Path worktree = Files.createDirectories(base.resolve("worktree"));
        Files.writeString(worktree.resolve(".git"), "gitdir: elsewhere\n");

        assertThatThrownBy(() -> ArchiveLocationGuard.requireSafeDirectory(dumps, List.of())).hasMessage(IN_GIT);
        assertThatThrownBy(() -> ArchiveLocationGuard.requireSafeDirectory(repository, List.of())).hasMessage(IN_GIT);
        assertThatThrownBy(() -> ArchiveLocationGuard.requireSafeDirectory(worktree, List.of()))
                .as("worktree·submodule 의 .git 파일도 본다").hasMessage(IN_GIT);
    }

    @Test
    void aLinkedDirectoryIsRefused() throws IOException {
        Path real = Files.createDirectories(base.resolve("real"));
        Path link = base.resolve("link");
        createDirectoryLink(link, real);

        assertThatThrownBy(() -> ArchiveLocationGuard.requireSafeDirectory(link, List.of())).hasMessage(LINKED)
                .hasMessageNotContaining(base.toString());
        Files.createDirectories(real.resolve("child"));
        assertThatThrownBy(() -> ArchiveLocationGuard.requireSafeDirectory(link.resolve("child"), List.of()))
                .as("링크 아래의 디렉터리").hasMessage(LINKED);
        assertThat(ArchiveLocationGuard.requireSafeDirectory(real.resolve("child"), List.of()))
                .as("링크를 거치지 않은 같은 디렉터리").isEqualTo(real.resolve("child"));
    }

    @Test
    void theLeftoversOfAForciblyEndedRunAreRefusedWithoutNamingThem() throws IOException {
        // 강제로 끝난 실행은 finally 를 돌지 못해 임시 파일·빈 예약을 남긴다 — 원시 값 조각이 증거 없이 남아 있다.
        Path dumps = Files.createDirectories(base.resolve("dumps"));
        Files.writeString(dumps.resolve("archive-old-20261015T010203Z-0a1b2c3d.jsonl"), "{\"format\":\"x\"}\n");
        Files.writeString(dumps.resolve("notes.txt"), "");
        assertThat(ArchiveLocationGuard.requireSafeDirectory(dumps, List.of())).as("마친 파일·다른 파일은 막지 않는다")
                .isEqualTo(dumps);

        for (String leftover : List.of(".archive-a-20261015T010203Z-0a1b2c3d.jsonl.tmp",
                ".isolated-t-20261015T010203Z-0a1b2c3d.jsonl.tmp", ".archive-123.tmp",
                "archive-a-20261015T010203Z-0a1b2c3d.jsonl", "isolated-t-20261015T010203Z-0a1b2c3d.jsonl")) {
            Path file = Files.createFile(dumps.resolve(leftover));
            assertThatThrownBy(() -> ArchiveLocationGuard.requireSafeDirectory(dumps, List.of())).as(leftover)
                    .isInstanceOf(IllegalArgumentException.class).hasMessage(LEFTOVERS);
            Files.delete(file);
        }
    }

    @Test
    void aDirectoryOtherUsersCanWriteIsRefusedOnPosix() throws IOException {
        Path dumps = Files.createDirectories(base.resolve("shared"));
        Assumptions.assumeTrue(dumps.getFileSystem().supportedFileAttributeViews().contains("posix"),
                "POSIX 권한이 없는 파일 시스템");

        Files.setPosixFilePermissions(dumps, PosixFilePermissions.fromString("rwxrwxrwx"));
        assertThatThrownBy(() -> ArchiveLocationGuard.requireSafeDirectory(dumps, List.of())).hasMessage(OTHERS_WRITE);
        Files.setPosixFilePermissions(dumps, PosixFilePermissions.fromString("rwxrwx---"));
        assertThat(ArchiveLocationGuard.requireSafeDirectory(dumps, List.of())).as("그룹 쓰기는 기관 정책이다")
                .isEqualTo(dumps);
    }

    /** 심볼릭 링크를 만든다. 권한이 없는 Windows 에서는 실제 경로가 다른 junction 을 만든다. 둘 다 안 되면 건너뛴다. */
    private static void createDirectoryLink(Path link, Path target) {
        try {
            Files.createSymbolicLink(link, target);
            return;
        } catch (UnsupportedOperationException | IOException unavailable) {
            // 아래 junction 으로 시도한다.
        }
        boolean windows = System.getProperty("os.name", "").toLowerCase(Locale.ROOT).contains("windows");
        Assumptions.assumeTrue(windows, "symbolic links unavailable in this environment");
        try {
            Process process = new ProcessBuilder("cmd", "/c", "mklink", "/J", link.toString(), target.toString())
                    .redirectErrorStream(true).start();
            process.getInputStream().readAllBytes();
            boolean finished = process.waitFor(30, TimeUnit.SECONDS);
            Assumptions.assumeTrue(finished && process.exitValue() == 0
                    && Files.isDirectory(link, LinkOption.NOFOLLOW_LINKS), "directory junctions unavailable");
        } catch (IOException | InterruptedException unavailable) {
            if (unavailable instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            Assumptions.abort("directory links unavailable in this environment");
        }
    }

    private static boolean insideGit(Path directory) {
        try {
            for (Path current = directory.toRealPath(); current != null; current = current.getParent()) {
                if (Files.exists(current.resolve(".git"), LinkOption.NOFOLLOW_LINKS)) {
                    return true;
                }
            }
            return false;
        } catch (IOException | SecurityException unreadable) {
            return true;
        }
    }
}
