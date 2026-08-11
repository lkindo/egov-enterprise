package nuri.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import nuri.foundation.security.service.CustomUserDetails;
import nuri.business.service.user.UserService;
import nuri.business.service.user.dto.*;
import nuri.business.test.BaseControllerTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("UserApiController 테스트")
public class UserApiControllerTest extends BaseControllerTest {
    
    private UserService userService;
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    
    // LoginUser 어노테이션 리졸버 모킹을 위해 CustomUserDetails 생성
    private final CustomUserDetails mockUserDetails = new CustomUserDetails(
            "testuser", "testuser", "테스트", "password", "USER", "N", "ROLE_USER"
    );

    @Override
    protected Object getController() {
        userService = mock(UserService.class);
        return new UserApiController(userService);
    }
    
    @Override
    protected org.springframework.web.method.support.HandlerMethodArgumentResolver[] getCustomArgumentResolvers() {
        return new org.springframework.web.method.support.HandlerMethodArgumentResolver[] {
            new HandlerMethodArgumentResolver() {
                @Override
                public boolean supportsParameter(MethodParameter parameter) {
                    return parameter.getParameterType().isAssignableFrom(CustomUserDetails.class);
                }
                @Override
                public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                              NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
                    return mockUserDetails;
                }
            }
        };
    }

    /**
     * 요청 본문 JSON 생성 헬퍼. UserDto 의 비밀번호 계열 필드는 응답 노출 차단(@JsonProperty WRITE_ONLY)으로
     * 직렬화 시 제거되므로, 요청(write) 검증 테스트에서는 명시적으로 다시 실어준다.
     */
    private String toUserRequestJson(UserDto dto) throws Exception {
        com.fasterxml.jackson.databind.node.ObjectNode node = objectMapper.valueToTree(dto);
        if (dto.pswd() != null) node.put("pswd", dto.pswd());
        if (dto.pswdHint() != null) node.put("pswdHint", dto.pswdHint());
        if (dto.pswdCrans() != null) node.put("pswdCrans", dto.pswdCrans());
        return objectMapper.writeValueAsString(node);
    }

    @Test
    @DisplayName("내 프로필 조회 성공")
    void getMe() throws Exception {
        UserDto mockDto = UserDto.builder()
                .userId("testuser")
                .userNm("테스트")
                .pswd("ValidPass123!")
                .build();
        when(userService.getUserById("testuser")).thenReturn(mockDto);

        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("내 프로필 수정 성공")
    void updateMe() throws Exception {
        UserDto dto = UserDto.builder()
                .userId("testuser")
                .userNm("홍길동")
                .pswd("ValidPass123!")
                .build();
        
        doNothing().when(userService).updateUser(eq("testuser"), any(UserDto.class));

        mockMvc.perform(put("/api/v1/users/me")
                .contentType(MediaType.APPLICATION_JSON)
                .content(toUserRequestJson(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("비밀번호 변경 성공")
    void changePassword() throws Exception {
        PasswordChangeRequest request = new PasswordChangeRequest("oldPassword123!", "newPassword123!");
        
        doNothing().when(userService).changePassword("testuser", "oldPassword123!", "newPassword123!");

        mockMvc.perform(put("/api/v1/users/me/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("회원가입 성공")
    void signup() throws Exception {
        UserSignupRequest request = UserSignupRequest.builder()
                .userId("newUser")
                .pswd("ValidPass123!")
                .userNm("Name")
                .pswdHint("hint")
                .pswdCrans("ValidPass123!")
                .build();

        UserResponse response = UserResponse.builder().userId("newUser").build();
        when(userService.signup(any(UserSignupRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("아이디 중복 확인 성공")
    void checkIdDplct() throws Exception {
        when(userService.checkIdDplct("testuser")).thenReturn(false);

        mockMvc.perform(get("/api/v1/users/check-id").param("userId", "testuser"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(false));
    }

    @Test
    @DisplayName("관리자: 사용자 목록 조회 성공")
    void getUsers() throws Exception {
        Page<UserDto> page = new PageImpl<>(Collections.emptyList());
        when(userService.getPagedUserList(any(), any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/admin/system/users"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("관리자: 특정 사용자 조회 성공")
    void getUser() throws Exception {
        UserDto mockDto = UserDto.builder()
                .userId("targetUser")
                .userNm("홍길동")
                .pswd("ValidPass123!")
                .build();
        when(userService.getUserById("targetUser")).thenReturn(mockDto);

        mockMvc.perform(get("/api/v1/admin/system/users/targetUser"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("관리자: 사용자 등록 성공")
    void insertUser() throws Exception {
        UserDto dto = UserDto.builder()
                .userId("newUser")
                .userNm("홍길동")
                .pswd("ValidPass123!")
                .build();
        
        when(userService.registerUser(any(), any(), any(), any(), any(), any())).thenReturn("newUser");

        mockMvc.perform(post("/api/v1/admin/system/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(toUserRequestJson(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value("newUser"));
    }

    @Test
    @DisplayName("관리자: 사용자 정보 수정 성공")
    void updateUser() throws Exception {
        UserDto dto = UserDto.builder()
                .userId("targetUser")
                .userNm("홍길동")
                .pswd("ValidPass123!")
                .build();
        doNothing().when(userService).updateUser(eq("targetUser"), any(UserDto.class));

        mockMvc.perform(put("/api/v1/admin/system/users/targetUser")
                .contentType(MediaType.APPLICATION_JSON)
                .content(toUserRequestJson(dto)))
                .andExpect(status().isOk());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // [2026-08-11 회귀 방어] 비밀번호 제약의 그룹 한정 (UserValidationGroups.OnCreate)
    //
    // 종전에는 UserDto.pswd 의 @NotBlank 가 기본 그룹이라 **수정 요청에도 적용**됐다.
    // 수정 폼은 비밀번호를 보내지 않는 것이 옳은 설계이므로(변경은 전용 경로 책임),
    // 관리자 사용자 수정은 화면에서 **항상 400** 이었다.
    //
    // ⚠ 위 updateUser() 테스트가 이것을 잡지 못한 이유: `pswd("ValidPass123!")` 를 실어
    //   검증기를 만족시켰다 — 화면이 실제로 보내는 것과 무관한 페이로드였다.
    //   아래 두 테스트는 **화면이 실제로 보내는 형태(pswd: "")** 를 그대로 쓴다.
    //
    // 양방향으로 고정한다 — 완화(수정 통과)만 확인하면 등록의 비밀번호 검증이 통째로
    // 꺼져도 그린이 된다(그것이 이 변경의 유일한 위험이다).
    // ─────────────────────────────────────────────────────────────────────────

    /** 관리자 수정 화면이 실제로 보내는 페이로드. userId·pswd 를 포함하되 pswd 는 빈 문자열이다. */
    private static final String UPDATE_PAYLOAD_AS_SENT_BY_UI = """
            {"userId":"targetUser","userNm":"홍길동","emlAddr":"target@egov.kr","mblTelno":"01012345678","ognzId":"","pswd":""}
            """;

    @Test
    @DisplayName("관리자: 비밀번호 없이도 사용자 정보를 수정할 수 있다 (그룹 한정 회귀 방어)")
    void updateUser_withoutPassword_succeeds() throws Exception {
        doNothing().when(userService).updateUser(eq("targetUser"), any(UserDto.class));

        mockMvc.perform(put("/api/v1/admin/system/users/targetUser")
                .contentType(MediaType.APPLICATION_JSON)
                .content(UPDATE_PAYLOAD_AS_SENT_BY_UI))
                .andExpect(status().isOk());

        // 서비스까지 실제로 도달해야 한다 — 400 이던 시절에는 여기에 닿지 못했다.
        verify(userService).updateUser(eq("targetUser"), any(UserDto.class));
    }

    @Test
    @DisplayName("내 프로필: 비밀번호 없이도 수정할 수 있다 (같은 결함이 /users/me 에도 있었다)")
    void updateMe_withoutPassword_succeeds() throws Exception {
        doNothing().when(userService).updateUser(eq("testuser"), any(UserDto.class));

        mockMvc.perform(put("/api/v1/users/me")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"userId":"testuser","userNm":"테스트","emlAddr":"me@egov.kr","pswd":""}
                        """))
                .andExpect(status().isOk());

        verify(userService).updateUser(eq("testuser"), any(UserDto.class));
    }

    @Test
    @DisplayName("등록은 여전히 비밀번호를 요구한다 (그룹 한정이 등록까지 풀지 않았는지)")
    void insertUser_withoutPassword_isStillRejected() throws Exception {
        mockMvc.perform(post("/api/v1/admin/system/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"userId":"newuser1","userNm":"신규","emlAddr":"new@egov.kr","pswd":""}
                        """))
                .andExpect(status().isBadRequest());

        verify(userService, never()).registerUser(any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("등록은 여전히 비밀번호 형식을 검사한다 (@Pattern 이 그룹과 함께 살아 있는지)")
    void insertUser_withWeakPassword_isStillRejected() throws Exception {
        mockMvc.perform(post("/api/v1/admin/system/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"userId":"newuser2","userNm":"신규","emlAddr":"new2@egov.kr","pswd":"weakpass"}
                        """))
                .andExpect(status().isBadRequest());

        verify(userService, never()).registerUser(any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("등록에서 기본 그룹 제약(@Size)도 여전히 살아 있다 (Default 누락 회귀 방어)")
    void insertUser_withOversizedField_isStillRejected() throws Exception {
        // userId 는 @Size(min=4, max=20). `@Validated(OnCreate.class)` 를 Default 없이 쓰면
        // 이 제약이 통째로 꺼진다 — 그 실수를 정면으로 잡는다.
        mockMvc.perform(post("/api/v1/admin/system/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"userId":"u","userNm":"신규","emlAddr":"new3@egov.kr","pswd":"ValidPass123!"}
                        """))
                .andExpect(status().isBadRequest());

        verify(userService, never()).registerUser(any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("관리자: 사용자 삭제 성공")
    void deleteUser() throws Exception {
        doNothing().when(userService).deleteUser("targetUser");

        mockMvc.perform(delete("/api/v1/admin/system/users/targetUser"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("관리자: 사용자 다중 삭제 성공")
    void deleteUsers() throws Exception {
        doNothing().when(userService).deleteUserList(any());

        mockMvc.perform(delete("/api/v1/admin/system/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content("[\"user1\", \"user2\"]"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("관리자: 비밀번호 강제 변경 성공")
    void updatePasswordByAdmin() throws Exception {
        AdminPasswordChangeRequest req = new AdminPasswordChangeRequest("newPassword123!");
        doNothing().when(userService).updatePasswordByAdmin("targetUser", "newPassword123!");

        mockMvc.perform(patch("/api/v1/admin/system/users/targetUser/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("관리자: 상태 일괄 변경 성공")
    void updateUsersStatus() throws Exception {
        BulkStatusRequest req = new BulkStatusRequest();
        req.setUserIds(List.of("user1"));
        req.setStatus("P");
        doNothing().when(userService).updateUsersStatus(any(), eq("P"));

        mockMvc.perform(patch("/api/v1/admin/system/users/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("관리자: 부서 일괄 이동 성공")
    void moveUsersToDept() throws Exception {
        BulkDeptMoveRequest req = new BulkDeptMoveRequest();
        req.setUserIds(List.of("user1"));
        req.setOgnzId("ORG1");
        doNothing().when(userService).moveUsersToDept(any(), eq("ORG1"));

        mockMvc.perform(patch("/api/v1/admin/system/users/dept")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("관리자: 권한 일괄 변경 성공")
    void updateUsersRole() throws Exception {
        BulkRoleRequest req = new BulkRoleRequest();
        req.setUserIds(List.of("user1"));
        req.setRole(nuri.business.domain.user.entity.Role.ADMIN);
        doNothing().when(userService).updateUsersRole(any(), eq(nuri.business.domain.user.entity.Role.ADMIN));

        mockMvc.perform(patch("/api/v1/admin/system/users/role")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }
}
