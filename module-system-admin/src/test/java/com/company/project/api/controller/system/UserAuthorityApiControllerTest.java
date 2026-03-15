package com.company.project.api.controller.system;

import com.company.project.domain.auth.AuthorGroupProjection;
import com.company.project.service.auth.UserAuthorityManageService;
import com.company.project.service.auth.dto.UserAuthorityDto;
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
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserAuthorityApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("UserAuthorityApiController 테스트")
class UserAuthorityApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private UserAuthorityManageService userAuthorityManageService;

    @MockitoBean
    private MenuService menuService;

    private final String BASE_URL = "/api/v1/admin/system/user-authorities";

    @Test
    @DisplayName("사용자별 권한 목록 조회 성공")
    void getUserAuthorities_Success() throws Exception {
        AuthorGroupProjection projection = AuthorGroupProjection.builder()
                .userId("user1")
                .userNm("테스터")
                .authorCode("ROLE_USER")
                .regYn("Y")
                .uniqId("USR_1234")
                .build();

        given(userAuthorityManageService.selectUserAuthorityList(any())).willReturn(
                new PageImpl<>(List.of(projection), PageRequest.of(0, 10), 1)
        );

        mockMvc.perform(get(BASE_URL)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].userId").value("user1"))
                .andExpect(jsonPath("$.data.list[0].regYn").value("Y"));
    }

    @Test
    @DisplayName("사용자 권한 할당 저장 성공")
    void saveUserAuthorities_Success() throws Exception {
        List<UserAuthorityDto> dtoList = List.of(
                UserAuthorityDto.builder()
                        .uniqId("USR_1234")
                        .authorCode("ROLE_ADMIN")
                        .mberTyCode("USR")
                        .build()
        );

        mockMvc.perform(post(BASE_URL)
                        .with(csrf())
                        .content(objectMapper.writeValueAsString(dtoList))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("사용자 권한 할당 삭제 성공")
    void deleteUserAuthorities_Success() throws Exception {
        List<String> uniqIds = List.of("USR_1234");

        mockMvc.perform(delete(BASE_URL)
                        .with(csrf())
                        .content(objectMapper.writeValueAsString(uniqIds))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
