package com.company.project.api.controller.system;

import com.company.project.domain.auth.DeptAuthorProjection;
import com.company.project.service.auth.UserAuthorityManageService;
import com.company.project.service.auth.dto.UserAuthorityDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DeptAuthorityApiController.class)
@WithMockUser(roles = "ADMIN")
class DeptAuthorityApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserAuthorityManageService userAuthorityManageService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("부서별 권한 목록 조회 테스트")
    void getDeptAuthoritiesTest() throws Exception {
        DeptAuthorProjection projection = DeptAuthorProjection.builder()
                .userId("user1")
                .userNm("사용자1")
                .regYn("Y")
                .build();
        Page<DeptAuthorProjection> page = new PageImpl<>(Collections.singletonList(projection), PageRequest.of(0, 10), 1);

        given(userAuthorityManageService.selectDeptAuthorityList(anyString(), any())).willReturn(page);

        mockMvc.perform(get("/api/v1/admin/system/depts/DEPT01/authorities")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.resultList[0].userId").value("user1"));
    }

    @Test
    @DisplayName("부서 사용자 권한 일괄 저장 테스트")
    void saveDeptUserAuthoritiesTest() throws Exception {
        UserAuthorityDto dto = UserAuthorityDto.builder()
                .uniqId("USR01")
                .authorCode("ROLE_USER")
                .build();
        List<UserAuthorityDto> list = Collections.singletonList(dto);

        mockMvc.perform(post("/api/v1/admin/system/depts/DEPT01/authorities")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(list)))
                .andExpect(status().isOk());

        verify(userAuthorityManageService).saveUserAuthorities(any());
    }
}
