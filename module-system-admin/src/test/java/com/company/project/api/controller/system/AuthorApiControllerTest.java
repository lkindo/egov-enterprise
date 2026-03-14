package com.company.project.api.controller.system;

import com.company.project.service.auth.AuthorManageService;
import com.company.project.service.auth.dto.AuthorManageDto;
import com.company.project.service.menu.MenuService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthorApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("AuthorApiController 테스트")
class AuthorApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthorManageService authorManageService;

    @MockitoBean
    private MenuService menuService;

    private final String BASE_URL = "/api/v1/admin/system/authorities";

    @Test
    @DisplayName("권한 상세 조회 성공")
    void getAuthor_Success() throws Exception {
        given(authorManageService.selectAuthor(anyString())).willReturn(
                AuthorManageDto.builder().authorCode("ROLE_ADMIN").authorNm("Administrator").build()
        );

        mockMvc.perform(get(BASE_URL + "/ROLE_ADMIN")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.authorNm").value("Administrator"));
    }
}
