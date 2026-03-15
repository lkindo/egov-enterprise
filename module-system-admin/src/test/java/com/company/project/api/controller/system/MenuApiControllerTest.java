package com.company.project.api.controller.system;

import com.company.project.service.menu.MenuService;
import com.company.project.service.menu.dto.MenuDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MenuApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("MenuApiController 테스트")
class MenuApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private MenuService menuService;

    private static final String BASE_URL = "/api/v1/admin/system/menus";

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("메뉴 목록 조회 API 테스트")
    void getMenuList_Success() throws Exception {
        given(menuService.selectMenuManageList(any())).willReturn(Collections.singletonList(MenuDto.builder().menuNo(1L).build()));
        given(menuService.selectMenuManageListTotCnt(any())).willReturn(1);

        mockMvc.perform(get(BASE_URL)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("메뉴 상세 조회 API 테스트")
    void getMenu_Success() throws Exception {
        MenuDto dto = MenuDto.builder().menuNo(1L).menuNm("Test Menu").build();
        given(menuService.selectMenuManage(1L)).willReturn(dto);

        mockMvc.perform(get(BASE_URL + "/1")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.menuNm").value("Test Menu"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("메뉴 등록 API 테스트")
    void createMenu_Success() throws Exception {
        MenuDto dto = MenuDto.builder().menuNo(2L).menuNm("New Menu").build();

        mockMvc.perform(post(BASE_URL)
                        .with(csrf())
                        .content(objectMapper.writeValueAsString(dto))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
