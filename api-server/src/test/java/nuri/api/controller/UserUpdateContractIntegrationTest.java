package nuri.api.controller;

import nuri.business.service.user.UserService;
import nuri.business.support.IntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 사용자 수정 요청 계약 — <b>실 Spring 컨텍스트</b> 통합 검증.
 *
 * <p>[왜 이 파일이 따로 필요한가 — 2026-08-11]
 * 같은 계약을 {@code UserApiControllerTest} 가 이미 검증하지만 그쪽은
 * {@code BaseControllerTest} 기반의 <b>standalone MockMvc</b> 다 — 컨트롤러를 손으로 생성해
 * 최소 구성으로 띄우므로, 애플리케이션의 실제 ObjectMapper·Validator·메시지 컨버터 구성이
 * 그대로 적용된다는 보장이 없다.
 *
 * <p>그 차이가 실제로 사고를 냈다: 비밀번호 제약을 등록 그룹으로 한정한 뒤
 * standalone 테스트는 <b>전부 green</b> 이었는데 CI 의 E2E 는 여전히
 * {@code ❌ [HTTP 400 PUT] /api/v1/admin/system/users/{id}} 였다(run 31470242742).
 * 즉 <b>standalone 그린이 실 앱 동작을 보장하지 못했다.</b>
 *
 * <p>그래서 이 파일은 <b>실 컨텍스트</b>({@code @IntegrationTest} = @SpringBootTest + @AutoConfigureMockMvc)
 * 에서 <b>화면이 실제로 보내는 페이로드 그대로</b> 요청한다. 서비스는 목으로 대체해
 * 검증·역직렬화 계층만 남긴다 — DB 상태에 좌우되지 않게 하기 위해서다.
 *
 * <p>⚠ 이 테스트가 확인하는 것은 "요청이 컨트롤러에 도달하는가" 다. 도메인 동작은
 * {@code UserServiceTest} 계열이, 화면 왕복은 E2E(02 티어)가 각각 소유한다.
 */
@IntegrationTest
@AutoConfigureMockMvc
@DisplayName("사용자 수정 요청 계약 (실 컨텍스트)")
class UserUpdateContractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;

    /**
     * 관리자 수정 화면(UserManageForm, edit 모드)이 실제로 전송하는 본문.
     * 필드는 정확히 6개이며 비밀번호는 <b>빈 문자열</b>이다 — 비밀번호 변경은 전용 경로의 책임이라
     * 이 폼은 값을 담지 않는다(defaultValues 의 {@code pswd: ''}).
     */
    private static final String UPDATE_BODY_AS_SENT_BY_UI = """
            {"userId":"e2e_b6n70i","userNm":"E2E User B6N70I UPD","emlAddr":"e2e_b6n70i@egov.kr","mblTelno":"","ognzId":"","pswd":""}
            """;

    /**
     * 이메일이 없는 사용자의 수정 — <b>예외가 아니라 정상 경로</b>다.
     * {@code registerUser} 는 emlAddr 을 인자로 받지 않아 등록 시 저장되지 않으므로,
     * 방금 만든 사용자는 항상 이메일이 비어 있다. 폼은 미입력을 {@code ""} 로 보낸다.
     */
    private static final String UPDATE_BODY_WITH_EMPTY_OPTIONALS = """
            {"userId":"e2e_2na9p","userNm":"E2E User 2NA9P UPD","emlAddr":"","mblTelno":"","ognzId":"","pswd":""}
            """;

    @Test
    @DisplayName("관리자 수정: 화면이 보내는 본문 그대로 400 이 아니어야 한다")
    void adminUpdate_withUiPayload_isNotRejected() throws Exception {
        mockMvc.perform(put("/api/v1/admin/system/users/e2e_b6n70i")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(UPDATE_BODY_AS_SENT_BY_UI))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("관리자 수정: 선택 필드가 빈 문자열이어도 거부되지 않는다 (emlAddr @Pattern 회귀 방어)")
    void adminUpdate_withEmptyOptionalFields_isNotRejected() throws Exception {
        // 종전에는 여기서 400 이 났다 — @Pattern 이 null 은 건너뛰지만 "" 는 검사하기 때문이다.
        //   {"field":"emlAddr","message":"이메일 형식이 올바르지 않습니다"}  (CI run 31472689196)
        // 선택 필드의 형식 제약은 "값이 있으면 형식을 지켜라" 여야 한다.
        mockMvc.perform(put("/api/v1/admin/system/users/e2e_2na9p")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(UPDATE_BODY_WITH_EMPTY_OPTIONALS))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("이메일 형식 검사는 살아 있다 (빈 문자열 허용이 검증을 통째로 끄지 않았는지)")
    void adminUpdate_withMalformedEmail_isStillRejected() throws Exception {
        // 완화의 유일한 위험은 '형식 검사가 통째로 꺼지는 것' 이다 — 반대 방향으로 고정한다.
        mockMvc.perform(put("/api/v1/admin/system/users/e2e_2na9p")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"userId":"e2e_2na9p","userNm":"E2E User","emlAddr":"not-an-email","mblTelno":"","ognzId":"","pswd":""}
                                """))
                .andExpect(status().isBadRequest());
    }

    // ⚠ `/users/me` 케이스는 이 층에서 검증하지 못한다 — 실측(2026-08-11) 결과 500 이 난다.
    //   `mock-security` 프로파일에는 인증 주체가 없어 `@LoginUser CustomUserDetails` 가 null 이고
    //   `userDetails.getUserId()` 에서 NPE 가 발생한다. **앱 결함이 아니라 테스트 구성의 한계**다.
    //   같은 컨트롤러 메서드가 같은 UserDto 를 `@Valid` 로 받으므로 역직렬화·검증 계약은 위
    //   관리자 케이스와 동일하며, 그쪽이 200 인 것으로 계약은 이미 증명된다.
    //   실제 인증 주체를 주입해 이 경로까지 덮으려면 별도 테스트 지원(@WithUserDetails 대응 등)이
    //   필요하다 — 지금 없는 것을 있는 척하지 않기 위해 남겨 두고 명시한다.

    @Test
    @DisplayName("등록은 여전히 비밀번호를 요구한다 (그룹 한정이 등록까지 풀지 않았는지)")
    void insertUser_withoutPassword_isStillRejected() throws Exception {
        mockMvc.perform(post("/api/v1/admin/system/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"userId":"newuser1","userNm":"신규","emlAddr":"new@egov.kr","pswd":""}
                                """))
                .andExpect(status().isBadRequest());
    }
}
