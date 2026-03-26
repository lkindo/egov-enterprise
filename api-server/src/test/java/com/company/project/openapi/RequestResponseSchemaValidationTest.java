package com.company.project.openapi;

import com.company.project.api.controller.UserApiController;
import com.company.project.api.interceptor.OperationalAuditInterceptor;
import com.company.project.foundation.core.exception.GlobalExceptionHandler;
import com.company.project.foundation.service.user.UserService;
import com.company.project.foundation.service.user.dto.UserDto;
import com.company.project.foundation.service.user.dto.UserResponse;
import com.company.project.foundation.service.user.dto.UserSignupRequest;
import com.company.project.foundation.domain.user.entity.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.List;
import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * ?붿껌/?묐떟 ?ㅽ궎留?寃利??뚯뒪??(Standalone)
 */
class RequestResponseSchemaValidationTest {

    private MockMvc mockMvc;
    private UserService userService;
    private OperationalAuditInterceptor operationalAuditInterceptor;

    private UserDto testUserDto;
    private UserResponse testUserResponse;

    @BeforeEach
    void setUp() throws Exception {
        userService = mock(UserService.class);
        operationalAuditInterceptor = mock(OperationalAuditInterceptor.class);
        when(operationalAuditInterceptor.preHandle(any(), any(), any())).thenReturn(true);

        testUserDto = UserDto.builder()
                .userId("testUser")
                .userNm("?뚯뒪?몄궗?⑹옄")
                .esntlId("USR_0000000000000001")
                .role("USER")
                .build();
        
        testUserResponse = new UserResponse("testUser", "?뚯뒪?몄궗?⑹옄", Role.USER);

        mockMvc = MockMvcBuilders.standaloneSetup(new UserApiController(userService))
                .addInterceptors(operationalAuditInterceptor)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("?ㅽ궎留?寃利?- ?뚯썝媛???붿껌 蹂몃Ц 援ъ“ ?뺤씤")
    void userSignup_requestSchema_validation() throws Exception {
        String validRequest = """
                {
                  "userId": "validUser123",
                  "password": "ValidPass123!",
                  "userNm": "?뚯뒪?몄궗?⑹옄",
                  "passwordHint": "password hint",
                  "passwordCnsr": "password answer",
                  "role": "USER"
                }
                """;
        
        when(userService.signup(any(UserSignupRequest.class))).thenReturn(testUserResponse);

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(validRequest))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").exists())
                .andExpect(jsonPath("$.data.userId").value("testUser"));
    }

