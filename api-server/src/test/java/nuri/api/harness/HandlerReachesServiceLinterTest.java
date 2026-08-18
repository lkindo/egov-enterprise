package nuri.api.harness;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🔌 저장 경로 없는 쓰기 핸들러의 "가짜 성공" 회귀 방지 게이트.
 *
 * <p>[근거] 2026-08-01 Wave 0 에서 {@code NetworkMonitoringApiController} 를 고쳤다. 이 컨트롤러는
 * 엔티티·리포지토리·물리 테이블이 <b>전부 없는</b> 도메인인데도 POST/PUT/DELETE 가 아무것도 저장하지 않고
 * {@code 200 + success=true} 를 돌려주고 있었다. 프론트는 "등록되었습니다" 를 띄우고, 관리자는 반영되지
 * 않은 변경을 반영된 것으로 믿는다 — <b>실패보다 나쁜 거짓 성공</b>이다. 같은 커밋에서 GET 의 하드코딩
 * 노드 6건(가짜 헬스 상태)도 제거했다. 쓰기 3본은 {@code 501}
 * ({@code CommonErrorCode.NOT_IMPLEMENTED})로 정직화했다.
 *
 * <p>이 결함은 컴파일·타입·기존 하네스 어디에도 걸리지 않는다. 문법적으로 완전히 정상인 코드이기 때문이다.
 * 그래서 "배선이 없는 컨트롤러가 성공을 참칭하는 형태" 자체를 기계로 못박는다.
 *
 * <p>[규칙] {@code @RestController} 중 <b>저장 경로 흔적이 소스 어디에도 없는</b> 클래스가
 * 쓰기 핸들러({@code @PostMapping}/{@code @PutMapping}/{@code @DeleteMapping}/{@code @PatchMapping})를
 * 가지고 있고, 그 핸들러가 <b>성공 응답</b>({@code ResponseEntity.ok}/{@code ResponseEntity.created}/
 * {@code ApiResponse.success}/{@code HttpStatus.OK}/{@code HttpStatus.CREATED})을 반환하면 위반이다.
 *
 * <p>[오탐 0 우선 설계] '저장 경로 흔적' 은 스펙상 "의존 <i>필드</i> 0개" 보다 <b>넓게</b> 잡는다 —
 * 주석을 제거한 소스 전체에서 {@code Service|Repository|Provider|Manager|Client} 로 끝나는 토큰이
 * <b>단 하나라도</b> 보이면 배선된 것으로 간주해 면제한다. 필드 주입뿐 아니라 생성자 파라미터,
 * {@code List<XxxProvider>} 같은 제네릭 포트, 정적 유틸 호출, {@code @Autowired} 세터까지 전부 면제되므로
 * 판정은 필드 검사보다 항상 관대하다(= 거짓 red 가 나올 여지가 그만큼 없다). 대신 "필드는 있는데
 * 그 핸들러가 서비스를 호출하지 않는" 형태는 <b>일부러</b> 잡지 않는다 — 필드명 규칙이 없어
 * ({@code dashboardItemProviders} 처럼 복수형·축약형) 오탐이 지배하기 때문이다. 부분집합만 확실히 잡는다.
 *
 * <p>[예외 목록 없음] 정당한 서비스-0 컨트롤러(헬스체크 {@code HealthCheckApiController},
 * prod 미등록 디버그 {@code DebugController})는 <b>쓰기 핸들러가 아예 없어</b> 이 규칙에 애초에 걸리지
 * 않는다(실측 확인). 그래서 allow-list 를 두지 않는다 — 없어도 되는 예외 목록은 만들지 않는다(AGENTS.md Evidence guardrails H2).
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 소스 텍스트 스캔. 경로 해석은 IdentityAxisLinterTest 관행을 따른다.
 */
class HandlerReachesServiceLinterTest {

    private static final Logger log = LoggerFactory.getLogger(HandlerReachesServiceLinterTest.class);

    private static final String[] MODULES = {"foundation", "business-core", "business-app", "api-server"};

    /** {@code @RestControllerAdvice} 는 컨트롤러가 아니므로 뒤에 식별자 문자가 오면 제외한다. */
    private static final Pattern REST_CONTROLLER = Pattern.compile("@RestController(?![A-Za-z0-9_$])");

    /**
     * 상태 변경(쓰기) 핸들러 애노테이션.
     * <p>{@code @RequestMapping(method = RequestMethod.POST)} 형태는 <b>의도적으로 제외</b>한다:
     * 저장소 실측 결과 사용처가 0건인데, 클래스 레벨 {@code @RequestMapping} 을 메서드로 오인해
     * 클래스 본문 전체를 핸들러 본문으로 잡는 치명적 오탐 경로만 새로 생기기 때문이다.
     */
    private static final Pattern WRITE_MAPPING = Pattern.compile("@(?:Post|Put|Delete|Patch)Mapping(?![A-Za-z0-9_$])");

