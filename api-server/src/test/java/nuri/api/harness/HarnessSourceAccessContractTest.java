package nuri.api.harness;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/** 공용 인덱스를 우회하는 반복 파일 순회/읽기가 거버넌스 하네스에 재유입되지 않게 한다. */
@Tag("governance-harness")
class HarnessSourceAccessContractTest {

    private static final Pattern DIRECT_ACCESS = Pattern.compile(
            "Files\\s*\\.\\s*(walk|readString)\\s*\\(");

    /**
     * 직접 파일 접근의 구조화 예외. 공용 인덱스의 실제 I/O 경계만 허용하며, 새 예외에는 경로·연산·사유가
     * 모두 필요하다. 빈번한 스캔을 편의상 예외로 추가해서는 안 된다.
     */
    private static final Map<String, List<Allowance>> ALLOWANCES = Map.of(
            "HarnessSourceIndex.java", List.of(
                    new Allowance("walk", 1, "디렉터리 인덱스의 단일 실제 I/O 경계"),
                    new Allowance("readString", 1, "UTF-8 텍스트 캐시의 단일 실제 I/O 경계")));

    @Test
    @DisplayName("거버넌스 하네스는 공용 source index를 우회해 Files.walk/readString을 호출하지 않는다")
    void directSourceIoIsCentralized() throws IOException {
        Path harnessRoot = HarnessSourceIndex.repoRoot()
                .resolve("api-server/src/test/java/nuri/api/harness");
        List<String> violations = new ArrayList<>();
        Map<String, Integer> usedAllowances = new java.util.HashMap<>();

        for (Path source : HarnessSourceIndex.javaSources(harnessRoot)) {
            String fileName = source.getFileName().toString();
            Matcher matcher = DIRECT_ACCESS.matcher(HarnessSourceIndex.read(source));
            while (matcher.find()) {
                String operation = matcher.group(1);
                Allowance allowance = ALLOWANCES.getOrDefault(fileName, List.of()).stream()
                        .filter(candidate -> candidate.operation().equals(operation))
                        .findFirst()
                        .orElse(null);
                if (allowance == null) {
                    violations.add(fileName + ":" + lineOf(HarnessSourceIndex.read(source), matcher.start())
                            + " — Files." + operation + " 직접 호출; HarnessSourceIndex를 사용하십시오.");
                } else {
                    usedAllowances.merge(fileName + "#" + operation, 1, Integer::sum);
                }
            }
        }

        Map<String, Integer> declaredAllowances = ALLOWANCES.entrySet().stream()
                .flatMap(entry -> entry.getValue().stream()
                        .map(allowance -> Map.entry(
                                entry.getKey() + "#" + allowance.operation(), allowance.expectedOccurrences())))
                .collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
        assertEquals(declaredAllowances, usedAllowances,
                "사용되지 않는 직접 I/O 예외는 삭제하십시오 — stale allowlist는 우회 통로가 됩니다.");
        if (!violations.isEmpty()) {
            fail("공용 source index 우회 " + violations.size() + "건:\n  · "
                    + String.join("\n  · ", violations));
        }
    }

    @Test
    @DisplayName("부정 증명: 직접 Files.walk/readString 호출은 위반으로 인식한다")
    void detectorRejectsDirectAccess() {
        String injected = "Files" + ".walk(root);\nvar text = Files" + ".readString(path);";
        Matcher matcher = DIRECT_ACCESS.matcher(injected);
        List<String> operations = new ArrayList<>();
        while (matcher.find()) {
            operations.add(matcher.group(1));
        }
        assertEquals(List.of("walk", "readString"), operations);
        assertTrue(ALLOWANCES.values().stream().flatMap(List::stream)
                .allMatch(allowance -> !allowance.reason().isBlank()),
                "모든 예외에는 검토 가능한 사유가 있어야 합니다.");
    }

    @Test
    @DisplayName("source index는 동일 JVM에서 파일 목록과 텍스트 스냅샷을 재사용한다")
    void sourceIndexReusesSnapshots() throws IOException {
        Path harnessRoot = HarnessSourceIndex.repoRoot()
                .resolve("api-server/src/test/java/nuri/api/harness");
        List<Path> firstIndex = HarnessSourceIndex.filesUnder(harnessRoot);
        List<Path> secondIndex = HarnessSourceIndex.filesUnder(harnessRoot);
        assertSame(firstIndex, secondIndex, "같은 루트의 디렉터리 인덱스를 다시 만들었습니다.");

        Path thisSource = HarnessSourceIndex.javaSources(harnessRoot).stream()
                .filter(path -> path.getFileName().toString().equals("HarnessSourceAccessContractTest.java"))
                .findFirst()
                .orElseThrow();
        assertSame(HarnessSourceIndex.read(thisSource), HarnessSourceIndex.read(thisSource),
                "같은 파일의 UTF-8 텍스트를 다시 읽었습니다.");
    }

    private static int lineOf(String source, int offset) {
        int line = 1;
        for (int i = 0; i < offset; i++) {
            if (source.charAt(i) == '\n') {
                line++;
            }
        }
        return line;
    }

    private record Allowance(String operation, int expectedOccurrences, String reason) {
    }
}
