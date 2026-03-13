package com.company.project.api.controller.system;

import com.company.project.service.menu.MenuService;
import com.company.project.service.menu.dto.MenuDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import java.util.Collections;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MenuAdminController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("MenuAdminController 테스트")
class MenuAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MenuService menuService;

    private final String BASE_URL = "/api/v1/admin/system/menus";

    @Test
    @DisplayName("메뉴 전체 트리 조회 성공")
    void getAllMenus_Success() throws Exception {
        given(menuService.getAllMenus()).willReturn(Collections.singletonList(
                MenuDto.builder().menuNo(1L).menuNm("System").build()
        ));

        mockMvc.perform(get(BASE_URL + "/all")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].menuNm").value("System"));
    }

    @Test
    @DisplayName("메뉴 상세 조회 성공")
    void getMenu_Success() throws Exception {
        given(menuService.selectMenuManage(anyLong())).willReturn(
                MenuDto.builder().menuNo(100L).menuNm("Detail").build()
        );

        mockMvc.perform(get(BASE_URL + "/100")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.menuNm").value("Detail"));
    }
}