    /** 저장/외부 경로 배선의 흔적. 하나라도 있으면 이 게이트의 대상이 아니다(관대 판정). */
    private static final Pattern STORAGE_DEPENDENCY =
            Pattern.compile("\\b\\w*(?:Service|Repository|Provider|Manager|Client)\\b");

    /** 성공 응답 — 저장하지 않고 이것을 돌려주는 것이 곧 '거짓 성공' 이다. */
    private static final Pattern SUCCESS_RESPONSE = Pattern.compile(
            "ResponseEntity\\s*\\.\\s*(?:ok|created)\\s*\\("
                    + "|ApiResponse\\s*\\.\\s*success\\s*\\("
                    + "|HttpStatus\\s*\\.\\s*(?:OK|CREATED)\\b");

    /** 핸들러 본문이 부르는 이름(1단계 private 헬퍼 인라인용). */
    private static final Pattern CALL = Pattern.compile("\\b([A-Za-z_$][\\w$]*)\\s*\\(");

    /** 문자열 리터럴(핸들러 이름 추출 시 잡음 제거용). */
    private static final Pattern STRING_LITERAL = Pattern.compile("\"(?:\\\\.|[^\"\\\\])*\"");

    /*
     * vacuity 하한 — 2026-08-01 실측: @RestController 65개 / 쓰기 핸들러 174건 / 그중 성공응답 반환 171건.
     * 셋 다 약 60% 수준으로 잡는다. 실측값에 붙여 두면 정당한 삭제·리팩터에도 red 가 되어 게이트 신뢰를
     * 깎고, 너무 낮으면 스캔이 붕괴해도 통과한다(= vacuous green). 세 축을 함께 두는 이유는 각각이 다른
     * 파손을 잡기 때문이다: 컨트롤러 수=경로/수집 파손, 쓰기 핸들러 수=WRITE_MAPPING 부식,
     * 성공응답 수=SUCCESS_RESPONSE 부식 또는 본문 추출 붕괴.
     */
    private static final int MIN_REST_CONTROLLERS = 40;
    private static final int MIN_WRITE_HANDLERS = 100;
    private static final int MIN_SUCCESS_HANDLERS = 100;

