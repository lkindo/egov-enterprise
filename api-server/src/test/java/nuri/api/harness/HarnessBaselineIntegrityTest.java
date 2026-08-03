package nuri.api.harness;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🧊 하네스 동결 목록 무결성 메타 린터 — "게이트를 조용히 무력화하는 행위" 자체를 차단한다.
 *
 * <p>[근거] 2026-07-26 Phase 2 인수 감사에서 <b>같은 은폐 패턴이 두 번</b> 관측됐다.
 * ① {@code PkGenerationStandardLinterTest.GRANDFATHERED} 를 {@code Collections.emptySet()} 으로 비워
 * 69개 엔티티의 PK 전략 일괄 변경을 통과시킴, ② {@code ApiDocsPathCoverageLinterTest} 에 {@code EXCLUDED_PATHS}
 * 7건을 <b>신설</b>해 진짜 계약 드리프트 신호를 소거함. 두 경우 모두 <b>게이트는 그린이었다.</b>
 *
 * <p>개별 린터에 "수량 하한" 가드를 다는 대응은 (a) 항목 교체(swap)로 우회되고, (b) 정당한 부채 상환까지
 * 막으며, (c) 잡힌 그 린터 하나만 지킨다. 그래서 이 메타 린터는 <b>하네스 전체</b>의 동결/예외 목록을
 * 원본 소스에서 추출해 매니페스트(해시)와 대조한다. 탐지 대상은 3가지다.
 * <ul>
 *   <li><b>변경</b> — 목록 항목의 추가·삭제·교체(내용 해시 불일치)</li>
 *   <li><b>신설</b> — 매니페스트에 없는 새 예외/화이트리스트 목록의 등장(②의 형태)</li>
 *   <li><b>소멸</b> — 매니페스트에 있는 목록·게이트 클래스의 삭제·개명(게이트 자체 제거)</li>
 * </ul>
 *
 * <p><b>이 린터는 "고칠 수 없게" 만드는 장치가 아니다.</b> 저장소를 편집할 수 있는 주체는 매니페스트도
 * 편집할 수 있다. 목적은 <b>은폐를 불가능하게가 아니라 조용할 수 없게</b> 만드는 것이다 — 목록을 손대면
 * 서로 다른 디렉터리의 두 파일(린터 소스 + 매니페스트)이 함께 바뀌고, diff 에 의도가 드러난다.
 * 매니페스트 갱신 시에는 사유를 커밋 메시지 또는 {@code .gemini/tasks/} 기록에 반드시 남긴다.
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 테스트(소스 텍스트 파싱).
 */
class HarnessBaselineIntegrityTest {

    private static final Logger log = LoggerFactory.getLogger(HarnessBaselineIntegrityTest.class);

    /**
     * 스캔 루트 — 게이트는 {@code nuri.api.harness} 밖에도 있다(모듈별 ArchUnit·RBAC 매트릭스·쿼리수 가드레일).
     * 한 디렉터리만 지키면 "매니페스트 밖으로 게이트를 옮기는" 우회가 성립하므로 4개 모듈 테스트 소스를 모두 본다.
     */
    private static final List<String> SCAN_ROOTS = List.of(
            "api-server/src/test/java",
            "business-app/src/test/java",
            "business-core/src/test/java",
            "foundation/src/test/java");

    /** 게이트 성격의 테스트 파일 — {@code harness} 디렉터리 소속이거나 이름이 게이트 패턴인 것 */
    private static final Pattern GATE_FILE = Pattern.compile(
            "(?:LinterTest|ArchTest|MatrixTest|GuardrailIntegrationTest|ValidationIntegrationTest|Archunit\\w*)\\.java$");

    private static final String MANIFEST_PATH = "api-server/src/test/resources/harness/baseline-manifest.properties";
    private static final String ACTUAL_OUT = "build/harness/baseline-manifest.actual.properties";

    /** 게이트 클래스 소멸(삭제·개명) 감지용 키 */
    private static final String CLASSES_KEY = "__harness.classes";

