package nuri.api.controller.foundation.controller.system;

import nuri.business.test.BaseControllerTest;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import nuri.business.service.menu.MenuService;
import nuri.business.service.menu.dto.MenuDto;
import org.springframework.http.MediaType;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("MenuApiController 테스트")
class MenuApiControllerTest extends BaseControllerTest {

    private MenuService menuService;
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    @Override
    protected Object getController() {
        menuService = mock(MenuService.class);
        return new MenuApiController(menuService);
    }

    @Override
    protected HandlerMethodArgumentResolver[] getCustomArgumentResolvers() {
        return new HandlerMethodArgumentResolver[] { new PageableHandlerMethodArgumentResolver() };
    }

    @Test
    @DisplayName("메뉴 목록 조회 성공")
    void testGetMenus() throws Exception {
        // Given
        when(menuService.selectMenuManageList(any())).thenReturn(Collections.emptyList());
        when(menuService.selectMenuManageListTotCnt(any())).thenReturn(0);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/menus"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("메뉴 상세 조회 성공")
    void testGetMenu() throws Exception {
        // Given
        MenuDto dto = new MenuDto();
        dto.setMenuNo(1001L);
        dto.setMenuNm("시스템 관리");
        when(menuService.selectMenuManage(1001L)).thenReturn(dto);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/menus/1001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.menuNo").value(1001));
    }

    @Test
    @DisplayName("메뉴 등록 성공")
    void testCreateMenu() throws Exception {
        // Given
        MenuDto dto = new MenuDto();
        dto.setMenuNo(2001L);
        dto.setMenuNm("신규 메뉴");

        // When & Then
        mockMvc.perform(post("/api/v1/admin/system/menus")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        verify(menuService, times(1)).insertMenuManage(any(MenuDto.class));
    }

    @Test
    @DisplayName("메뉴 삭제 성공")
    void testDeleteMenu() throws Exception {
        // When & Then
        mockMvc.perform(delete("/api/v1/admin/system/menus/1001"))
                .andExpect(status().isOk());

        verify(menuService, times(1)).deleteMenuManage(any(MenuDto.class));
    }

    @Test
    @DisplayName("전체 메뉴 트리 조회")
    void testGetAllMenus() throws Exception {
        when(menuService.getAllMenus()).thenReturn(Collections.emptyList());
        mockMvc.perform(get("/api/v1/admin/system/menus/all"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("메뉴 수정")
    void testUpdateMenu() throws Exception {
        MenuDto dto = new MenuDto();
        dto.setMenuNm("Updated");
        mockMvc.perform(put("/api/v1/admin/system/menus/1001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("메뉴 순서 일괄 변경")
    void testUpdateMenuOrder() throws Exception {
        mockMvc.perform(put("/api/v1/admin/system/menus/batch-order")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Collections.emptyList())))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("메뉴 생성 관리 목록 조회")
    void testGetMenuCreationManageList() throws Exception {
        when(menuService.selectMenuCreatManagList(any())).thenReturn(Collections.emptyList());
        mockMvc.perform(get("/api/v1/admin/system/menus/creation-manage"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("권한별 메뉴 목록 조회")
    void testGetMenuCreationList() throws Exception {
        when(menuService.selectMenuCreatList(any())).thenReturn(Collections.emptyList());
        mockMvc.perform(get("/api/v1/admin/system/menus/creation/ROLE_ADMIN"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("권한별 메뉴 할당 저장")
    void testCreateMenuCreation() throws Exception {
        mockMvc.perform(post("/api/v1/admin/system/menus/creation/ROLE_ADMIN")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of(1001L, 1002L))))
                .andExpect(status().isOk());
        verify(menuService).insertMenuCreatList(eq("ROLE_ADMIN"), anyString());
    }
}