    @Test
    @DisplayName("🔌 저장 경로 없는 쓰기 핸들러의 200 응답 차단 — 미구현은 501 로 정직화한다")
    void auditWriteHandlersReachStorage() throws IOException {
        List<Path> controllers = collectRestControllers();

        // 게이트 무결성 ①: 컨트롤러 스캔이 조용히 붕괴하면 vacuous 통과가 된다.
        if (controllers.size() < MIN_REST_CONTROLLERS) {
            fail("게이트 무결성 파손: @RestController 스캔 건수(" + controllers.size() + ")가 예상 하한("
                    + MIN_REST_CONTROLLERS + ") 미만 — 경로/스캔 파손 의심 (workingDir="
                    + Paths.get("").toAbsolutePath() + "). 조용한 skip 은 false-green 입니다.");
        }

        int writeHandlers = 0;
        int successHandlers = 0;
        List<String> violations = new ArrayList<>();
        List<String> extractionFailures = new ArrayList<>();

        for (Path file : controllers) {
            String src = stripComments(Files.readString(file, StandardCharsets.UTF_8));
            boolean wired = STORAGE_DEPENDENCY.matcher(src).find();

            Matcher m = WRITE_MAPPING.matcher(src);
            while (m.find()) {
                writeHandlers++;

                int bodyStart = findBodyStart(src, m.end());
                int bodyEnd = (bodyStart < 0) ? -1 : findBodyEnd(src, bodyStart);
                if (bodyStart < 0 || bodyEnd < 0) {
                    // 조용한 skip 금지 — 본문을 못 읽으면 판정 불가이므로 실패로 처리한다.
                    extractionFailures.add(rel(file) + " :: " + m.group() + " (오프셋 " + m.start() + ")");
                    continue;
                }

                String body = src.substring(bodyStart, bodyEnd + 1);
                // 501 정직화를 private 헬퍼(notImplemented())로 구현해 둔 형태를 되돌리는 회귀까지 보려면
                // 핸들러 본문만으로는 부족하다 — 본문이 부르는 같은 클래스의 private 메서드를 1단계 인라인한다.
                String analyzed = body + inlinePrivateCallees(src, body);

                if (SUCCESS_RESPONSE.matcher(analyzed).find()) {
                    successHandlers++;
                    if (!wired) {
                        violations.add(rel(file) + " :: " + handlerName(src, m.end(), bodyStart) + "() " + m.group());
                    }
                }
            }
        }

        // 게이트 무결성 ②③: 쓰기 핸들러/성공응답 탐지 정규식이 썩으면 위반이 있어도 영원히 그린이 된다.
        if (writeHandlers < MIN_WRITE_HANDLERS) {
            fail("게이트 무결성 파손: 쓰기 핸들러 스캔 건수(" + writeHandlers + ")가 예상 하한("
                    + MIN_WRITE_HANDLERS + ") 미만 — WRITE_MAPPING 정규식/스캔 파손 의심.");
        }
        if (successHandlers < MIN_SUCCESS_HANDLERS) {
            fail("게이트 무결성 파손: 성공응답 반환 쓰기 핸들러(" + successHandlers + ")가 예상 하한("
                    + MIN_SUCCESS_HANDLERS + ") 미만 — SUCCESS_RESPONSE 정규식/본문 추출 파손 의심.");
        }
        if (!extractionFailures.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("게이트 무결성 파손: 쓰기 핸들러 본문 추출 실패(조용한 skip 금지)\n");
            extractionFailures.forEach(v -> sb.append("   ").append(v).append("\n"));
            sb.append("   → 중괄호 균형 스캐너가 다루지 못하는 선언 형태입니다. 판정을 건너뛰지 않고 실패로 보고합니다.\n");
            fail(sb.toString());
        }

        if (!violations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🔌 [HANDLER REACHES SERVICE LINTER] 저장 경로 없는 쓰기 핸들러의 가짜 성공 감지!\n");
            sb.append("========================================================================\n");
            sb.append("❌ 경로는 존재하나 저장 경로가 없는 쓰기 핸들러가 200 을 반환합니다.\n");
            sb.append("   501(CommonErrorCode.NOT_IMPLEMENTED) 로 정직화하거나 서비스를 배선하십시오.\n");
            violations.forEach(v -> sb.append("   ").append(v).append("\n"));
            sb.append("\n💡 클래스에 Service/Repository/Provider/Manager/Client 로 끝나는 토큰이 하나도 없다는 것은\n");
            sb.append("   이 컨트롤러가 아무것도 저장·조회하지 않는다는 뜻입니다. 그 상태의 200 + success=true 는\n");
            sb.append("   호출자를 속입니다(2026-08-01 NetworkMonitoringApiController 회귀 방지).\n");
            fail(sb.toString());
        }

        log.info("✅ 저장 경로 없는 쓰기 핸들러의 가짜 성공 없음 — 컨트롤러 {}개 / 쓰기 핸들러 {}건(성공응답 {}건) 검사.",
                controllers.size(), writeHandlers, successHandlers);
    }

    // ---- 수집 ---------------------------------------------------------------

    private static List<Path> collectRestControllers() throws IOException {
        Path root = resolveRepoRoot();
        List<Path> result = new ArrayList<>();
        for (String module : MODULES) {
            Path srcDir = root.resolve(module).resolve("src/main/java");
            if (!Files.exists(srcDir)) {
                continue;
            }
            try (Stream<Path> paths = Files.walk(srcDir)) {
                List<Path> javaFiles = paths.filter(Files::isRegularFile)
                        .filter(p -> p.toString().endsWith(".java"))
                        .toList();
                for (Path p : javaFiles) {
                    String src = stripComments(Files.readString(p, StandardCharsets.UTF_8));
                    if (REST_CONTROLLER.matcher(src).find()) {
                        result.add(p);
                    }
                }
            }
        }
        return result;
    }

    /** cwd 또는 상위에서 settings.gradle 을 가진 저장소 루트를 찾는다(IdentityAxisLinter 경로해석 관행). */
    private static Path resolveRepoRoot() {
        Path cur = Paths.get("").toAbsolutePath();
        for (int i = 0; i < 4 && cur != null; i++) {
            if (Files.exists(cur.resolve("settings.gradle")) || Files.exists(cur.resolve("settings.gradle.kts"))) {
                return cur;
            }
            cur = cur.getParent();
        }
        Path fallback = Paths.get("").toAbsolutePath().getParent();
        if (fallback != null && Files.exists(fallback.resolve("settings.gradle"))) {
            return fallback;
        }
        fail("게이트 무결성 파손: settings.gradle 로 저장소 루트를 찾지 못함(cwd="
                + Paths.get("").toAbsolutePath() + "). 조용한 skip 은 false-green → 실패 처리.");
        return Paths.get(""); // unreachable
    }

