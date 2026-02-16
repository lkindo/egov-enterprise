package com.company.project.web;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasSize;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import com.company.project.service.board.BoardService;
import com.company.project.service.menu.MenuService;
import com.company.project.service.menu.dto.MenuDto;
import egovframework.com.cmm.EgovComponentChecker;
import egovframework.com.cmm.service.EgovUserDetailsService;

@WebMvcTest(controllers = MainController.class,
    includeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {MainController.class}))
public class MainControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean(name = "menuService")
    private MenuService menuService;

    @MockBean(name = "egovBoardService")
    private BoardService boardService;

    // EgovUserDetailsHelper might look for this bean
    @MockBean(name = "egovUserDetailsService")
    private EgovUserDetailsService egovUserDetailsService;

    @Test
    public void testSelectHeader_Unauthenticated_ShouldReturnEmptyMenus() throws Exception {
        // Given: Unauthenticated user (no @WithMockUser)
        // Note: Even if menuService returns data, the controller should NOT put it in the model
        given(menuService.getMenuHierarchy()).willReturn(Arrays.asList(new MenuDto()));
        given(menuService.getAllMenus()).willReturn(Arrays.asList(new MenuDto()));

        // When & Then
        mockMvc.perform(get("/sym/mms/EgovHeader.do"))
                .andExpect(status().isOk())
                .andExpect(view().name("main/inc/EgovIncHeader"))
                // Expect empty lists for unauthenticated users
                .andExpect(model().attribute("list_headmenu", empty()))
                .andExpect(model().attribute("list_menulist", empty()));
    }

    @Test
    @WithMockUser(username = "testuser", roles = "USER")
    public void testSelectHeader_Authenticated_ShouldReturnMenus() throws Exception {
        // Given: Authenticated user
        List<MenuDto> menuList = new ArrayList<>();
        menuList.add(new MenuDto());
        given(menuService.getMenuHierarchy()).willReturn(menuList);
        given(menuService.getAllMenus()).willReturn(menuList);

        // When & Then
        mockMvc.perform(get("/sym/mms/EgovHeader.do"))
                .andExpect(status().isOk())
                .andExpect(view().name("main/inc/EgovIncHeader"))
                // Expect populated lists for authenticated users
                .andExpect(model().attribute("list_headmenu", hasSize(1)))
                .andExpect(model().attribute("list_menulist", hasSize(1)));
    }
}