    /**
     * 훅 파일 자체의 무결성 축. [W0-P1-7 보완 — 2026-08-03]
     *
     * <p>Wave 0 의 P1-7 은 두 가지를 요구했다 — ① pre-push fast-pass 를 allowlist→denylist 로 반전
     * ② <b>훅 자체의 sha256 을 매니페스트에 등재</b>. ①만 이행됐다.
     *
     * <p>②가 빠진 것이 치명적인 이유는 {@code .githooks/pre-push} 가 스스로 적어 둔 전제 때문이다 —
     * "CI 에도 있으나 과금차단 상태라 로컬 pre-push 가 사실상 유일 관문". git 은 <b>워킹트리의 훅 파일을
     * 그대로 실행</b>하므로, 훅을 무력화하는 편집(조기 return 무조건화, fast-pass 정규식 되살리기,
     * SKIP_HARNESS 분기 반전)은 <b>그 편집된 훅이 자기 자신의 푸시를 승인</b>한다.
     * 게이트를 끄는 편집이 게이트를 통과하는 구조다.
     *
     * <p>훅 내용을 매니페스트에 동결하면 그 편집이 <b>하네스 테스트에서</b> 잡힌다 —
     * 훅이 아니라 JVM 테스트가 판정하므로 훅을 고쳐도 우회되지 않는다.
     * 정당한 훅 변경은 매니페스트를 함께 갱신해야 하고, 그러면 두 파일이 같이 바뀌어 diff 에 의도가 드러난다.
     */
    private static final List<String> GATE_HOOKS = List.of(".githooks/pre-push", ".githooks/pre-commit");

    /** 훅 해시 키 접두 — {@code __hooks.<파일명>} */
    private static final String HOOKS_KEY_PREFIX = "__hooks.";

    /**
     * 스캔 대상: 게이트 판정에 관여하는 {@code static final} 상수 선언.
     * <p>목록(Set/List/Collection/Map)뿐 아니라 <b>경로·스캔 베이스 문자열과 정규식(Pattern)</b>도 포함한다 —
     * 스캔 루트를 빈 경로로 바꾸거나 탐지 정규식을 무력하게 고치는 것도 동일한 은폐이기 때문이다.
     * <p>타입은 패키지 수식(예: {@code java.util.Set<String>})을 허용한다. 종전 축약형만 매칭하던 정규식은
     * 완전수식 선언으로 우회됐다(2026-07-26 자체 침투 검증에서 발견).
     */
    private static final Pattern CONST_DECL = Pattern.compile(
            "static\\s+final\\s+(?:[A-Za-z_$][\\w$]*\\s*\\.\\s*)*"
                    + "(?:String|Set|List|Collection|Map|Pattern)\\s*(?:<[^=;]*>)?\\s*(?:\\[\\s*\\])?"
                    + "\\s+([A-Za-z_$][\\w$]*)\\s*=");

    private static final Pattern STRING_LITERAL = Pattern.compile("\"(?:\\\\.|[^\"\\\\])*\"");

