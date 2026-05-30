package nuri.api.controller.foundation.controller.system;

import nuri.business.test.BaseControllerTest;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import nuri.business.service.auth.AuthorRoleManageService;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;

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
class AuthorRoleApiControllerTest extends BaseControllerTest {

    private AuthorRoleManageService authorRoleManageService;
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    @Override
    protected Object getController() {
        authorRoleManageService = mock(AuthorRoleManageService.class);
        return new AuthorRoleApiController(authorRoleManageService);
    }

    @Override
    protected HandlerMethodArgumentResolver[] getCustomArgumentResolvers() {
        return new HandlerMethodArgumentResolver[] { new PageableHandlerMethodArgumentResolver() };
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