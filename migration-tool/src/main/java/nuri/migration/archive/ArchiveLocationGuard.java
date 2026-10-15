package nuri.migration.archive;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.util.Collection;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Stream;

/**
 * 외부 보관 덤프·격리 키 반출 파일을 쓸 디렉터리를 검사한다(ADR-0029 L3e). 덤프는 원시 값을 평문으로 담으므로 승인
 * 산출물(mapping·plan·원장·inventory)과 섞이거나 Git 작업 트리에 들어가 커밋되지 않게 한다. 문구는 고정 어휘다 — 경로를
 * 싣지 않는다.
 *
 * <ul>
 *   <li>절대 경로여야 한다. 상대 경로는 실행 위치에 따라 다른 곳에 쓴다.</li>
 *   <li>있는 디렉터리여야 하고 경로의 어느 부분에도 심볼릭 링크가 없어야 한다. 실제 경로({@code toRealPath})가 적은 경로와
 *       다르면(Windows 의 junction·8.3 짧은 이름 포함) 링크로 보고 거부한다 — 틀리는 쪽은 거부다.</li>
 *   <li>mapping·plan·원장·inventory 파일이 있는 디렉터리나 그 아래가 아니어야 한다. 실행 증거는 plan 옆에 쓰이므로 증거와도
 *       섞이지 않는다.</li>
 *   <li>그 디렉터리와 위 디렉터리 어디에도 {@code .git}(디렉터리 또는 worktree·submodule 의 파일)이 없어야 한다.</li>
 *   <li>POSIX 에서는 다른 사용자(기타)가 쓸 수 있는 디렉터리가 아니어야 한다 — 그러면 남이 덤프를 바꾸거나 지울 수 있다.</li>
 *   <li>강제로 끝난 이전 실행이 남긴 임시 파일({@code .archive-*.tmp}·{@code .isolated-*.tmp})이나 빈 예약
 *       ({@code archive-*.jsonl}·{@code isolated-*.jsonl} 0바이트)이 없어야 한다 — 원시 값 조각이 증거 없이 남아 있으므로
 *       런북에 따라 확인·폐기한 뒤 다시 실행한다.</li>
 * </ul>
 *
 * <p>한계: {@code .git} 판정은 휴리스틱이다. {@code GIT_DIR}·{@code --work-tree} 로 다른 곳에 둔 저장소, bare 저장소,
 * 다른 버전 관리 도구와 동기화 폴더(클라우드 드라이브)는 찾지 못한다. 접근 통제(파일 권한·보존·폐기)는 기관 정책이다 —
 * POSIX 에서는 파일을 0600 으로 만들지만 Windows 에서는 강제하지 못하고, 디렉터리의 소유자·그룹 쓰기 권한은 보지 않는다.</p>
 */
public final class ArchiveLocationGuard {

    private ArchiveLocationGuard() {}

    /**
     * 덤프 디렉터리를 검사하고 실제 경로를 돌려준다. {@code protectedInputs} 는 이번 실행이 읽는 mapping·plan·원장·inventory
     * 파일 경로다 — 그 파일이 있는 디렉터리와 그 아래에는 쓰지 않는다.
     */
    public static Path requireSafeDirectory(Path directory, Collection<Path> protectedInputs) {
        Objects.requireNonNull(protectedInputs, "protectedInputs");
        Path real = requireDirectory(directory);
        for (Path input : protectedInputs) {
            Objects.requireNonNull(input, "protectedInput");
            Path parent = input.toAbsolutePath().normalize().getParent();
            if (parent == null) {
                continue;
            }
            Path protectedDirectory = realOrNormalized(parent);
            if (real.startsWith(protectedDirectory)) {
                throw new IllegalArgumentException("보관 디렉터리는 mapping·plan·원장·inventory 파일이 있는 디렉터리나 그"
                        + " 아래에 둘 수 없습니다 — 원시 값 덤프가 승인 산출물과 섞입니다");
            }
        }
        for (Path current = real; current != null; current = current.getParent()) {
            if (Files.exists(current.resolve(".git"), LinkOption.NOFOLLOW_LINKS)) {
                throw new IllegalArgumentException("보관 디렉터리가 Git 작업 트리 안에 있습니다 — 원시 값 덤프가 커밋될 수"
                        + " 있습니다");
            }
        }
        if (hasLeftovers(real)) {
            throw new IllegalArgumentException("보관 디렉터리에 끝나지 않은 이전 실행의 임시 파일이나 빈 예약이 있습니다 —"
                    + " 이관 복구 런북에 따라 확인·폐기한 뒤 다시 실행하세요");
        }
        return real;
    }

