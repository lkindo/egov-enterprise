package com.company.project.foundation.api.controller.system;

import com.company.project.foundation.core.exception.GlobalExceptionHandler;
import com.company.project.foundation.service.auth.RoleManageService;
import com.company.project.foundation.service.auth.dto.RoleManageDto;
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

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("RoleApiController ?岇姢??)
class RoleApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private RoleManageService roleManageService;

    @InjectMocks
    private RoleApiController roleApiController;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(roleApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("搿?氇╇ 臁绊殞 ?标车")
    void testGetRoles() throws Exception {
        // Given
        when(roleManageService.selectRoleList(any())).thenReturn(Collections.emptyList());
        when(roleManageService.selectRoleListTotCnt(any())).thenReturn(0);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/roles")
                .param("pageIndex", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("搿??侅劯 臁绊殞 ?标车")
    void testGetRole() throws Exception {
        // Given
        RoleManageDto dto = new RoleManageDto();
        dto.setRoleCode("ROLE_WEB_001");
        dto.setRoleNm("???戧芳 甓岉暅");
        when(roleManageService.selectRole("ROLE_WEB_001")).thenReturn(dto);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/roles/ROLE_WEB_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.roleCode").value("ROLE_WEB_001"));
    }

    @Test
    @DisplayName("搿??彪 ?标车")
    void testCreateRole() throws Exception {
        // Given
        RoleManageDto dto = new RoleManageDto();
        dto.setRoleCode("ROLE_NEW");
        dto.setRoleNm("?犼窚 搿?);

        // When & Then
        mockMvc.perform(post("/api/v1/admin/system/roles")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        verify(roleManageService, times(1)).insertRole(any(RoleManageDto.class));
    }

    @Test
    @DisplayName("搿???牅 ?标车")
    void testDeleteRole() throws Exception {
        // When & Then
        mockMvc.perform(delete("/api/v1/admin/system/roles/ROLE_WEB_001"))
                .andExpect(status().isOk());

        verify(roleManageService, times(1)).deleteRole("ROLE_WEB_001");
    }
}