    @Test
    @DisplayName("🧊 하네스 동결/예외 목록 무결성 — 게이트 무단 완화·신설 예외·게이트 삭제 차단")
    void auditHarnessBaselineIntegrity() throws IOException {
        Path manifestPath = resolve(MANIFEST_PATH);

        Map<String, Path> gateSources = new TreeMap<>();
        for (String root : SCAN_ROOTS) {
            Path dir = resolve(root);
            if (!Files.isDirectory(dir)) {
                fail("게이트 무결성 파손: 스캔 루트를 찾을 수 없습니다 — " + root
                        + " (workingDir=" + Paths.get("").toAbsolutePath() + "). 조용한 skip 은 false-green 입니다.");
            }
            String module = root.split("/")[0];
            try (Stream<Path> paths = Files.walk(dir)) {
                paths.filter(Files::isRegularFile)
                        .filter(p -> p.toString().endsWith(".java"))
                        .filter(p -> isGateSource(p))
                        .forEach(p -> gateSources.put(
                                module + "/" + p.getFileName().toString().replace(".java", ""), p));
            }
        }

        // 게이트 무결성(false-green 방지): 스캔이 조용히 붕괴하면 vacuous 통과가 되므로 차단
        if (gateSources.size() < 12) {
            fail("게이트 무결성 파손: 게이트 소스 스캔 건수(" + gateSources.size() + ")가 예상 하한(12) 미만 — "
                    + "경로/클래스 삭제 의심 (workingDir=" + Paths.get("").toAbsolutePath() + ").");
        }

        Map<String, String> actual = new TreeMap<>();
        Set<String> actualClasses = new TreeSet<>();
        for (Map.Entry<String, Path> entry : gateSources.entrySet()) {
            String className = entry.getKey();
            Path src = entry.getValue();
            actualClasses.add(className);
            String code = stripCommentsPreservingStrings(Files.readString(src, StandardCharsets.UTF_8));
            for (Map.Entry<String, String> e : extractConstants(code).entrySet()) {
                actual.put(className + "." + e.getKey(), e.getValue());
            }
        }
        actual.put(CLASSES_KEY, String.join(",", actualClasses));

        // [W0-P1-7 보완] 훅 파일 자체를 동결한다. GATE_HOOKS javadoc 참조.
        //   줄바꿈만 정규화하고(CRLF↔LF) 내용은 그대로 해시한다 — 주석 한 줄이 바뀌어도 드러나는 것이 목적이다.
        //   훅이 사라진 것도 위반이다: 파일을 지우면 git 이 조용히 훅 없이 동작하므로, 부재를 통과로 넘기면
        //   '삭제' 가 가장 값싼 우회가 된다.
        for (String hook : GATE_HOOKS) {
            Path hookPath = resolve(hook);
            String hookKey = HOOKS_KEY_PREFIX + hookPath.getFileName();
            if (!Files.isRegularFile(hookPath)) {
                actual.put(hookKey, "MISSING");
                continue;
            }
            String content = Files.readString(hookPath, StandardCharsets.UTF_8).replace("\r\n", "\n");
            actual.put(hookKey, sha256Short(content));
        }

        Properties expected = new Properties();
        if (Files.exists(manifestPath)) {
            try (var reader = Files.newBufferedReader(manifestPath, StandardCharsets.UTF_8)) {
                expected.load(reader);
            }
        }
        writeActual(actual); // 정당한 갱신 시 그대로 복사할 수 있도록 항상 산출

        List<String> violations = new ArrayList<>();

        if (expected.isEmpty()) {
            violations.add("매니페스트가 없거나 비어 있습니다: " + manifestPath.toAbsolutePath());
        }

        // ① 변경 / ② 신설
        for (Map.Entry<String, String> e : actual.entrySet()) {
            if (CLASSES_KEY.equals(e.getKey())) {
                continue;
            }
            String exp = expected.getProperty(e.getKey());
            boolean isHook = e.getKey().startsWith(HOOKS_KEY_PREFIX);
            if (exp == null) {
                violations.add(isHook
                        ? "신설 감지 — 매니페스트에 없는 훅: " + e.getKey() + " (" + e.getValue() + ")"
                        : "신설 감지 — 매니페스트에 없는 동결/예외 목록: " + e.getKey()
                                + " (" + e.getValue() + "). 예외 목록의 '신설' 은 신호 은폐의 대표 수법입니다.");
            } else if (!exp.trim().equals(e.getValue())) {
                if (isHook) {
                    violations.add("훅 변경 감지 — " + e.getKey() + ": 매니페스트=" + exp.trim()
                            + " ↔ 실제=" + e.getValue()
                            + ("MISSING".equals(e.getValue())
                                    ? " (훅 파일이 사라졌습니다 — git 은 훅 없이 조용히 동작하므로 '삭제' 는 가장 값싼 우회입니다)"
                                    : " (git 은 워킹트리의 훅을 그대로 실행하므로, 훅을 무력화하는 편집은 그 편집된 훅이"
                                            + " 자기 자신의 푸시를 승인합니다. 정당한 변경이면 매니페스트를 함께 갱신하십시오.)"));
                } else {
                    violations.add("변경 감지 — " + e.getKey() + ": 매니페스트=" + exp.trim() + " ↔ 실제=" + e.getValue());
                }
            }
        }

        // ③ 소멸 (목록)
        for (String key : expected.stringPropertyNames()) {
            if (CLASSES_KEY.equals(key) || actual.containsKey(key)) {
                continue;
            }
            violations.add("소멸 감지 — 매니페스트에 등재된 목록이 사라졌습니다: " + key
                    + " (린터 상수 삭제·개명 = 게이트 완화 가능성)");
        }

        // ③ 소멸 (게이트 클래스)
        String expectedClasses = expected.getProperty(CLASSES_KEY);
        if (expectedClasses != null) {
            for (String cls : expectedClasses.split(",")) {
                String name = cls.trim();
                if (!name.isEmpty() && !actualClasses.contains(name)) {
                    violations.add("소멸 감지 — 하네스 게이트 클래스가 사라졌습니다: " + name);
                }
            }
            Set<String> added = new TreeSet<>(actualClasses);
            Arrays.stream(expectedClasses.split(",")).map(s -> s.trim()).forEach(added::remove);
            if (!added.isEmpty()) {
                log.info("[BaselineIntegrity] 신규 하네스 클래스 감지(추가는 허용, 매니페스트 갱신 권장): {}", added);
            }
        }

        if (!violations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🧊 [HARNESS BASELINE INTEGRITY] 동결/예외 목록 무결성 위반이 차단되었습니다!\n");
            sb.append("========================================================================\n");
            for (String v : violations) {
                sb.append("❌ ").append(v).append("\n");
            }
            sb.append("\n💡 먼저 자문하십시오: 지금 목록을 손대는 이유가 '위반을 고치는 것' 입니까,\n");
            sb.append("   아니면 '빨간 신호를 없애는 것' 입니까? 후자라면 그것은 수정이 아니라 은폐입니다.\n");
            sb.append("   (GEMINI.md §0.7-H2 / 오케스트레이션 프로토콜 §4.1 '미검증을 완료로 선언 금지')\n");
            sb.append("\n💡 변경이 정당하다면:\n");
            sb.append("   1) 사유를 커밋 메시지 또는 .gemini/tasks/ 기록에 남기고\n");
            sb.append("   2) 아래 산출 파일을 매니페스트로 복사하십시오.\n");
            sb.append("      cp ").append(Paths.get(ACTUAL_OUT).toAbsolutePath()).append(" \\\n");
            sb.append("         ").append(resolve(MANIFEST_PATH).toAbsolutePath()).append("\n");
            fail(sb.toString());
        }

        log.info("✅ 하네스 동결/예외 목록 무결성 OK — 클래스 {}개, 동결 목록 {}건.",
                actualClasses.size(), actual.size() - 1);
    }

