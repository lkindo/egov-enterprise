package com.company.project.api.controller.system;

import com.company.project.service.auth.RoleManageService;
import com.company.project.service.auth.dto.RoleManageDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RoleApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("RoleApiController 테스트")
class RoleApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private RoleManageService roleManageService;

    private final String BASE_URL = "/api/v1/admin/system/roles";

    @Test
    @DisplayName("롤 상세 조회 성공")
    void getRole_Success() throws Exception {
        given(roleManageService.selectRole(anyString())).willReturn(
                RoleManageDto.builder().roleCode("ROLE_USER").roleNm("User").build()
        );

        mockMvc.perform(get(BASE_URL + "/ROLE_USER")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.roleNm").value("User"));
    }

    @Test
    @DisplayName("롤 다중 삭제 성공")
    void deleteRoles_Success() throws Exception {
        List<String> codes = List.of("ROLE_USER", "ROLE_ADMIN");

        mockMvc.perform(delete(BASE_URL)
                        .with(csrf())
                        .content(objectMapper.writeValueAsString(codes))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
