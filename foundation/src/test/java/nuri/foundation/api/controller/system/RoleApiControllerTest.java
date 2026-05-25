package nuri.foundation.api.controller.system;

import nuri.foundation.test.BaseControllerTest;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import nuri.foundation.service.auth.RoleManageService;
import nuri.foundation.service.auth.dto.RoleManageDto;
import org.springframework.http.MediaType;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("RoleApiController 테스트")
class RoleApiControllerTest extends BaseControllerTest {

    private RoleManageService roleManageService;
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    @Override
    protected Object getController() {
        roleManageService = mock(RoleManageService.class);
        return new RoleApiController(roleManageService);
    }

    @Test
    @DisplayName("롤 목록 조회 성공")
    void testGetRoles() throws Exception {
        // Given
        when(roleManageService.selectRoleList(any())).thenReturn(Collections.emptyList());

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/roles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("롤 상세 조회 성공")
    void testGetRole() throws Exception {
        // Given
        RoleManageDto dto = new RoleManageDto();
        dto.setRoleId("ROLE_WEB_001");
        dto.setRoleNm("웹 게시판 접근");
        when(roleManageService.selectRole("ROLE_WEB_001")).thenReturn(dto);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/roles/ROLE_WEB_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.roleId").value("ROLE_WEB_001"));
    }

    @Test
    @DisplayName("롤 등록 성공")
    void testCreateRole() throws Exception {
        // Given
        RoleManageDto dto = new RoleManageDto();
        dto.setRoleId("ROLE_NEW");
        dto.setRoleNm("신규 롤");

        // When & Then
        mockMvc.perform(post("/api/v1/admin/system/roles")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        verify(roleManageService, times(1)).insertRole(any(RoleManageDto.class));
    }

    @Test
    @DisplayName("롤 수정 성공")
    void testUpdateRole() throws Exception {
        RoleManageDto dto = new RoleManageDto();
        dto.setRoleNm("Modified");
        mockMvc.perform(put("/api/v1/admin/system/roles/ROLE_WEB_001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
        verify(roleManageService).updateRole(any());
    }

    @Test
    @DisplayName("롤 삭제 성공")
    void testDeleteRole() throws Exception {
        // When & Then
        mockMvc.perform(delete("/api/v1/admin/system/roles/ROLE_WEB_001"))
                .andExpect(status().isOk());

        verify(roleManageService, times(1)).deleteRole("ROLE_WEB_001");
    }

    @Test
    @DisplayName("롤 다중 삭제")
    void testDeleteRoles() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/system/roles")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of("R1", "R2"))))
                .andExpect(status().isOk());
        verify(roleManageService).deleteRoles(any());
    }
}