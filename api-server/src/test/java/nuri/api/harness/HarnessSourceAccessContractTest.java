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
                    new Allowance("readString", 1, "UTF-8 텍스트 캐시의 단일 실제 I/O 경계"),
                    new Allowance("readAllBytes", 1, "일회성 프로세스 출력 바이트의 단일 실제 I/O 경계")),
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
        return DIRECT_ACCESS.matcher(HarnessSourceIndex.maskNonCode(source));
    }

    /**
     * {@code git show <rev>:<path>} 를 {@code --} 없이 부르면 git 은 그 인자가 파일 이름인지 보려고
     * {@code <작업 디렉터리>/<rev>:<path>} 를 lstat 한다. Windows 에서 그 경로가 260자를 넘으면
     * {@code Filename too long} 으로 죽어, 경로가 긴 worktree 에서만 하네스가 거짓 red 가 됐다(2026-10-17 실측:
     * 작업 트리 경로 180자에서 마이그레이션 이력 검사 실패). 블롭은 {@code cat-file} 로 읽거나 {@code --} 를 붙인다.
     *
     * <p>리터럴 {@code "show"} 바로 뒤 같은 인자 목록에 {@code :} 를 담은 문자열 리터럴이 있고 {@code "--"}
     * 리터럴이 없으면 위반이다. 변수에 미리 조립한 revision 은 보지 않는다(놓치는 방향 — 거짓 red 는 없다).
     */
    @Test
    @DisplayName("거버넌스 하네스는 git show 에 rev:path 를 -- 없이 넘기지 않는다")
    void gitShowRevisionPathRequiresSeparator() throws IOException {
        Path harnessRoot = HarnessSourceIndex.repoRoot()
                .resolve("api-server/src/test/java/nuri/api/harness");
        List<String> violations = new ArrayList<>();
        for (Path source : HarnessSourceIndex.javaSources(harnessRoot)) {
            String text = HarnessSourceIndex.read(source);
            for (int offset : showWithoutSeparator(text)) {
                violations.add(source.getFileName() + ":" + lineOf(text, offset)
                        + " — git show 에 rev:path 를 -- 없이 넘깁니다; cat-file 로 읽거나 -- 를 붙이십시오.");
            }
        }
        if (!violations.isEmpty()) {
            fail("긴 경로에서 깨지는 git show 호출 " + violations.size() + "건:\n  · "
                    + String.join("\n  · ", violations));
        }
    }

    @Test
    @DisplayName("부정 증명: rev:path 를 받는 git show 는 -- 가 없을 때만, 주석·문자열 밖에서만 위반이다")
    void showDetectorFlagsOnlyUnseparatedRevisionPaths() {
        String violating = "historyGit(root, \"show\", baseline + \":\" + relative);\n"
                + "var command = List.of(\"git\", \"show\", \"HEAD:\" + path);\n"
                + "String[] array = { \"git\", \"show\", rev + \":\" + path };\n";
        assertEquals(3, showWithoutSeparator(violating).size(), "세 형태를 모두 위반으로 본다");
        assertEquals(violating.indexOf("\"show\""), showWithoutSeparator(violating).get(0),
                "진단 위치는 원문의 show 리터럴이다");

        String allowed = "git(root, \"show\", baseline + \":\" + relative, \"--\");\n"
                + "git(root, \"show\", \"-s\", \"--format=%T\", \"HEAD\");\n"
                + "git(root, \"show\", \"-s\", \"--pretty=format:%H\", \"HEAD\");\n"
                + "git(root, \"cat-file\", \"blob\", rev + \":\" + path);\n"
                + "docker(List.of(\"context\", \"show\"));\n"
                + "git(root, \"show\", nested(\"--\"), rev + \":\" + path, \"--\");\n"
                + "// historyGit(root, \"show\", baseline + \":\" + relative);\n"
                + "String example = \"historyGit(root, \\\"show\\\", baseline + \\\":\\\" + relative)\";\n"
                + "String block = \"\"\"\n  git(\"show\", rev + \":\" + path)\n  \"\"\";\n";
        assertEquals(List.of(), showWithoutSeparator(allowed));

        String nestedSeparatorOnly = "git(root, \"show\", label(\"--\"), rev + \":\" + path);\n";
        assertEquals(1, showWithoutSeparator(nestedSeparatorOnly).size(),
                "다른 호출 안의 \"--\" 는 이 인자 목록의 구분자가 아니다");
    }

    /** {@code "show"} 리터럴 위치 가운데, 같은 인자 목록에 rev:path 리터럴이 있고 {@code "--"} 가 없는 것. */
    private static List<Integer> showWithoutSeparator(String source) {
        String code = HarnessSourceIndex.maskNonCode(source);
        List<int[]> literals = new ArrayList<>();
        HarnessSourceIndex.forEachNonCode(source, (kind, start, end) -> {
            if (kind == HarnessSourceIndex.NonCode.LITERAL) literals.add(new int[] {start, end});
        });
        List<Integer> found = new ArrayList<>();
        for (int[] show : literals) {
            if (!source.startsWith("\"show\"", show[0]) || show[1] != show[0] + "\"show\"".length()) continue;
            int cursor = show[1];
            while (cursor < code.length() && Character.isWhitespace(code.charAt(cursor))) cursor++;
            if (cursor >= code.length() || code.charAt(cursor) != ',') continue;
            int listEnd = enclosingListEnd(code, cursor);
            boolean revisionPath = false;
            boolean separator = false;
            for (int[] literal : literals) {
                if (literal[0] <= cursor || literal[1] > listEnd) continue;
                if (nestingDepth(code, cursor, literal[0]) != 0) continue;
                String body = source.substring(literal[0] + 1, Math.max(literal[0] + 1, literal[1] - 1));
                // --pretty=format:%H 같은 옵션 값의 콜론은 revision 이 아니다.
                revisionPath |= body.indexOf(':') >= 0 && !body.startsWith("-");
                separator |= body.equals("--");
            }
            if (revisionPath && !separator) found.add(show[0]);
        }
        return found;
    }

    /** {@code from} 이 속한 인자 목록을 닫는 괄호의 위치(없으면 원문 끝). 가린 코드에서 센다. */
    private static int enclosingListEnd(String code, int from) {
        int depth = 0;
        for (int index = from; index < code.length(); index++) {
            char current = code.charAt(index);
            if (current == '(' || current == '[' || current == '{') {
                depth++;
            } else if (current == ')' || current == ']' || current == '}') {
                if (depth == 0) return index;
                depth--;
            }
        }
        return code.length();
    }

    /** {@code from} 부터 {@code to} 앞까지 열린 괄호 수 — 0 이면 같은 인자 목록의 바로 아래 단계다. */
    private static int nestingDepth(String code, int from, int to) {
        int depth = 0;
        for (int index = from; index < to; index++) {
            char current = code.charAt(index);
            if (current == '(' || current == '[' || current == '{') depth++;
            else if (current == ')' || current == ']' || current == '}') depth--;
        }
        return depth;
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
