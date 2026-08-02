package nuri.security.test;

import nuri.business.service.user.dto.UserResponse;
import nuri.business.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 회원가입 요청의 <b>입력 검증 계약</b>을 HTTP 경계에서 검증한다.
 *
 * <p><b>이 클래스는 왜 개명되었는가</b> — 전신은 {@code SqlInjectionAndXssDefenseTest} 였다.
 * 그 4개 테스트는 {@code andExpect(result -> { /* Ignore *&#47; })} 와 {@code catch (Exception e) {}} 로
 * 이중 무력화되어 <b>단언이 0개</b>였다. {@code admin'; SHUTDOWN; --} 가 DB 에 도달하든 서버가 500 을 내든
 * 무조건 green 이었고, CI 리포트에는 "SQL Injection 방어 테스트 통과" 로 계상됐다.
 * 클래스명은 리포트에서 읽히는 유일한 단위이므로, 검증하지 않는 것을 이름으로 주장하는 것 자체가
 * 거짓 안전감의 원천이다. 실제로 증명 가능한 범위에 맞춰 이름을 좁혔다.
 *
 * <p><b>[증명하는 것]</b> {@code @Pattern} 화이트리스트가 있는 필드는 SQL/HTML 메타문자를
 * <b>그 필드의 검증 실패로</b> 거부한다. 단순 400 이 아니라 {@code $.errors[].field} 까지 단언해
 * <b>귀속(attribution)</b>을 못 박는다 — 전신이 내던 400 은 사실 페이로드 때문이 아니라
 * 요청 바디의 필드명 오기({@code "password"} vs 실제 {@code pswd}) 때문이었고,
 * 단순 {@code status().isBadRequest()} 였다면 그 오기 상태에서도 통과했을 것이다.
 *
 * <p><b>[증명하지 <u>않는</u> 것 — 정직한 보류]</b>
 * <ul>
 *   <li><b>DB 파라미터 바인딩.</b> {@link BaseSecurityTest} 가 {@code userService} 를
 *       {@code @MockitoBean} 으로 대체하므로 쿼리가 실행되지 않는다. 실 바인딩을 증명하려면
 *       실 DB tier 가 필요하다. (실측상 네이티브 쿼리 17곳은 전부 {@code :param} 명명 바인딩이고
 *       프로덕션 {@code JdbcTemplate} 사용처도 상수 SQL 또는 {@code ?} 바인딩이나,
 *       <b>그 사실을 이 테스트가 증명하는 것은 아니다.</b>)</li>
 *   <li><b>메서드 인가</b>({@code @PreAuthorize}). {@code mock-security-test} 프로파일에는
 *       {@code @EnableMethodSecurity} 를 켜는 설정이 없다. 여기서 통과하는 것은 URL 레벨 인가뿐이다.</li>
 *   <li><b>보안 응답 헤더.</b> 이 tier 의 필터체인은 {@code SecurityTestConfig} 라 운영 헤더가 없다.
 *       운영 헤더는 {@code ApiSecurityConfig} 를 실제로 로드하는
 *       {@code nuri.api.config.ApiSecurityConfigTest} 가 검증한다.</li>
 *   <li><b>XSS 출력 이스케이프.</b> 이 저장소 백엔드에는 이스케이프/새니타이즈 로직이 <b>없다</b>
 *       (전 모듈에 {@code HtmlUtils}·Jsoup·XSS 필터 0건). 원시 HTML 렌더 지점은 프론트 2곳뿐이고
 *       둘 다 DOMPurify 로 감싸져 있다(BoardDetailClient.tsx / help/policies/[type]/page.tsx).
 *       전신은 "그러나 이스케이프 처리됨" 이라는 DisplayName 과 {@code "Sanitized Name"} 스텁으로
 *       존재하지 않는 방어를 코드에 박제했다. 그 거짓을 되풀이하지 않기 위해 여기서 XSS 출력은 다루지 않는다.
 *       <b>백엔드가 이스케이프하지 않는다는 사실을 테스트로 동결하지도 않는다</b> — 동결하면 훗날
 *       정당한 하드닝이 "위반" 으로 분류된다.</li>
 * </ul>
 */
class SignupInputValidationContractTest extends BaseSecurityTest {

    /* 유효 기준선(control). 모든 제약을 통과하는 값이며, 각 테스트는 여기서 딱 한 필드만 변형한다.
     * 이 기준선이 200 이라는 것이 아래 400 들의 귀속 근거다 — 기준선이 red 면 나머지 단언은 전부 무의미하다. */
    private static final String VALID_USER_ID = "testuser01";   // ^[a-zA-Z0-9]+$, 4~20자
    private static final String VALID_PSWD = "password123!";    // 영문+숫자+특수, 8~20자
    private static final String VALID_USER_NM = "테스트사용자";   // ^[a-zA-Z0-9가-힣\s]{2,50}$
    private static final String VALID_HINT = "hint";            // @Pattern 없음

    /*
     * 페이로드 길이는 의도적으로 각 필드의 @Size 범위 안에 둔다. 범위를 벗어나면 400 의 원인이
     * @Size 일 수 있어, @Pattern 을 지워도 테스트가 green 을 유지한다(vacuous). 길이를 범위 안에 두면
     * 남는 원인은 @Pattern 뿐이라 red 주입이 실제로 성립한다.
     */
    private static final String SQLI_COMMENT = "admin'--";        // 8자  (@Size 4~20 이내)
    private static final String SQLI_TAUTOLOGY = "a' OR '1'='1";  // 12자 (@Size 4~20 이내)
    private static final String XSS_SCRIPT_TAG = "<script>alert(1)</script>"; // 25자 (2~50 이내)

    /*
     * 바디는 실제 DTO 필드명(pswd)을 쓴다. 전신은 "password" 를 보내 매번 pswd 누락으로 400 이 났고,
     * 그래서 페이로드와 무관하게 400 이 나오는 상태였다. 또한 이 tier 는
     * fail-on-unknown-properties 가 false 라 미지 필드가 조용히 무시되므로, 미지 필드에 의존하는
     * 단언(예: role 주입 거부)은 여기서 vacuous 하다 — 그 계약은
     * UserApiControllerIntegrationTest.signup_rejectsRoleInjection 이 별도로 검증한다.
     */
    private static String signupBody(String userId, String pswd, String userNm, String pswdHint) {
        return """
                {
                  "userId": "%s",
                  "pswd": "%s",
                  "userNm": "%s",
                  "pswdHint": "%s",
                  "pswdCrans": "answer"
                }
                """.formatted(userId, pswd, userNm, pswdHint);
    }

    @Test
    @DisplayName("[대조군] 메타문자 없는 정상 요청은 200 이고 서비스까지 도달한다")
    void validBaseline_reachesService_andReturns200() throws Exception {
        when(userService.signup(any(UserSignupRequest.class)))
                .thenReturn(new UserResponse(VALID_USER_ID, VALID_USER_NM, "USER"));

        mockMvc.perform(post("/api/v1/users/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(signupBody(VALID_USER_ID, VALID_PSWD, VALID_USER_NM, VALID_HINT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value(VALID_USER_ID));

        verify(userService).signup(any(UserSignupRequest.class));
    }

    @Test
    @DisplayName("userId 의 SQL 주석 메타문자(admin'--)는 userId 필드 오류로 400 이고 서비스에 도달하지 않는다")
    void sqlCommentInUserId_isRejectedAsUserIdFieldError() throws Exception {
        mockMvc.perform(post("/api/v1/users/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(signupBody(SQLI_COMMENT, VALID_PSWD, VALID_USER_NM, VALID_HINT)))
                .andExpect(status().isBadRequest())
                // 400 만으로는 증거가 되지 않는다 — 어느 필드 때문인지까지 못 박는다.
                .andExpect(jsonPath("$.errors", hasSize(1)))
                .andExpect(jsonPath("$.errors[0].field").value("userId"));

        verify(userService, never()).signup(any(UserSignupRequest.class));
    }

    @Test
    @DisplayName("userId 의 항진식 주입(a' OR '1'='1)은 userId 필드 오류로 400 이고 서비스에 도달하지 않는다")
    void sqlTautologyInUserId_isRejectedAsUserIdFieldError() throws Exception {
        mockMvc.perform(post("/api/v1/users/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(signupBody(SQLI_TAUTOLOGY, VALID_PSWD, VALID_USER_NM, VALID_HINT)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors", hasSize(1)))
                .andExpect(jsonPath("$.errors[0].field").value("userId"));

        verify(userService, never()).signup(any(UserSignupRequest.class));
    }

    @Test
    @DisplayName("userNm 의 <script> 태그는 userNm 필드 오류로 400 이고 서비스에 도달하지 않는다")
    void scriptTagInUserNm_isRejectedAsUserNmFieldError() throws Exception {
        mockMvc.perform(post("/api/v1/users/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(signupBody(VALID_USER_ID, VALID_PSWD, XSS_SCRIPT_TAG, VALID_HINT)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors", hasSize(1)))
                .andExpect(jsonPath("$.errors[0].field").value("userNm"));

        verify(userService, never()).signup(any(UserSignupRequest.class));
    }
}
