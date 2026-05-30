package nuri.api.controller.foundation.controller.system;

import nuri.business.test.BaseControllerTest;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import nuri.business.service.auth.AuthorManageService;
import nuri.business.service.auth.dto.AuthorManageDto;
import nuri.business.service.menu.MenuService;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("AuthorApiController 테스트")
class AuthorApiControllerTest extends BaseControllerTest {

    private AuthorManageService authorManageService;
    private MenuService menuService;
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    @Override
    protected Object getController() {
        authorManageService = mock(AuthorManageService.class);
        menuService = mock(MenuService.class);
        return new AuthorApiController(authorManageService, menuService);
    }

    @Test
    @DisplayName("권한 그룹 목록 조회 성공")
    void testGetAuthors() throws Exception {
        // Given
        when(authorManageService.selectAuthorList(any())).thenReturn(Collections.emptyList());
        when(authorManageService.selectAuthorListTotCnt(any())).thenReturn(0);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/authorities")
                .param("pageIndex", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("권한 그룹 상세 조회 성공")
    void testGetAuthor() throws Exception {
        // Given
        AuthorManageDto dto = AuthorManageDto.builder()
                .authrtCd("ROLE_ADMIN")
                .authrtNm("관리자")
                .build();
        when(authorManageService.selectAuthor("ROLE_ADMIN")).thenReturn(dto);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/authorities/ROLE_ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.authrtCd").value("ROLE_ADMIN"));
    }

    @Test
    @DisplayName("권한 그룹 등록 성공")
    void testCreateAuthor() throws Exception {
        // Given
        AuthorManageDto dto = AuthorManageDto.builder()
                .authrtCd("ROLE_NEW")
                .authrtNm("신규 권한")
                .build();

        // When & Then
        mockMvc.perform(post("/api/v1/admin/system/authorities")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        verify(authorManageService, times(1)).insertAuthor(any(AuthorManageDto.class));
    }

    @Test
    @DisplayName("권한 그룹 삭제 성공")
    void testDeleteAuthor() throws Exception {
        // When & Then
        mockMvc.perform(delete("/api/v1/admin/system/authorities/ROLE_ADMIN"))
                .andExpect(status().isOk());

        verify(authorManageService, times(1)).deleteAuthor("ROLE_ADMIN");
    }

    @Test
    @DisplayName("권한 그룹 수정 성공")
    void testUpdateAuthor() throws Exception {
        AuthorManageDto dto = AuthorManageDto.builder()
                .authrtCd("ROLE_USER")
                .authrtNm("Modified Name")
                .build();
        mockMvc.perform(put("/api/v1/admin/system/authorities/ROLE_USER")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
        verify(authorManageService).updateAuthor(any());
    }

    @Test
    @DisplayName("권한별 메뉴 목록 조회")
    void testGetAuthorMenus() throws Exception {
        mockMvc.perform(get("/api/v1/admin/system/authorities/ROLE_USER/menus"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("권한 그룹 다중 삭제")
    void testDeleteAuthors() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/system/authorities")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of("ROLE_1", "ROLE_2"))))
                .andExpect(status().isOk());
        verify(authorManageService).deleteAuthors(any());
    }
}