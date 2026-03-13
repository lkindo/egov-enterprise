package com.company.project.api.controller.system;

import com.company.project.service.menu.MenuService;
import com.company.project.service.menu.dto.MenuDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;

@WebMvcTest(MenuAdminController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("MenuAdminController 테스트")
class MenuAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private MenuService menuService;

    @Test
    @DisplayName("메뉴 목록 페이징 조회 성공")
    void getMenuList_Success() throws Exception {
        given(menuService.selectMenuManageList(any())).willReturn(Collections.emptyList());
        given(menuService.selectMenuManageListTotCnt(any())).willReturn(0);

        mockMvc.perform(get("/api/v1/admin/system/menus")
                .param("page", "0")
                .param("size", "10"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("전체 메뉴 트리용 목록 조회 성공")
    void getAllMenus_Success() throws Exception {
        given(menuService.getAllMenus()).willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/admin/system/menus/all"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("메뉴 상세 조회 성공")
    void getMenu_Success() throws Exception {
        given(menuService.selectMenuManage(anyLong())).willReturn(MenuDto.builder().menuNo(1L).build());

        mockMvc.perform(get("/api/v1/admin/system/menus/{menuNo}", 1L))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.menuNo").value(1L));
    }

    @Test
    @DisplayName("메뉴 등록 성공")
    void createMenu_Success() throws Exception {
        MenuDto dto = MenuDto.builder().menuNm("New Menu").build();

        mockMvc.perform(post("/api/v1/admin/system/menus")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(menuService).insertMenuManage(any(MenuDto.class));
    }

    @Test
    @DisplayName("메뉴 수정 성공")
    void updateMenu_Success() throws Exception {
        MenuDto dto = MenuDto.builder().menuNm("Updated Menu").build();

        mockMvc.perform(put("/api/v1/admin/system/menus/{menuNo}", 1L)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(menuService).updateMenuManage(any(MenuDto.class));
    }

    @Test
    @DisplayName("메뉴 삭제 성공")
    void deleteMenu_Success() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/system/menus/{menuNo}", 1L))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(menuService).deleteMenuManage(any(MenuDto.class));
    }
}