    /** 강제로 끝난 실행이 남긴 임시 파일·빈 예약이 있는가. 목록을 읽지 못하면 있다고 본다(fail-closed). */
    static boolean hasLeftovers(Path directory) {
        try (Stream<Path> entries = Files.list(directory)) {
            return entries.anyMatch(ArchiveLocationGuard::leftover);
        } catch (IOException | UncheckedIOException unreadable) {
            return true;
        }
    }

    private static boolean leftover(Path entry) {
        String name = entry.getFileName().toString();
        if ((name.startsWith(".archive-") || name.startsWith(".isolated-")) && name.endsWith(".tmp")) {
            return true;
        }
        if ((name.startsWith("archive-") || name.startsWith("isolated-")) && name.endsWith(".jsonl")) {
            try {
                // 마친 파일은 머리 줄이 있어 비지 않는다 — 빈 파일은 예약이다.
                return Files.isRegularFile(entry, LinkOption.NOFOLLOW_LINKS) && Files.size(entry) == 0;
            } catch (IOException unreadable) {
                return true;
            }
        }
        return false;
    }

    /**
     * 덤프 파일을 쓰기 직전의 기본 검사 — 절대 경로이고, 심볼릭 링크 없이 있는 디렉터리다. 실제 경로를 돌려준다. 승인
     * 산출물·Git 트리 검사는 load 시작 때 {@link #requireSafeDirectory} 가 한다.
     */
    static Path requireDirectory(Path directory) {
        Objects.requireNonNull(directory, "directory");
        if (!directory.isAbsolute()) {
            throw new IllegalArgumentException("보관 디렉터리는 절대 경로여야 합니다");
        }
        Path normalized = directory.normalize();
        Path current = normalized.getRoot();
        for (Path part : normalized) {
            current = current == null ? part : current.resolve(part);
            if (Files.isSymbolicLink(current)) {
                throw linked();
            }
        }
        if (!Files.isDirectory(normalized, LinkOption.NOFOLLOW_LINKS)) {
            throw new IllegalArgumentException("보관 디렉터리가 없거나 디렉터리가 아닙니다");
        }
        Path real;
        try {
            real = normalized.toRealPath();
        } catch (IOException unreadable) {
            throw new IllegalArgumentException("보관 디렉터리의 실제 경로를 확인하지 못했습니다");
        }
        // Path.equals 는 파일 시스템의 대소문자 규칙을 따른다(Windows 는 무시한다).
        if (!real.equals(normalized)) {
            throw linked();
        }
        if (real.getFileSystem().supportedFileAttributeViews().contains("posix")) {
            Set<PosixFilePermission> permissions;
            try {
                permissions = Files.getPosixFilePermissions(real, LinkOption.NOFOLLOW_LINKS);
            } catch (IOException unreadable) {
                throw new IllegalArgumentException("보관 디렉터리의 권한을 확인하지 못했습니다");
            }
            if (permissions.contains(PosixFilePermission.OTHERS_WRITE)) {
                throw new IllegalArgumentException("보관 디렉터리를 다른 사용자도 쓸 수 있습니다 — 원시 값 덤프를 남이 바꾸거나"
                        + " 지울 수 있습니다");
            }
        }
        return real;
    }

    private static Path realOrNormalized(Path path) {
        try {
            return path.toRealPath();
        } catch (IOException missing) {
            return path;
        }
    }

    private static IllegalArgumentException linked() {
        return new IllegalArgumentException("보관 디렉터리 경로에 심볼릭 링크(또는 실제 경로와 다른 이름)가 있습니다");
    }
}
