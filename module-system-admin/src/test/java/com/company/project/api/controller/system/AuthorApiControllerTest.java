package com.company.project.api.controller.system;

import com.company.project.service.auth.AuthorManageService;
import com.company.project.service.auth.dto.AuthorManageDto;
import com.company.project.service.menu.MenuService;
import com.fasterxml.jackson.databind.ObjectMapper;
import egovframework.com.cmm.ComDefaultVO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import java.util.Collections;
import java.util.List;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthorApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("AuthorApiController 테스트")
class AuthorApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private AuthorManageService authorManageService;

    @MockitoBean
    private MenuService menuService;

    private final String BASE_URL = "/api/v1/admin/system/authorities";

    @Test
    @DisplayName("권한 목록 조회 성공")
    void getAuthors_Success() throws Exception {
        given(authorManageService.selectAuthorList(any(ComDefaultVO.class))).willReturn(Collections.emptyList());
        given(authorManageService.selectAuthorListTotCnt(any(ComDefaultVO.class))).willReturn(0);

        mockMvc.perform(get(BASE_URL)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list").isArray());
    }

    @Test
    @DisplayName("권한 상세 조회 성공")
    void getAuthor_Success() throws Exception {
        AuthorManageDto dto = new AuthorManageDto();
        dto.setAuthorCode("ROLE_ADMIN");
        dto.setAuthorNm("Administrator");
        given(authorManageService.selectAuthor(anyString())).willReturn(dto);

        mockMvc.perform(get(BASE_URL + "/ROLE_ADMIN")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.authorNm").value("Administrator"));
    }

    @Test
    @DisplayName("권한 등록 성공")
    void createAuthor_Success() throws Exception {
        AuthorManageDto dto = new AuthorManageDto();
        dto.setAuthorCode("ROLE_NEW");
        dto.setAuthorNm("New Role");

        mockMvc.perform(post(BASE_URL)
                        .with(csrf())
                        .content(objectMapper.writeValueAsString(dto))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("권한 수정 성공")
    void updateAuthor_Success() throws Exception {
        AuthorManageDto dto = new AuthorManageDto();
        dto.setAuthorCode("ROLE_ADMIN"); // authorCode is @NonNull
        dto.setAuthorNm("Updated Role");

        mockMvc.perform(put(BASE_URL + "/ROLE_ADMIN")
                        .with(csrf())
                        .content(objectMapper.writeValueAsString(dto))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("권한별 메뉴 조회 성공")
    void getAuthorMenus_Success() throws Exception {
        given(menuService.selectMenuCreatList(any())).willReturn(Collections.emptyList());

        mockMvc.perform(get(BASE_URL + "/ROLE_ADMIN/menus")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @DisplayName("권한 단일 삭제 성공")
    void deleteAuthor_Success() throws Exception {
        mockMvc.perform(delete(BASE_URL + "/ROLE_ADMIN")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("권한 다중 삭제 성공")
    void deleteAuthors_Success() throws Exception {
        List<String> codes = List.of("ROLE_ADMIN", "ROLE_USER");

        mockMvc.perform(delete(BASE_URL)
                        .with(csrf())
                        .content(objectMapper.writeValueAsString(codes))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
