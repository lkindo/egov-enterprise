package com.company.project.api.controller.system;

import com.company.project.domain.auth.AuthorRoleProjection;
import com.company.project.service.auth.AuthorRoleManageService;
import com.company.project.service.menu.MenuService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthorRoleApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("AuthorRoleApiController 테스트")
class AuthorRoleApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private AuthorRoleManageService authorRoleManageService;

    @MockitoBean
    private MenuService menuService;

    private final String BASE_URL = "/api/v1/admin/system/authorities/ROLE_ADMIN/roles";

    @Test
    @DisplayName("권한별 롤 목록 조회 성공")
    void getAuthorRoles_Success() throws Exception {
        AuthorRoleProjection projection = AuthorRoleProjection.builder()
                .authorCode("ROLE_ADMIN")
                .roleCode("ROLE_USER")
                .roleNm("일반사용자")
                .regYn("Y")
                .build();

        given(authorRoleManageService.selectAuthorRoleList(eq("ROLE_ADMIN"), any())).willReturn(
                new PageImpl<>(List.of(projection), PageRequest.of(0, 10), 1)
        );

        mockMvc.perform(get(BASE_URL)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.resultList[0].roleNm").value("일반사용자"))
                .andExpect(jsonPath("$.data.resultList[0].regYn").value("Y"));
    }

    @Test
    @DisplayName("권한별 롤 할당 저장 성공")
    void saveAuthorRoles_Success() throws Exception {
        List<String> roleCodes = List.of("ROLE_USER", "ROLE_AUTH");

        mockMvc.perform(post(BASE_URL)
                        .with(csrf())
                        .content(objectMapper.writeValueAsString(roleCodes))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
