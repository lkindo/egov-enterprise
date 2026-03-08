package com.company.project.api.controller.menu;

import com.company.project.service.menu.MenuService;
import com.company.project.service.menu.dto.MenuDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import java.util.ArrayList;
import java.util.List;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@org.junit.jupiter.api.Disabled
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class MenuApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MenuService menuService;

    @Test
    @DisplayName("메뉴 전체 트리 조회 API 테스트")
    void getMenuHierarchyApiTest() throws Exception {
        // Given
        List<MenuDto> mockHierarchy = new ArrayList<>();
        mockHierarchy.add(MenuDto.builder().id(1L).menuNm("System").build());
        given(menuService.getAllMenus()).willReturn(mockHierarchy);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/menus/all")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].menuNm").value("System"));
    }

    @Test
    @DisplayName("메뉴 상세 조회 API 테스트")
    void getMenuDetailApiTest() throws Exception {
        // Given
        MenuDto dto = MenuDto.builder().id(100L).menuNm("Detail Menu").build();
        given(menuService.selectMenuManage(100L)).willReturn(dto);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/menus/100")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.menuNm").value("Detail Menu"));
    }
}
