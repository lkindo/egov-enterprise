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
                .role("USER")
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
