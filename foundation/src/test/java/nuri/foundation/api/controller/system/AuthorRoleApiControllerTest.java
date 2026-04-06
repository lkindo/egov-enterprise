package nuri.foundation.api.controller.system;

import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.foundation.service.auth.AuthorRoleManageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("AuthorRoleApiController 테스트")
class AuthorRoleApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AuthorRoleManageService authorRoleManageService;

    @InjectMocks
    private AuthorRoleApiController authorRoleApiController;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(authorRoleApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("권한별 롤 목록 조회 성공")
    void testGetAuthorRoles() throws Exception {
        // Given
        when(authorRoleManageService.selectAuthorRoleList(anyString(), any()))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/authorities/ROLE_ADMIN/roles")
                .param("pageIndex", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("권한별 롤 할당 저장 성공")
    void testSaveAuthorRoles() throws Exception {
        // Given
        List<String> roleCodes = Arrays.asList("ROLE_WEB_001", "ROLE_WEB_002");

        // When & Then
        mockMvc.perform(post("/api/v1/admin/system/authorities/ROLE_ADMIN/roles")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(roleCodes)))
                .andExpect(status().isOk());

        verify(authorRoleManageService, times(1)).insertAuthorRole(eq("ROLE_ADMIN"), anyList());
    }
}