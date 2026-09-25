package nuri.business.service.user;

/**
 * 비밀번호 규칙 — 사용자 등록·가입·본인 변경·관리자 초기화가 모두 이 한 곳을 쓴다(2026-09-25 DIP S5).
 *
 * <p>종전에는 네 경로가 서로 달랐다. 등록은 8~100자에 특수문자 7종({@code @$!%*?&})만, 가입은 8~20자에 같은
 * 7종만, 본인 변경과 관리자 초기화는 8~20자에 조합 규칙이 없었고, 화면 공용 스키마는 또 다른 특수문자 집합
 * ({@code !@#$%^*+=-})을 요구했다. 그래서 화면이 받아 준 {@code #} 포함 비밀번호를 등록 API 가 거부하고,
 * 등록 때 막힌 약한 비밀번호가 관리자 초기화로는 들어갔다.
 *
 * <ul>
 *   <li>길이 {@value #MIN_LENGTH}~{@value #MAX_LENGTH}자 — 긴 암호문구를 허용한다. 출력 가능한 ASCII 만
 *       받으므로 bcrypt 의 72바이트 한도 안이다.</li>
 *   <li>영문·숫자·특수문자를 각각 1자 이상. 특수문자는 공백을 뺀 ASCII 기호 전부다.</li>
 *   <li>공백·비ASCII 문자는 받지 않는다 — 입력기·정규화 차이로 같은 비밀번호가 다른 바이트가 되는 것을 막는다.</li>
 * </ul>
 *
 * <p>애노테이션 인자로 쓰려고 상수로 둔다. {@code @Size}·{@code @Pattern} 이 OpenAPI 에 실려 화면의 생성
 * zod 스키마까지 같은 규칙이 흐른다.
 */
public final class PasswordPolicy {

    public static final int MIN_LENGTH = 8;
    public static final int MAX_LENGTH = 64;

    /** 영문·숫자·특수문자 각 1자 이상, 공백 없는 출력 가능 ASCII {@value #MIN_LENGTH}~{@value #MAX_LENGTH}자. */
    public static final String PATTERN =
            "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[!-/:-@\\[-`{-~])[!-~]{8,64}$";

    public static final String LENGTH_MESSAGE = "비밀번호는 8~64자여야 합니다";

    public static final String PATTERN_MESSAGE =
            "비밀번호는 영문·숫자·특수문자를 각각 1자 이상 포함해야 하며 공백은 쓸 수 없습니다";

    private PasswordPolicy() {
    }
}
