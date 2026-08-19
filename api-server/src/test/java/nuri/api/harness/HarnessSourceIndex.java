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

    private record ScanKey(Path root, int maxDepth) {
    }
}
