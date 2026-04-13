package nuri.foundation.api.controller.system;

import nuri.foundation.test.BaseControllerTest;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import nuri.foundation.service.auth.UserAuthorityManageService;
import nuri.foundation.service.auth.dto.UserAuthorityDto;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("UserAuthorityApiController 테스트")
class UserAuthorityApiControllerTest extends BaseControllerTest {

    private UserAuthorityManageService userAuthorityManageService;
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    @Override
    protected Object getController() {
        userAuthorityManageService = mock(UserAuthorityManageService.class);
        return new UserAuthorityApiController(userAuthorityManageService);
    }

    @Override
    protected HandlerMethodArgumentResolver[] getCustomArgumentResolvers() {
        return new HandlerMethodArgumentResolver[] { new PageableHandlerMethodArgumentResolver() };
    }

    @Test
    @DisplayName("사용자별 권한 목록 조회 성공")
    void testGetUserAuthorities() throws Exception {
        // Given
        when(userAuthorityManageService.selectUserAuthorityList(any()))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/user-authorities")
                .param("pageIndex", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("사용자 권한 할당 저장 성공")
    void testSaveUserAuthorities() throws Exception {
        // Given
        List<UserAuthorityDto> userAuthorities = Arrays.asList(
                UserAuthorityDto.builder().uniqId("UNIQ_001").authorCode("ROLE_ADMIN").build()
        );

        // When & Then
        mockMvc.perform(post("/api/v1/admin/system/user-authorities")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(userAuthorities)))
                .andExpect(status().isOk());

        verify(userAuthorityManageService, times(1)).saveUserAuthorities(anyList());
    }

    @Test
    @DisplayName("사용자 권한 할당 해제 성공")
    void testDeleteUserAuthorities() throws Exception {
        // Given
        List<String> uniqIds = Arrays.asList("UNIQ_001", "UNIQ_002");

        // When & Then
        mockMvc.perform(delete("/api/v1/admin/system/user-authorities")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(uniqIds)))
                .andExpect(status().isOk());

        verify(userAuthorityManageService, times(1)).deleteUserAuthorities(anyList());
    }

    @Test
    @DisplayName("사용자별 권한 목록 조회 성공 - pageUnit 명시")
    void testGetUserAuthorities_WithPageUnit() throws Exception {
        // Given
        when(userAuthorityManageService.selectUserAuthorityList(any()))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/user-authorities")
                .param("pageIndex", "1")
                .param("pageUnit", "20"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("사용자별 권한 목록 조회 성공 - pageUnit=0 (기본값 설정 로직)")
    void testGetUserAuthorities_WithPageUnitZero() throws Exception {
        // Given
        when(userAuthorityManageService.selectUserAuthorityList(any()))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/user-authorities")
                .param("pageIndex", "1")
                .param("pageUnit", "0"))
                .andExpect(status().isOk());
    }
}