    @Test
    @DisplayName("?ㅽ궎留?寃利?- ?꾩닔 ?꾨뱶 ?꾨씫 ???먮윭 ?묐떟 ?뺤씤")
    void userSignup_missingRequiredFields_validationError() throws Exception {
        String invalidRequest = """
                {
                  "userId": "validUser123"
                }
                """;

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidRequest))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").exists())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    @DisplayName("?ㅽ궎留?寃利?- ?꾨뱶 ???遺덉씪移????먮윭 ?묐떟 ?뺤씤")
    void userSignup_wrongFieldType_validationError() throws Exception {
        String invalidRequest = """
                {
                  "userId": 123,
                  "password": 456,
                  "userNm": true,
                  "passwordHint": "hint",
                  "passwordCnsr": "answer",
                  "role": "USER"
                }
                """;

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidRequest))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").exists());
    }

    @Test
    @DisplayName("?ㅽ궎留?寃利?- ?ъ슜??紐⑸줉 議고쉶 ?묐떟 援ъ“ ?뺤씤")
    void userGetList_responseSchema_validation() throws Exception {
        when(userService.getUserList()).thenReturn(List.of(testUserDto));

        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data", hasSize(greaterThan(0))))
                .andExpect(jsonPath("$.data[0].userId").exists())
                .andExpect(jsonPath("$.data[0].userNm").exists())
                .andExpect(jsonPath("$.data[0].esntlId").exists());
    }

    @Test
    @DisplayName("?ㅽ궎留?寃利?- ?ъ슜???곸꽭 議고쉶 ?묐떟 援ъ“ ?뺤씤")
    void userGetById_responseSchema_validation() throws Exception {
        when(userService.getUserById("testUser")).thenReturn(testUserDto);

        mockMvc.perform(get("/api/v1/users/testUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").exists())
                .andExpect(jsonPath("$.data.userId").exists())
                .andExpect(jsonPath("$.data.userNm").exists())
                .andExpect(jsonPath("$.data.esntlId").exists());
    }

    @Test
    @DisplayName("?ㅽ궎留?寃利?- ?섏씠吏뺣맂 ?ъ슜??紐⑸줉 ?묐떟 援ъ“ ?뺤씤")
    void pagedUserList_responseSchema_validation() throws Exception {
        Pageable pageRequest = PageRequest.of(0, 10);
        Page<UserDto> page = new PageImpl<>(List.of(testUserDto), pageRequest, 1);
        when(userService.getPagedUserList(any())).thenReturn(page);

        mockMvc.perform(get("/api/v1/users/paged?page=0&size=10")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").exists())
                .andExpect(jsonPath("$.data.list").isArray())
                .andExpect(jsonPath("$.data.total").exists());
    }

    @Test
    @DisplayName("?ㅽ궎留?寃利?- ?꾩씠???뺤떇 ?꾨컲 ???먮윭 ?묐떟 ?뺤씤")
    void userSignup_invalidIdFormat_validation() throws Exception {
        String invalidRequest = """
                {
                  "userId": "invalid@user#id",
                  "password": "ValidPass123!",
                  "userNm": "?뚯뒪?몄궗?⑹옄",
                  "passwordHint": "hint",
                  "passwordCnsr": "answer",
                  "role": "USER"
                }
                """;

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidRequest))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").exists());
    }

    @Test
    @DisplayName("?ㅽ궎留?寃利?- ?꾨뱶 湲몄씠 珥덇낵 ???먮윭 ?묐떟 ?뺤씤")
    void userSignup_tooLongField_validation() throws Exception {
        String longUserId = "a".repeat(50);
        String invalidRequest = """
                {
                  "userId": "%s",
                  "password": "ValidPass123!",
                  "userNm": "?뚯뒪?몄궗?⑹옄",
                  "passwordHint": "hint",
                  "passwordCnsr": "answer",
                  "role": "USER"
                }
                """.formatted(longUserId);

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidRequest))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").exists());
    }

    @Test
    @DisplayName("?ㅽ궎留?寃利?- 鍮꾨?踰덊샇 蹂듭옟??誘몃떖 ???먮윭 ?묐떟 ?뺤씤")
    void userSignup_shortPassword_validation() throws Exception {
        String invalidRequest = """
                {
                  "userId": "validUser123",
                  "password": "123",
                  "userNm": "?뚯뒪?몄궗?⑹옄",
                  "passwordHint": "hint",
                  "passwordCnsr": "answer",
                  "role": "USER"
                }
                """;

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidRequest))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").exists());
    }

    @Test
    @DisplayName("?ㅽ궎留?寃利?- ?ъ슜???뺣낫 ?섏젙 ?붿껌 援ъ“ ?뺤씤")
    void userUpdate_requestSchema_validation() throws Exception {
        String validRequest = """
                {
                  "userId": "updateUser",
                  "userNm": "?섏젙?ъ슜??,
                  "esntlId": "USR_0000000000000001",
                  "passwordHint": "new hint",
                  "passwordCnsr": "new answer",
                  "role": "ADMIN"
                }
                """;

        mockMvc.perform(put("/api/v1/users/updateUser")
                .contentType(MediaType.APPLICATION_JSON)
                .content(validRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("?ㅽ궎留?寃利?- UserDto ?꾩껜 ?꾨뱶 議댁옱 ?뺤씤")
    void responseSchema_userDtoFieldExistence() throws Exception {
        when(userService.getUserById("testUser")).thenReturn(testUserDto);

        mockMvc.perform(get("/api/v1/users/testUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").exists())
                .andExpect(jsonPath("$.data.userNm").exists())
                .andExpect(jsonPath("$.data.esntlId").exists());
    }

    @Test
    @DisplayName("?ㅽ궎留?寃利?- 怨듯넻 ?묐떟 ?깃났 援ъ“ ?뺤씤")
    void responseSchema_commonStructure_validation() throws Exception {
        when(userService.getUserById("testUser")).thenReturn(testUserDto);

        mockMvc.perform(get("/api/v1/users/testUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(isA(Boolean.class)))
                .andExpect(jsonPath("$.data").exists())
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    @DisplayName("?ㅽ궎留?寃利?- 怨듯넻 ?먮윭 ?묐떟 援ъ“ ?뺤씤")
    void errorResponseSchema_commonStructure_validation() throws Exception {
        String invalidRequest = """
                {
                  "userId": "",
                  "password": "",
                  "userNm": ""
                }
                """;

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidRequest))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").exists())
                .andExpect(jsonPath("$.message").exists());
    }
}
