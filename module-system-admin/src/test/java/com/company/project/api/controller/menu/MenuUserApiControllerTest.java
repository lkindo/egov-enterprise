package com.company.project.api.controller.menu;

import com.company.project.domain.menu.Menu;
import com.company.project.service.menu.MenuService;
import com.company.project.service.menu.dto.MenuDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MenuUserApiController.class)
@DisplayName("MenuUserApiController 테스트")
class MenuUserApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MenuService menuService;

    @Test
    @WithMockUser
    @DisplayName("GNB 메뉴 목록 조회 API 테스트")
    void getHeadMenu_Success() throws Exception {
        MenuDto dto = MenuDto.builder().menuNo(1L).menuNm("Home").build();
        given(menuService.getMenuHierarchy()).willReturn(List.of(dto));

        mockMvc.perform(get("/api/v1/menus/head")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].menuNm").value("Home"));
    }

    @Test
    @WithMockUser
    @DisplayName("하위 메뉴 목록 조회 API 테스트")
    void getLeftMenu_Success() throws Exception {
        MenuDto dto = MenuDto.builder().menuNo(2L).menuNm("Sub").build();
        given(menuService.getSubMenus(1L)).willReturn(List.of(dto));

        mockMvc.perform(get("/api/v1/menus/left")
                        .param("menuNo", "1")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].menuNm").value("Sub"));
    }

    @Test
    @WithMockUser
    @DisplayName("Raw 메뉴 목록 조회 API 테스트 (테스트용)")
    void getRawMenus_Success() throws Exception {
        Menu menu = Menu.builder().id(1L).menuNm("Raw").build();
        given(menuService.getAllMenusCached()).willReturn(List.of(menu));

        mockMvc.perform(get("/api/v1/menus/test/raw")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.menus[0].menuNm").value("Raw"));
    }

    @Test
    @WithMockUser
    @DisplayName("프로그램 목록 조회 API 테스트 (테스트용)")
    void getPrograms_Success() throws Exception {
        given(menuService.getAllPrograms()).willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/menus/test/programs")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.count").value(0));
    }

    @Test
    @WithMockUser
    @DisplayName("Raw 메뉴 조회 실패 테스트")
    void getRawMenus_Fail() throws Exception {
        given(menuService.getAllMenusCached()).willThrow(new RuntimeException("DB Error"));

        mockMvc.perform(get("/api/v1/menus/test/raw"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("DB Error"));
    }
}