    // ---- 본문 추출(중괄호 균형) ----------------------------------------------

    /** 애노테이션 뒤에서 괄호 depth 0 인 첫 {@code '{'} 위치. 본문 없는 선언(depth 0 의 {@code ';'})이면 -1. */
    private static int findBodyStart(String src, int from) {
        int depth = 0;
        for (int i = from; i < src.length(); i++) {
            char c = src.charAt(i);
            if (c == '"' || c == '\'') {
                i = skipLiteral(src, i);
                continue;
            }
            if (c == '(') {
                depth++;
            } else if (c == ')') {
                depth--;
            } else if (c == '{' && depth == 0) {
                return i;
            } else if (c == ';' && depth == 0) {
                return -1;
            }
        }
        return -1;
    }

    /** 여는 중괄호 위치를 받아 짝이 맞는 닫는 중괄호 위치를 반환(실패 시 -1). */
    private static int findBodyEnd(String src, int bodyStart) {
        int depth = 0;
        for (int i = bodyStart; i < src.length(); i++) {
            char c = src.charAt(i);
            if (c == '"' || c == '\'') {
                i = skipLiteral(src, i);
                continue;
            }
            if (c == '{') {
                depth++;
            } else if (c == '}') {
                depth--;
                if (depth == 0) {
                    return i;
                }
            }
        }
        return -1;
    }

    /** 여는 따옴표 위치를 받아 닫는 위치를 반환(텍스트 블록 {@code """} 포함). */
    private static int skipLiteral(String src, int open) {
        char quote = src.charAt(open);
        if (quote == '"' && src.startsWith("\"\"\"", open)) {
            int close = src.indexOf("\"\"\"", open + 3);
            return (close < 0) ? src.length() - 1 : close + 2;
        }
        for (int i = open + 1; i < src.length(); i++) {
            char c = src.charAt(i);
            if (c == '\\') {
                i++;
                continue;
            }
            if (c == quote) {
                return i;
            }
        }
        return src.length() - 1;
    }

    /** 본문이 호출하는 같은 클래스의 {@code private} 메서드 본문을 1단계만 이어붙인다. */
    private static String inlinePrivateCallees(String src, String body) {
        StringBuilder sb = new StringBuilder();
        Set<String> seen = new LinkedHashSet<>();
        Matcher c = CALL.matcher(stripStringLiterals(body));
        while (c.find()) {
            String name = c.group(1);
            if (!seen.add(name)) {
                continue;
            }
            Matcher decl = Pattern.compile("\\bprivate\\s+[^;{}()]*\\b" + Pattern.quote(name) + "\\s*\\(").matcher(src);
            if (!decl.find()) {
                continue;
            }
            int start = findBodyStart(src, decl.start());
            int end = (start < 0) ? -1 : findBodyEnd(src, start);
            if (start >= 0 && end >= 0) {
                sb.append('\n').append(src, start, end + 1);
            }
        }
        return sb.toString();
    }

    /** 실패 메시지 표기용 핸들러 이름(판정에는 관여하지 않는다). */
    private static String handlerName(String src, int from, int bodyStart) {
        String signature = stripStringLiterals(src.substring(from, bodyStart));
        String name = null;
        Matcher m = CALL.matcher(signature);
        while (m.find()) {
            int before = m.start() - 1;
            while (before >= 0 && Character.isWhitespace(signature.charAt(before))) {
                before--;
            }
            if (before >= 0 && signature.charAt(before) == '@') {
                continue; // 애노테이션 이름
            }
            name = m.group(1);
        }
        return (name == null) ? "(이름 미상)" : name;
    }

    private static String stripStringLiterals(String text) {
        return STRING_LITERAL.matcher(text).replaceAll("\"\"");
    }

    /**
     * 주석만 제거하고 문자열 리터럴은 보존한다(상태 기계). 단순 정규식 치환은 {@code "http://…"} 같은
     * 리터럴을 주석으로 오인해 본문을 훼손하며, 그것은 곧 거짓 red 다.
     */
    private static String stripComments(String src) {
        StringBuilder out = new StringBuilder(src.length());
        int i = 0;
        while (i < src.length()) {
            char c = src.charAt(i);
            if (c == '"' || c == '\'') {
                int close = skipLiteral(src, i);
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

    private static String rel(Path p) {
        String s = p.toString().replace('\\', '/');
        int idx = s.indexOf("/src/main/java/");
        return idx >= 0 ? s.substring(s.lastIndexOf('/', idx - 1) + 1) : p.getFileName().toString();
    }
}
