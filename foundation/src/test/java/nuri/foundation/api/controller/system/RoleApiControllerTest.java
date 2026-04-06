package nuri.foundation.api.controller.system;

import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.foundation.service.auth.RoleManageService;
import nuri.foundation.service.auth.dto.RoleManageDto;
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

@DisplayName("RoleApiController 테스트")
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
        dto.setRoleCode("ROLE_WEB_001");
        dto.setRoleNm("웹 게시판 접근");
        when(roleManageService.selectRole("ROLE_WEB_001")).thenReturn(dto);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/roles/ROLE_WEB_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.roleCode").value("ROLE_WEB_001"));
    }

    @Test
    @DisplayName("롤 등록 성공")
    void testCreateRole() throws Exception {
        // Given
        RoleManageDto dto = new RoleManageDto();
        dto.setRoleCode("ROLE_NEW");
        dto.setRoleNm("신규 롤");

        // When & Then
        mockMvc.perform(post("/api/v1/admin/system/roles")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        verify(roleManageService, times(1)).insertRole(any(RoleManageDto.class));
    }

    @Test
    @DisplayName("롤 삭제 성공")
    void testDeleteRole() throws Exception {
        // When & Then
        mockMvc.perform(delete("/api/v1/admin/system/roles/ROLE_WEB_001"))
                .andExpect(status().isOk());

        verify(roleManageService, times(1)).deleteRole("ROLE_WEB_001");
    }
}