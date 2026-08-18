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
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🔐 공개 회원가입 계약(POST /api/v1/users/signup) 동결 게이트 — 특권 상승 경로 재발 방지.
 *
 * <p>[근거] 2026-08-01 Wave 0 에서 {@code UserSignupRequest.role} 을 삭제했다. 이 DTO 는
 * {@code @PublicApi} 가 붙은 <b>미인증 공개 엔드포인트</b>의 요청 본문이었고, 요청 본문에 권한을 받는 순간
 * 누구든 <b>요청 1건으로 ROLE_ADMIN 을 자가 발급</b>할 수 있었다. 필드를 지우는 것만으로는 재발을 막지
 * 못한다 — 필드는 "편의상" 다시 추가되고, 삭제된 이유는 diff 에 남지 않기 때문이다(AGENTS.md Evidence guardrails H5:
 * 실행 경로 없는 규칙은 규칙을 어긴 주체를 막지 못한다). 그래서 계약을 기계로 동결한다.
 *
 * <p>[규칙] 두 축을 모두 본다.
 * <ol>
 *   <li><b>요청 필드 집합 동결</b> — {@code UserSignupRequest} 의 인스턴스 필드 이름 집합이
 *       {@link #ALLOWED_SIGNUP_FIELDS} 와 정확히 일치해야 한다. 임의의 신규 필드는 위반이며,
 *       그중 <b>권한/역할성 이름</b>({@link #PRIVILEGE_FIELD_NAME})은 특권 상승으로 별도 경고한다.</li>
 *   <li><b>권한 상수 고정</b> — {@code UserService.signup()} <u>본문 안에서</u> 권한이 요청값으로부터
 *       오면 안 된다. {@code Role.valueOf(} · {@code <요청파라미터>.getRole…(} 가 나타나거나,
 *       엔티티 빌더의 {@code .role(...)} 인자가 {@link #REQUIRED_SIGNUP_ROLE} 이 아니면 위반이다.
 *       같은 파일의 {@code registerUser()} 는 {@code SecurityUtil.assertAdmin()} 이 걸린 관리자 경로라
 *       {@code Role.valueOf} 사용이 정당하므로, <b>메서드 본문을 중괄호 균형으로 잘라내어</b> 판정한다.</li>
 * </ol>
 *
 * <p>[게이트 무결성] 대상 파일 부재·클래스 본문 추출 실패·메서드 본문 추출 실패·필드 0건·권한 고정 지점
 * 소실은 모두 <b>조용한 통과 대신 실패</b>로 처리한다. 스캔이 붕괴한 그린은 안전의 증거가 아니다.
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 소스 텍스트 스캔. 경로 해석은 IdentityAxisLinterTest 관행을 따른다.
 */
class SignupContractLinterTest {

    private static final Logger log = LoggerFactory.getLogger(SignupContractLinterTest.class);

    /** 미인증 공개 회원가입 요청 DTO(저장소 루트 기준 상대 경로) */
    private static final String DTO_PATH =
            "business-core/src/main/java/nuri/business/service/user/dto/UserSignupRequest.java";

    private static final String DTO_CLASS = "UserSignupRequest";

    /** 회원가입 서비스 — signup(공개) 과 registerUser(관리자) 가 공존하므로 메서드 단위로 판정한다 */
    private static final String SERVICE_PATH =
            "business-core/src/main/java/nuri/business/service/user/UserService.java";

    private static final String SIGNUP_METHOD = "signup";

    /**
     * [동결 베이스라인] 공개 회원가입 요청이 받을 수 있는 필드 전부.
     * <b>확장 금지가 원칙이다</b> — 추가하려면 "미인증 요청자가 이 값을 정해도 되는가"를 먼저 답하고,
     * 사유를 커밋 메시지 또는 {@code .gemini/tasks/} 기록에 남긴 뒤 매니페스트와 함께 갱신한다.
     */
    private static final Set<String> ALLOWED_SIGNUP_FIELDS = new TreeSet<>(Arrays.asList(
            "userId",      // 로그인 ID
            "pswd",        // 비밀번호(서버에서 인코딩)
            "userNm",      // 성명
            "pswdHint",    // 비밀번호 힌트
            "pswdCrans")); // 비밀번호 정답

    /** 권한/역할성 필드 이름 — 신규 필드가 이 패턴이면 단순 계약 확장이 아니라 특권 상승이다 */
    private static final Pattern PRIVILEGE_FIELD_NAME = Pattern.compile(
            "(?i)(role|authorit|authrt|grant|privileg|scope|perm|admin|권한)");

    /** signup() 본문에서 금지 — 문자열로 들어온 권한명을 열거형으로 되살리는 경로 */
    private static final Pattern ROLE_VALUE_OF = Pattern.compile("\\bRole\\s*\\.\\s*valueOf\\s*\\(");

    /**
     * signup() 본문에서 금지 — <b>요청 파라미터</b>에서 권한을 꺼내는 접근자.
     * 수신자를 요청 파라미터로 한정한다({@code user.getRole()} 처럼 서버가 만든 엔티티에서 읽는 것은 정상).
     */
    private static final String REQUEST_PRIVILEGE_GETTER_FORMAT =
            "\\b%s\\s*\\.\\s*get\\w*(?:Role|Authorit|Authrt|Grant|Privileg|Scope|Admin)\\w*\\s*\\(";

    /** 엔티티 빌더의 권한 지정 지점 — 인자가 상수인지 검사하기 위해 위치를 찾는다 */
    private static final Pattern ROLE_BUILDER_CALL = Pattern.compile("\\.\\s*role\\s*\\(");

    /** 공개 회원가입이 부여할 수 있는 유일한 권한(공백 제거 후 문자열 일치로 비교) */
    private static final String REQUIRED_SIGNUP_ROLE = "Role.USER";

    /** 초기화식을 잘라낸 필드 선언 1건: {@code [수식어]* <타입> <이름>[, <이름>]*} */
    private static final Pattern FIELD_DECL = Pattern.compile(
            "^(?:(?:public|protected|private|final|transient|volatile)\\s+)*"
                    + "([A-Za-z_$][\\w$.]*(?:\\s*<.*>)?(?:\\s*\\[\\s*\\])*)"
                    + "\\s+([A-Za-z_$][\\w$]*(?:\\s*,\\s*[A-Za-z_$][\\w$]*)*)$");

    /** 스캔 붕괴 방지 하한 — 실측 5필드(2026-08-01). 파서가 죽으면 "위반 0" 이 되므로 하한을 건다. */
    private static final int MIN_SIGNUP_FIELDS = 3;

    /** 스캔 붕괴 방지 하한 — 실측 signup() 본문 900자 이상(주석 제거 후). */
    private static final int MIN_SIGNUP_BODY_CHARS = 200;

    /** 메서드 본문 + 그 안에서 요청 DTO 를 담는 파라미터 이름 */
    private record SignupSlice(String body, String requestParam) {
    }

    @Test
    @DisplayName("🔐 공개 회원가입 계약 동결 — 요청 DTO 권한 필드 금지 + signup() 권한 상수 고정")
    void auditSignupContract() throws IOException {
        Path root = resolveRepoRoot();
        Path dtoFile = root.resolve(DTO_PATH);
        Path serviceFile = root.resolve(SERVICE_PATH);

        if (!Files.isRegularFile(dtoFile)) {
            fail("게이트 무결성 파손: 회원가입 요청 DTO 를 찾을 수 없습니다 — " + dtoFile.toAbsolutePath()
                    + "\n   경로가 바뀌었다면 이 린터의 DTO_PATH 도 함께 갱신하십시오. 조용한 skip 은 false-green 입니다.");
        }
        if (!Files.isRegularFile(serviceFile)) {
            fail("게이트 무결성 파손: 회원가입 서비스를 찾을 수 없습니다 — " + serviceFile.toAbsolutePath()
                    + "\n   경로가 바뀌었다면 이 린터의 SERVICE_PATH 도 함께 갱신하십시오. 조용한 skip 은 false-green 입니다.");
        }

        // ── ① 요청 필드 집합 동결 ────────────────────────────────────────────────
        String dtoCode = stripAnnotations(stripComments(Files.readString(dtoFile, StandardCharsets.UTF_8)));
        String classBody = extractClassBody(dtoCode, DTO_CLASS);
        if (classBody == null) {
            fail("게이트 무결성 파손: " + DTO_PATH + " 에서 class " + DTO_CLASS + " 의 본문을 추출하지 못했습니다."
                    + "\n   (클래스 개명/분해 시 이 린터도 함께 갱신할 것 — 추출 실패를 통과로 처리하면 게이트가 사라집니다.)");
        }

        Set<String> fields = extractInstanceFields(classBody);
        if (fields.size() < MIN_SIGNUP_FIELDS) {
            fail("게이트 무결성 파손: " + DTO_CLASS + " 인스턴스 필드 스캔(" + fields.size() + ")이 예상 하한("
                    + MIN_SIGNUP_FIELDS + ") 미만 — 파서/경로 붕괴 의심. 추출된 필드=" + fields
                    + "\n   필드를 못 읽으면 '위반 0' 이 되어 vacuous 통과가 됩니다.");
        }

        List<String> privilegeHits = new ArrayList<>();
        List<String> addedFields = new ArrayList<>();
        for (String field : fields) {
            if (ALLOWED_SIGNUP_FIELDS.contains(field)) {
                continue;
            }
            if (PRIVILEGE_FIELD_NAME.matcher(field).find()) {
                privilegeHits.add(field);
            } else {
                addedFields.add(field);
            }
        }
        List<String> missingFields = new ArrayList<>();
        for (String expected : ALLOWED_SIGNUP_FIELDS) {
            if (!fields.contains(expected)) {
                missingFields.add(expected);
            }
        }

        // ── ② signup() 권한 상수 고정 ───────────────────────────────────────────
        String serviceCode = stripComments(Files.readString(serviceFile, StandardCharsets.UTF_8));
        SignupSlice slice = sliceMethod(serviceCode, SIGNUP_METHOD, DTO_CLASS);
        if (slice == null) {
            fail("게이트 무결성 파손: " + SERVICE_PATH + " 에서 " + SIGNUP_METHOD + "(" + DTO_CLASS
                    + " …) 본문을 추출하지 못했습니다."
                    + "\n   메서드 시그니처가 바뀌었다면 이 린터도 함께 갱신하십시오. 추출 실패를 통과로 처리하면"
                    + "\n   registerUser() 의 Role.valueOf 까지 함께 눈감게 되어 게이트가 무의미해집니다.");
        }
        String body = slice.body();
        if (body.strip().length() < MIN_SIGNUP_BODY_CHARS) {
            fail("게이트 무결성 파손: signup() 본문 추출 길이(" + body.strip().length() + "자)가 예상 하한("
                    + MIN_SIGNUP_BODY_CHARS + ") 미만 — 중괄호 균형 파싱 붕괴 의심.");
        }

        List<String> serviceViolations = new ArrayList<>();
        Matcher valueOf = ROLE_VALUE_OF.matcher(body);
        if (valueOf.find()) {
            serviceViolations.add("signup() 본문에 `" + valueOf.group().trim()
                    + "` — 문자열 권한명을 열거형으로 되살리는 경로입니다(관리자 경로 registerUser 에서만 정당).");
        }
        Matcher getter = Pattern.compile(
                        String.format(REQUEST_PRIVILEGE_GETTER_FORMAT, Pattern.quote(slice.requestParam())))
                .matcher(body);
        if (getter.find()) {
            serviceViolations.add("signup() 본문에 `" + getter.group().trim()
                    + "` — 요청 본문에서 권한을 꺼내고 있습니다(공개 엔드포인트 = 자가 권한 부여).");
        }

        List<String> roleArgs = extractCallArguments(body, ROLE_BUILDER_CALL);
        if (roleArgs.isEmpty()) {
            fail("게이트 무결성 파손: signup() 본문에서 권한 고정 지점(`.role(" + REQUIRED_SIGNUP_ROLE
                    + ")`)을 찾지 못했습니다."
                    + "\n   권한 부여 구조를 바꿨다면 이 린터도 함께 갱신하십시오 — 고정 지점이 사라진 채 통과하면"
                    + "\n   '권한이 어디서 오는지 아무도 검사하지 않는' 상태가 됩니다.");
        }
        for (String arg : roleArgs) {
            String normalized = arg.replaceAll("\\s+", "");
            if (!REQUIRED_SIGNUP_ROLE.equals(normalized)) {
                serviceViolations.add("signup() 의 `.role(" + normalized + ")` — 요청과 무관한 상수 "
                        + REQUIRED_SIGNUP_ROLE + " 이어야 합니다.");
            }
        }

        // ── 판정 ────────────────────────────────────────────────────────────────
        if (privilegeHits.isEmpty() && addedFields.isEmpty() && missingFields.isEmpty()
                && serviceViolations.isEmpty()) {
            log.info("✅ 공개 회원가입 계약 동결 OK — {} 인스턴스 필드 {}개가 동결 집합과 일치, "
                            + "signup() 권한은 {} 상수 고정(요청 유래 권한 0건).",
                    DTO_CLASS, fields.size(), REQUIRED_SIGNUP_ROLE);
            return;
        }

        StringBuilder sb = new StringBuilder();
        sb.append("\n========================================================================\n");
        sb.append("🔐 [SIGNUP CONTRACT LINTER] 공개 회원가입 계약(POST /api/v1/users/signup) 위반!\n");
        sb.append("========================================================================\n");
        if (!privilegeHits.isEmpty()) {
            sb.append("🚨 미인증 공개 요청 DTO 에 권한/역할성 필드가 생겼습니다 — 특권 상승 경로입니다:\n");
            privilegeHits.forEach(f -> sb.append("   ").append(DTO_PATH).append(" : ").append(f).append("\n"));
            sb.append("   → 2026-08-01 에 삭제한 UserSignupRequest.role 과 동일한 결함입니다. 이 필드가 있으면\n");
            sb.append("     인증 없는 요청 1건으로 ROLE_ADMIN 자가 발급이 가능합니다.\n");
            sb.append("     권한 부여는 SecurityUtil.assertAdmin() 이 걸린 UserService.registerUser()\n");
            sb.append("     (POST /api/v1/admin/system/users) 경로에서만 하십시오.\n");
            sb.append("     @JsonIgnore·주석 처리로 대체하지 마십시오 — 필드가 남아 있으면 빌더·매핑으로 되살아납니다.\n");
        }
        if (!addedFields.isEmpty()) {
            sb.append("❌ 동결된 공개 회원가입 계약에 없는 필드:\n");
            addedFields.forEach(f -> sb.append("   ").append(DTO_PATH).append(" : ").append(f).append("\n"));
            sb.append("   → 먼저 답하십시오: '미인증 요청자가 이 값을 스스로 정해도 되는가?'\n");
            sb.append("     된다면 ALLOWED_SIGNUP_FIELDS 에 필드와 사유를 함께 갱신하고(매니페스트도 함께),\n");
            sb.append("     아니라면 서버가 정하도록 옮기십시오.\n");
        }
        if (!missingFields.isEmpty()) {
            sb.append("❌ 동결 목록에 있으나 DTO 에서 사라진 필드: ").append(missingFields).append("\n");
            sb.append("   → 계약 축소가 의도된 것이라면 ALLOWED_SIGNUP_FIELDS 를 사유와 함께 갱신하십시오.\n");
        }
        if (!serviceViolations.isEmpty()) {
            sb.append("❌ UserService.signup() 의 권한이 요청값에서 유래합니다:\n");
            serviceViolations.forEach(v -> sb.append("   ").append(v).append("\n"));
            sb.append("   → 공개 엔드포인트의 권한은 서버 상수여야 합니다: `.role(").append(REQUIRED_SIGNUP_ROLE)
                    .append(")`.\n");
        }
        sb.append("\n💡 근거: AGENTS.md Evidence guardrails H5(게이트 신설·유지) · 백엔드 헌법 제8조(서비스 레이어 권한 재검증).\n");
        sb.append("   대상: ").append(DTO_PATH).append("\n");
        sb.append("         ").append(SERVICE_PATH).append(" #").append(SIGNUP_METHOD).append("\n");
        fail(sb.toString());
    }

    // ---- DTO 필드 추출 ---------------------------------------------------------

    /** 클래스 선언 뒤 첫 중괄호부터 균형이 맞는 닫는 중괄호까지(본문). 실패 시 null. */
    private static String extractClassBody(String code, String className) {
        Matcher decl = Pattern.compile("\\b(?:class|record|interface)\\s+" + Pattern.quote(className) + "\\b")
                .matcher(code);
        if (!decl.find()) {
            return null;
        }
        int open = indexOfNextBrace(code, decl.end());
        if (open < 0) {
            return null;
        }
        int close = matchBalanced(code, open, '{', '}');
        return close < 0 ? null : code.substring(open + 1, close);
    }

    /**
     * 클래스 본문의 <b>최상위 선언문</b>만 훑어 인스턴스 필드 이름을 모은다.
     * 메서드/생성자/초기화 블록은 본문 {@code {…}} 를 만나는 순간 시그니처째로 버리고,
     * 대입({@code =}) 뒤에 오는 {@code {…}}(배열 초기화·람다)는 선언의 일부로 유지한다.
     */
    private static Set<String> extractInstanceFields(String classBody) {
        Set<String> fields = new LinkedHashSet<>();
        StringBuilder buf = new StringBuilder();
        int i = 0;
        while (i < classBody.length()) {
            char c = classBody.charAt(i);
            if (c == '"' || c == '\'') {
                int close = skipLiteral(classBody, i, c);
                buf.append(classBody, i, close + 1);
                i = close + 1;
                continue;
            }
            if (c == '{') {
                int close = matchBalanced(classBody, i, '{', '}');
                if (close < 0) {
                    fail("게이트 무결성 파손: " + DTO_CLASS + " 본문의 중괄호 균형이 맞지 않습니다(파싱 불가).");
                    return fields; // unreachable
                }
                if (buf.indexOf("=") >= 0) {
                    buf.append(classBody, i, close + 1); // 초기화식의 일부
                } else {
                    buf.setLength(0); // 메서드/생성자/초기화 블록 → 필드 선언 아님
                }
                i = close + 1;
                continue;
            }
            if (c == ';') {
                addFieldNames(buf.toString(), fields);
                buf.setLength(0);
                i++;
                continue;
            }
            buf.append(c);
            i++;
        }
        return fields;
    }

    private static void addFieldNames(String statement, Set<String> out) {
        String s = statement.replaceAll("\\s+", " ").trim();
        if (s.isEmpty()) {
            return;
        }
        int assign = indexOfAssign(s);
        if (assign >= 0) {
            s = s.substring(0, assign).trim();
        }
        if (s.isEmpty() || s.matches(".*\\b(?:static|class|interface|enum|record)\\b.*")) {
            return; // 정적 필드·중첩 타입은 '인스턴스 필드' 가 아니다
        }
        if (s.indexOf('(') >= 0) {
            return; // 메서드 시그니처(추상 선언 등)
        }
        Matcher m = FIELD_DECL.matcher(s);
        if (!m.matches()) {
            return;
        }
        for (String declarator : m.group(2).split(",")) {
            String name = declarator.trim();
            if (!name.isEmpty()) {
                out.add(name);
            }
        }
    }

    /** 비교 연산자를 제외한 첫 대입 {@code =} 위치 (없으면 -1) */
    private static int indexOfAssign(String s) {
        for (int i = 0; i < s.length(); i++) {
            if (s.charAt(i) != '=') {
                continue;
            }
            boolean comparison = (i + 1 < s.length() && s.charAt(i + 1) == '=')
                    || (i > 0 && "!<>=+-*/%&|^".indexOf(s.charAt(i - 1)) >= 0);
            if (!comparison) {
                return i;
            }
        }
        return -1;
    }

    // ---- 메서드 본문 슬라이싱 ---------------------------------------------------

    /**
     * {@code methodName(… paramType p …) { … }} 선언을 찾아 본문과 해당 파라미터 이름을 돌려준다.
     * 호출부({@code x.methodName(…)})와 세미콜론으로 끝나는 선언은 건너뛴다. 실패 시 null.
     */
    private static SignupSlice sliceMethod(String code, String methodName, String paramType) {
        Matcher m = Pattern.compile("\\b" + Pattern.quote(methodName) + "\\s*\\(").matcher(code);
        while (m.find()) {
            if (m.start() > 0 && code.charAt(m.start() - 1) == '.') {
                continue; // 메서드 호출
            }
            int openParen = m.end() - 1;
            int closeParen = matchBalanced(code, openParen, '(', ')');
            if (closeParen < 0) {
                continue;
            }
            int j = closeParen + 1;
            while (j < code.length() && (Character.isWhitespace(code.charAt(j))
                    || Character.isJavaIdentifierPart(code.charAt(j))
                    || code.charAt(j) == ',' || code.charAt(j) == '.')) {
                j++; // throws 절 등
            }
            if (j >= code.length() || code.charAt(j) != '{') {
                continue; // 선언이 아니거나 본문 없음
            }
            int end = matchBalanced(code, j, '{', '}');
            if (end < 0) {
                continue;
            }
            String param = paramNameOfType(code.substring(openParen + 1, closeParen), paramType);
            if (param == null) {
                return null; // 시그니처 변경 → 게이트 붕괴로 보고
            }
            return new SignupSlice(code.substring(j + 1, end), param);
        }
        return null;
    }

    /** 파라미터 목록에서 지정 타입 파라미터의 이름을 뽑는다 (없으면 null) */
    private static String paramNameOfType(String params, String type) {
        Pattern typeToken = Pattern.compile("\\b" + Pattern.quote(type) + "\\b");
        for (String raw : params.split(",")) {
            String p = raw.replaceAll("\\s+", " ").trim();
            if (p.isEmpty() || !typeToken.matcher(p).find()) {
                continue;
            }
            String[] tokens = p.split(" ");
            return tokens[tokens.length - 1];
        }
        return null;
    }

    /** {@code pattern} 이 가리키는 각 호출의 인자 텍스트(괄호 안쪽 원문)를 순서대로 수집 */
    private static List<String> extractCallArguments(String code, Pattern pattern) {
        List<String> args = new ArrayList<>();
        Matcher m = pattern.matcher(code);
        while (m.find()) {
            int open = m.end() - 1;
            int close = matchBalanced(code, open, '(', ')');
            if (close < 0) {
                break;
            }
            args.add(code.substring(open + 1, close));
        }
        return args;
    }

    // ---- 텍스트 유틸(문자열 리터럴 보존) ----------------------------------------

    /**
     * 주석만 제거하고 문자열/문자 리터럴은 보존한다. 단순 정규식 치환은 리터럴 속 {@code //} 를
     * 주석으로 오인해 선언을 훼손하므로 상태 기계로 처리한다(오탐 = 거짓 red = 게이트 신뢰 붕괴).
     */
    private static String stripComments(String src) {
        StringBuilder out = new StringBuilder(src.length());
        int i = 0;
        while (i < src.length()) {
            char c = src.charAt(i);
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
            if (c == '"' || c == '\'') {
                int close = skipLiteral(src, i, c);
                out.append(src, i, close + 1);
                i = close + 1;
                continue;
            }
            out.append(c);
            i++;
        }
        return out.toString();
    }

    /**
     * 애노테이션({@code @Name(...)} / {@code @Name})을 제거한다. 리터럴은 건너뛴다 —
     * {@code @Pattern(regexp = "…[@$!%*?&]…")} 처럼 문자열 안에 {@code @} 가 들어 있기 때문이다.
     */
    private static String stripAnnotations(String src) {
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
            if (c == '@' && i + 1 < src.length() && Character.isJavaIdentifierStart(src.charAt(i + 1))) {
                int j = i + 1;
                while (j < src.length()
                        && (Character.isJavaIdentifierPart(src.charAt(j)) || src.charAt(j) == '.')) {
                    j++;
                }
                int k = j;
                while (k < src.length() && Character.isWhitespace(src.charAt(k))) {
                    k++;
                }
                if (k < src.length() && src.charAt(k) == '(') {
                    int close = matchBalanced(src, k, '(', ')');
                    if (close < 0) {
                        out.append(c);
                        i++;
                        continue; // 균형 파손 시 원문 보존
                    }
                    i = close + 1;
                } else {
                    i = j;
                }
                out.append(' ');
                continue;
            }
            out.append(c);
            i++;
        }
        return out.toString();
    }

    /** 여는 괄호/중괄호 위치를 받아 균형이 맞는 닫는 위치를 반환 (리터럴 무시, 없으면 -1) */
    private static int matchBalanced(String code, int openIdx, char open, char close) {
        int depth = 0;
        for (int i = openIdx; i < code.length(); i++) {
            char c = code.charAt(i);
            if (c == '"' || c == '\'') {
                i = skipLiteral(code, i, c);
                continue;
            }
            if (c == open) {
                depth++;
            } else if (c == close) {
                depth--;
                if (depth == 0) {
                    return i;
                }
            }
        }
        return -1;
    }

    private static int indexOfNextBrace(String code, int from) {
        for (int i = from; i < code.length(); i++) {
            char c = code.charAt(i);
            if (c == '"' || c == '\'') {
                i = skipLiteral(code, i, c);
                continue;
            }
            if (c == '{') {
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

    /** cwd 또는 상위에서 settings.gradle 을 가진 저장소 루트를 찾는다(IdentityAxisLinterTest 관행) */
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
}
