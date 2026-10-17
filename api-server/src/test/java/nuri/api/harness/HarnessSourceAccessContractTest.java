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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/** 공용 인덱스를 우회하는 반복 파일 순회/읽기가 거버넌스 하네스에 재유입되지 않게 한다. */
@Tag("governance-harness")
class HarnessSourceAccessContractTest {

    @Test
    @DisplayName("투영 source 인덱스는 승인된 제거만 허용하고 필수 source 소실과 profile 위조를 red로 검출한다")
    void projectedSourceInventoryFailsClosed(@org.junit.jupiter.api.io.TempDir Path temporary) throws Exception {
        Path valid = projectedFixture(temporary.resolve("valid"), false, false);
        ReusableHarnessProfile profile = ReusableHarnessProfile.load(valid);
        assertTrue(profile.retainsType("sample.Core"));
        assertTrue(profile.retainsType("sample.Core$NestedDto"));
        // 시작 구성과 직접 선택은 같은 투영 기록(retainsType)으로 판정한다(11단계 C4 — pack 분기를 걷었다).
        assertTrue(profile.projected());
        org.junit.jupiter.api.Assertions.assertFalse(profile.retainsType("sample.Optional"));
        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class,
                () -> profile.retainsSource("business-core/src/main/java/sample/Unknown.java"));
        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class,
                () -> ReusableHarnessProfile.load(projectedFixture(temporary.resolve("missing"), true, false)));
        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class,
                () -> ReusableHarnessProfile.load(projectedFixture(temporary.resolve("wrong-profile"), false, true)));
        // 표지(presets.json 의 active)를 지우거나 생성 뒤 구성 선언을 바꾸면 생성물 판정이 실패한다(11단계 C5).
        Path unmarked = projectedFixture(temporary.resolve("unmarked"), false, false);
        java.nio.file.Files.writeString(unmarked.resolve("config/modules/presets.json"), "{\"presets\":[{\"id\":\"core\",\"domains\":[]}]}");
        assertEquals("Reusable harness profile requires the generated composition marker: config/modules/presets.json",
                org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class,
                        () -> ReusableHarnessProfile.load(unmarked)).getMessage());
        Path tampered = projectedFixture(temporary.resolve("tampered"), false, false);
        java.nio.file.Files.writeString(tampered.resolve("config/modules/presets.json"),
                "{\"active\":\"core\",\"presets\":[{\"id\":\"core\",\"domains\":[]}] }");
        assertEquals("Reusable harness profile composition hash mismatch",
                org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class,
                        () -> ReusableHarnessProfile.load(tampered)).getMessage());
        ReusableHarnessProfile custom = ReusableHarnessProfile.load(projectedFixture(temporary.resolve("custom"), false, false, "custom"));
        assertTrue(custom.projected());
        assertTrue(custom.retainsType("sample.Core$NestedDto"));
        org.junit.jupiter.api.Assertions.assertFalse(custom.retainsType("sample.Optional"));
        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class, () -> custom.retainsType("sample.Unregistered"));
    }

    private static Path projectedFixture(Path root, boolean missing, boolean wrongProfile) throws Exception {
        return projectedFixture(root, missing, wrongProfile, "core");
    }

    private static Path projectedFixture(Path root, boolean missing, boolean wrongProfile, String profile) throws Exception {
        var mapper = tools.jackson.databind.json.JsonMapper.builder().configureForJackson2().build();
        java.nio.file.Files.createDirectories(root.resolve("config/governance"));
        for (String module : List.of("foundation", "business-core", "business-app", "api-server")) {
            java.nio.file.Files.createDirectories(root.resolve(module + "/src/main/java"));
        }
        String source = "business-core/src/main/java/sample/Core.java";
        java.nio.file.Files.createDirectories(root.resolve(source).getParent());
        if (!missing) java.nio.file.Files.writeString(root.resolve(source), "package sample; class Core {}");
        // 생성물 표지는 매니페스트 v2 의 활성 구성(presets.json 의 active)이다(11단계 C5).
        java.nio.file.Files.createDirectories(root.resolve("config/modules"));
        String presets = "{\"active\":\"" + profile + "\",\"presets\":[{\"id\":\"" + profile + "\",\"domains\":[]}]}";
        java.nio.file.Files.writeString(root.resolve("config/modules/presets.json"), presets);
        String hash = java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
                .digest(presets.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        mapper.writeValue(root.resolve("reusable-base-lock.json").toFile(), Map.of(
                "profile", wrongProfile ? "collaboration" : profile, "composition", Map.of("resolvedDomains", List.of()),
                "sourceCommit", "fixture", "java", Map.of("excludedDomains", List.of("optional"))));
        mapper.writeValue(root.resolve("config/governance/reusable-harness-profile.json").toFile(), Map.of(
                "schemaVersion", 2, "profile", profile, "domains", List.of(), "sourceCommit", "fixture",
                "excludedDomains", List.of("optional"), "presetsSha256", hash,
                "retained", List.of(Map.of("path", source, "type", "sample.Core")),
                "removed", List.of(Map.of("path", "business-app/src/main/java/sample/Optional.java", "type", "sample.Optional"))));
        return root;
    }

    /**
     * [2026-08-31 확장] {@code readAllLines|readAllBytes|list|lines} 를 금지 목록에 추가했다.
     * 종전에는 walk/readString 만 막아서, 같은 우회(공용 인덱스를 지나치는 직접 I/O·중복 루트 해석)를
     * 다른 API 이름으로 하면 이 계약이 보지 못했다 — 실제로 harness 안에 7건이 그렇게 쌓여 있었다.
     */
    private static final Pattern DIRECT_ACCESS = Pattern.compile(
            "Files\\s*\\.\\s*(walk|readString|readAllLines|readAllBytes|list|lines)\\s*\\(");

    /**
     * 직접 파일 접근의 구조화 예외. 공용 인덱스의 실제 I/O 경계만 허용하며, 새 예외에는 경로·연산·사유가
     * 모두 필요하다. 빈번한 스캔을 편의상 예외로 추가해서는 안 된다. 미사용 예외는 그 자체가 위반이다.
     */
    private static final Map<String, List<Allowance>> ALLOWANCES = Map.of(
            "HarnessSourceIndex.java", List.of(
                    new Allowance("walk", 1, "디렉터리 인덱스의 단일 실제 I/O 경계"),
                    new Allowance("readString", 1, "UTF-8 텍스트 캐시의 단일 실제 I/O 경계")),
            "ConfigSafetyLinterTest.java", List.of(
                    new Allowance("readAllLines", 1, "YAML 행 단위 규칙 검사의 기존 경계 — 신규 유입 금지 동결")),
            "FlywaySchemaOwnershipLinterTest.java", List.of(
                    new Allowance("readAllLines", 1, "CI YAML 행 검사 기존 경계 — 신규 유입 금지 동결"),
                    new Allowance("readAllBytes", 1, "바이트 정확 해시 검사 기존 경계 — 신규 유입 금지 동결")),
            "HibernatePropertyBindingLinterTest.java", List.of(
                    new Allowance("readAllLines", 1, "설정 YAML 행 검사 기존 경계 — 신규 유입 금지 동결")),
            "ControllerScanBaseLinterTest.java", List.of(
                    new Allowance("list", 1, "패키지 루트 census 의 1단 나열 기존 경계 — 신규 유입 금지 동결")),
            "WorkflowManifestLinterTest.java", List.of(
                    new Allowance("list", 1, "워크플로 디렉터리 1단 나열 기존 경계 — 신규 유입 금지 동결")),
            "SecretLiteralLinterTest.java", List.of(
                    new Allowance("readAllBytes", 1, "스크립트 바이트 검사 기존 경계 — 신규 유입 금지 동결")));

    @Test
    @DisplayName("거버넌스 하네스는 공용 source index를 우회해 Files.walk/readString을 호출하지 않는다")
    void directSourceIoIsCentralized() throws IOException {
        Path harnessRoot = HarnessSourceIndex.repoRoot()
                .resolve("api-server/src/test/java/nuri/api/harness");
        List<String> violations = new ArrayList<>();
        Map<String, Integer> usedAllowances = new java.util.HashMap<>();

        for (Path source : HarnessSourceIndex.javaSources(harnessRoot)) {
            String fileName = source.getFileName().toString();
            Matcher matcher = directAccessMatcher(HarnessSourceIndex.read(source));
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
    @DisplayName("부정 증명: 직접 파일 읽기·순회 호출은 주석을 끼워도 위반으로 인식한다")
    void detectorRejectsDirectAccess() {
        String injected = "Files.walk(root);\nvar text = java.nio.file.Files /* source */ . readString(path);\n"
                + "var lines = Files.readAllLines(path);\nvar children = Files.list(dir);\n"
                + "var bytes = Files.readAllBytes(path);\nvar stream = Files.lines(path);";
        Matcher matcher = directAccessMatcher(injected);
        List<String> operations = new ArrayList<>();
        while (matcher.find()) {
            operations.add(matcher.group(1));
        }
        assertEquals(List.of("walk", "readString", "readAllLines", "list", "readAllBytes", "lines"), operations);
        assertTrue(ALLOWANCES.values().stream().flatMap(List::stream)
                .allMatch(allowance -> !allowance.reason().isBlank()),
                "모든 예외에는 검토 가능한 사유가 있어야 합니다.");
    }

    @Test
    @DisplayName("주석·문자열·문자·text block의 예시는 파일 접근이 아니며 뒤의 실제 호출은 그대로 탐지한다")
    void detectorIgnoresNonCodeWithoutHidingRealCalls() {
        String examples = "// Files.walk(root);\n/* Files.readString(path); */\n"
                + "String sample = \"Files.readAllLines(path)\";\n"
                + "String escaped = \"\\\" Files.readAllBytes(path);\";\n"
                + "char quote = '\\\''; char slash = '\\\\';\n"
                + "String block = \"\"\"\nFiles.list(dir);\n\\\"\"\" Files.lines(path);\n\"\"\";\n";
        assertFalse(directAccessMatcher(examples).find());

        String actual = examples + "Files.readString(path);";
        Matcher matcher = directAccessMatcher(actual);
        assertTrue(matcher.find());
        assertEquals("readString", matcher.group(1));
        assertEquals(examples.length(), matcher.start(), "진단 위치는 원문과 같아야 한다");
        assertFalse(matcher.find());
    }

    /** 비코드 영역을 같은 길이의 공백으로 가려 호출만 검사하고 원문의 행·오프셋은 유지한다. */
    private static Matcher directAccessMatcher(String source) {
        StringBuilder code = new StringBuilder(source);
        for (int cursor = 0; cursor < source.length();) {
            int start = cursor;
            if (source.startsWith("//", cursor)) {
                int newline = source.indexOf('\n', cursor + 2);
                cursor = newline < 0 ? source.length() : newline;
            } else if (source.startsWith("/*", cursor)) {
                int close = source.indexOf("*/", cursor + 2);
                cursor = close < 0 ? source.length() : close + 2;
            } else if (source.startsWith("\"\"\"", cursor)) {
                cursor += 3;
                while (cursor < source.length()) {
                    if (source.charAt(cursor) == '\\') {
                        cursor = Math.min(cursor + 2, source.length());
                    } else if (source.startsWith("\"\"\"", cursor)) {
                        cursor += 3;
                        break;
                    } else {
                        cursor++;
                    }
                }
            } else if (source.charAt(cursor) == '"' || source.charAt(cursor) == '\'') {
                cursor = HarnessSourceIndex.skipLiteral(source, cursor, source.charAt(cursor)) + 1;
            } else {
                cursor++;
                continue;
            }
            for (int index = start; index < cursor; index++) {
                if (source.charAt(index) != '\n' && source.charAt(index) != '\r') code.setCharAt(index, ' ');
            }
        }
        return DIRECT_ACCESS.matcher(code);
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

    @Test
    @DisplayName("변경 관측 읽기는 현재 파일을 다시 읽고 공용 스냅샷은 그대로 유지한다")
    void sourceIndexFreshReadsObserveChangesWithoutReplacingSnapshots(
            @org.junit.jupiter.api.io.TempDir Path temporary) throws IOException {
        Path changing = temporary.resolve("changing.txt");
        java.nio.file.Files.writeString(changing, "before");
        String snapshot = HarnessSourceIndex.read(changing);
        assertEquals("before", HarnessSourceIndex.readFresh(changing));

        java.nio.file.Files.writeString(changing, "after");
        assertEquals("after", HarnessSourceIndex.readFresh(changing));
        assertSame(snapshot, HarnessSourceIndex.read(changing));

        java.nio.file.Files.writeString(changing, "latest");
        assertEquals("latest", HarnessSourceIndex.readFresh(changing));
        assertSame(snapshot, HarnessSourceIndex.read(changing));

        java.nio.file.Files.delete(changing);
        org.junit.jupiter.api.Assertions.assertThrows(IOException.class,
                () -> HarnessSourceIndex.readFresh(changing));
        assertSame(snapshot, HarnessSourceIndex.read(changing));
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