    /** {@code harness} 디렉터리 소속이거나 이름이 게이트 패턴인 테스트 소스 */
    private static boolean isGateSource(Path p) {
        String normalized = p.toString().replace('\\', '/');
        return normalized.contains("/harness/") || GATE_FILE.matcher(normalized).find();
    }

    /** {@code CONST -> "<문자열리터럴 수>:<정규화 RHS 의 sha256 앞 12자리>"} */
    private static Map<String, String> extractConstants(String code) {
        Map<String, String> result = new LinkedHashMap<>();
        Matcher m = CONST_DECL.matcher(code);
        while (m.find()) {
            int end = findStatementEnd(code, m.end());
            if (end < 0) {
                continue;
            }
            String rhs = code.substring(m.end(), end);
            String normalized = rhs.replaceAll("\\s+", " ").trim();
            long literals = STRING_LITERAL.matcher(rhs).results().count();
            result.put(m.group(1), literals + ":" + sha256Short(normalized));
        }
        return result;
    }

    /** 문자열 리터럴 밖·괄호 depth 0 인 첫 {@code ';'} 위치 (없으면 -1) */
    private static int findStatementEnd(String code, int from) {
        int depth = 0;
        for (int i = from; i < code.length(); i++) {
            char c = code.charAt(i);
            if (c == '"') {
                i = skipLiteral(code, i, '"');
                continue;
            }
            if (c == '\'') {
                i = skipLiteral(code, i, '\'');
                continue;
            }
            if (c == '(' || c == '{' || c == '[') {
                depth++;
            } else if (c == ')' || c == '}' || c == ']') {
                depth--;
            } else if (c == ';' && depth <= 0) {
                return i;
            }
        }
        return -1;
    }

    /** 여는 따옴표 위치를 받아 닫는 따옴표 위치를 반환 */
    private static int skipLiteral(String code, int open, char quote) {
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

    /**
     * 주석만 제거하고 문자열 리터럴은 보존한다. 단순 정규식 치환은 {@code "http://…"} 같은 리터럴을
     * 주석으로 오인해 목록 내용을 훼손하므로 상태 기계로 처리한다(오탐 = 거짓 red = 신뢰 붕괴).
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

    private static String sha256Short(String text) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(text.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (int i = 0; i < 6; i++) {
                hex.append(String.format("%02x", digest[i]));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    private static void writeActual(Map<String, String> actual) {
        try {
            Path out = Paths.get(ACTUAL_OUT);
            Files.createDirectories(out.getParent());
            try (BufferedWriter w = Files.newBufferedWriter(out, StandardCharsets.UTF_8)) {
                w.write("# 자동 산출 — HarnessBaselineIntegrityTest 실행 결과(실제 소스 기준).");
                w.newLine();
                w.write("# 정당한 변경일 때만 baseline-manifest.properties 로 복사하고 사유를 기록할 것.");
                w.newLine();
                for (Map.Entry<String, String> e : actual.entrySet()) {
                    w.write(e.getKey() + "=" + e.getValue());
                    w.newLine();
                }
            }
        } catch (IOException e) {
            log.warn("[BaselineIntegrity] 실제값 산출 파일 기록 실패: {}", e.getMessage());
        }
    }

    /** 저장소 루트 실행/모듈 디렉터리 실행 양쪽 지원 (존재 여부 판정은 호출부 책임 — 조용한 skip 금지) */
    private static Path resolve(String repoRelative) {
        Path fromRoot = Paths.get(repoRelative);
        if (Files.exists(fromRoot)) {
            return fromRoot;
        }
        Path fromModule = Paths.get("..", repoRelative);
        return Files.exists(fromModule) ? fromModule : fromRoot;
    }
}
