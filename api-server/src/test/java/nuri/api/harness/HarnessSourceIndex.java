package nuri.api.harness;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Predicate;
import java.util.stream.Stream;

/**
 * 거버넌스 하네스가 공유하는 저장소 소스 인덱스.
 *
 * <p>하네스마다 동일한 모듈 트리를 다시 순회하고 같은 파일을 반복해서 읽으면 테스트 수가 늘수록
 * 파일 시스템 비용이 선형으로 중복된다. 이 클래스는 한 테스트 JVM 안에서 디렉터리별 파일 목록과
 * UTF-8 텍스트를 한 번만 읽어 불변 스냅샷으로 공유한다. 하네스 실행 중 생산 소스를 수정하는 것은
 * 지원하지 않으며, 파일을 바꾼 뒤에는 새 Gradle 테스트 프로세스에서 다시 실행해야 한다.
 */
final class HarnessSourceIndex {

    private static final int UNLIMITED_DEPTH = Integer.MAX_VALUE;
    private static final Map<ScanKey, List<Path>> FILES = new ConcurrentHashMap<>();
    private static final Map<Path, String> TEXT = new ConcurrentHashMap<>();

    private HarnessSourceIndex() {
    }

    static Path repoRoot() {
        Path candidate = Paths.get("").toAbsolutePath().normalize();
        for (int i = 0; i < 6 && candidate != null; i++) {
            if (Files.isDirectory(candidate.resolve("business-core"))
                    && Files.isDirectory(candidate.resolve("api-server"))) {
                return candidate;
            }
            candidate = candidate.getParent();
        }
        throw new IllegalStateException("저장소 루트를 찾지 못했습니다 (workingDir="
                + Paths.get("").toAbsolutePath() + ")");
    }

    static List<Path> filesUnder(Path root) throws IOException {
        return filesUnder(root, UNLIMITED_DEPTH);
    }

    static List<Path> filesUnder(Path root, int maxDepth) throws IOException {
        Path normalizedRoot = root.toAbsolutePath().normalize();
        if (!Files.isDirectory(normalizedRoot)) {
            throw new IOException("스캔 루트가 디렉터리가 아닙니다: " + normalizedRoot);
        }
        ScanKey key = new ScanKey(normalizedRoot, maxDepth);
        try {
            return FILES.computeIfAbsent(key, ignored -> scanFiles(normalizedRoot, maxDepth));
        } catch (UncheckedIOException e) {
            throw e.getCause();
        }
    }

    static List<Path> filesUnder(Path root, Predicate<Path> predicate) throws IOException {
        return filesUnder(root).stream().filter(predicate).toList();
    }

    static List<Path> javaSources(Path root) throws IOException {
        return filesUnder(root, path -> path.getFileName().toString().endsWith(".java"));
    }

    static List<Path> productionJavaSources(String... modules) throws IOException {
        Path root = repoRoot();
        var result = new java.util.ArrayList<Path>();
        for (String module : modules) {
            Path sourceRoot = root.resolve(module).resolve("src/main/java");
            if (Files.isDirectory(sourceRoot)) {
                result.addAll(javaSources(sourceRoot));
            }
        }
        return List.copyOf(result);
    }

    static Map<Path, String> corpus(List<Path> paths) throws IOException {
        Map<Path, String> result = new LinkedHashMap<>();
        for (Path path : paths) {
            result.put(path, read(path));
        }
        return result;
    }

    static String read(Path path) throws IOException {
        Path normalized = path.toAbsolutePath().normalize();
        try {
            return TEXT.computeIfAbsent(normalized, ignored -> readUtf8(normalized));
        } catch (UncheckedIOException e) {
            throw e.getCause();
        }
    }

    private static List<Path> scanFiles(Path root, int maxDepth) {
        try (Stream<Path> paths = Files.walk(root, maxDepth)) {
            return paths.filter(Files::isRegularFile).toList();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static String readUtf8(Path path) {
        try {
            return Files.readString(path, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /**
     * 주석만 제거하고 문자열 리터럴은 보존한다. 단순 정규식 치환은 {@code "http://…"} 같은 리터럴을
     * 주석으로 오인해 목록 내용을 훼손하므로 상태 기계로 처리한다(오탐 = 거짓 red = 신뢰 붕괴).
     *
     * <p>[2026-09-12] 하네스 동결 목록 메타 게이트에서 이리로 옮겼다 — 6개 린터가 이
     * 헬퍼 하나 때문에 <b>그 메타 게이트를 컴파일 의존</b>으로 붙들고 있었고, 재사용 base 투영에서
     * 메타 게이트가 제거되면 그 6개가 연쇄로 함께 사라졌다(실측: core 프로필에서 하네스 39개 중
     * 11개 소멸, 그중 7개가 이 결합에서 비롯). 판정 유틸은 게이트가 아니므로 중립 인덱스가 소유한다.
     *
     * <p>⚠ 이 파일의 주석에는 게이트 클래스명을 적지 않는다 — 거의 모든 린터가 이 인덱스를
     * import 하므로, 투영 판정이 주석을 참조로 오인하는 순간 <b>하네스 전체</b>가 연쇄로 사라진다
     * (실측: 주석 제거를 되돌리면 core 투영에서 게이트 39/39 소멸).
     */
    static String stripCommentsPreservingStrings(String src) {
        StringBuilder out = new StringBuilder(src.length());
        int i = 0;
        while (i < src.length()) {
            char c = src.charAt(i);
            if (c == '"' || c == '\'') {
                int close = skipLiteral(src, i, c);
                out.append(src, i, close + 1);
                i = close + 1;
                continue;
            }
            if (c == '/' && i + 1 < src.length() && src.charAt(i + 1) == '/') {
                while (i < src.length() && src.charAt(i) != '\n') {
                    i++;
                }
                continue;
            }
            if (c == '/' && i + 1 < src.length() && src.charAt(i + 1) == '*') {
                int close = src.indexOf("*/", i + 2);
                i = (close < 0) ? src.length() : close + 2;
                out.append(' ');
                continue;
            }
            out.append(c);
            i++;
        }
        return out.toString();
    }

    /** 여는 따옴표 위치를 받아 닫는 따옴표 위치를 반환 */
    static int skipLiteral(String code, int open, char quote) {
        for (int i = open + 1; i < code.length(); i++) {
            char c = code.charAt(i);
            if (c == '\\') {
                i++;
                continue;
            }
            if (c == quote) {
                return i;
            }
        }
        return code.length() - 1;
    }

    private record ScanKey(Path root, int maxDepth) {
    }
}
