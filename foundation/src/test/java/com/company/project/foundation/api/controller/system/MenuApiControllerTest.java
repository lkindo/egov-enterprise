package com.company.project.foundation.api.controller.system;

import com.company.project.foundation.core.exception.GlobalExceptionHandler;
import com.company.project.foundation.service.menu.MenuService;
import com.company.project.foundation.service.menu.dto.MenuDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("MenuApiController ?岇姢??)
class MenuApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private MenuService menuService;

    @InjectMocks
    private MenuApiController menuApiController;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(menuApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new org.springframework.data.web.PageableHandlerMethodArgumentResolver())
                .build();
    }

    @Test
    @DisplayName("氅旊壌 氇╇ 臁绊殞 ?标车")
    void testGetMenuList() throws Exception {
        // Given
        when(menuService.selectMenuManageList(any())).thenReturn(Collections.emptyList());
        when(menuService.selectMenuManageListTotCnt(any())).thenReturn(0);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/menus")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("氅旊壌 ?侅劯 臁绊殞 ?标车")
    void testGetMenu() throws Exception {
        // Given
        MenuDto dto = MenuDto.builder()
                .menuNo(100L)
                .menuNm("Test Menu")
                .build();
        when(menuService.selectMenuManage(100L)).thenReturn(dto);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/menus/100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.menuNo").value(100));
    }

    @Test
    @DisplayName("氅旊壌 ?彪 ?标车")
    void testCreateMenu() throws Exception {
        // Given
        MenuDto dto = MenuDto.builder()
                .menuNo(100L)
                .menuNm("New Menu")
                .build();

        // When & Then
        mockMvc.perform(post("/api/v1/admin/system/menus")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        verify(menuService, times(1)).insertMenuManage(any(MenuDto.class));
    }

    @Test
    @DisplayName("甓岉暅氤?氅旊壌 ?犽嫻 ?�???标车")
    void testCreateMenuCreation() throws Exception {
        // Given
        List<Long> menuNos = Arrays.asList(100L, 200L);

        // When & Then
        mockMvc.perform(post("/api/v1/admin/system/menus/creation/ROLE_ADMIN")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(menuNos)))
                .andExpect(status().isOk());

        verify(menuService, times(1)).insertMenuCreatList(eq("ROLE_ADMIN"), eq("100,200"));
    }
}
