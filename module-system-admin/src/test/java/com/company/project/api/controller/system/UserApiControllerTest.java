package com.company.project.api.controller.system;

import com.company.project.service.usermanagement.UserManageService;
import com.company.project.service.usermanagement.dto.UserManageDto;
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

@WebMvcTest(UserApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("UserApiController 테스트")
class UserApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserManageService userManageService;

    private final String BASE_URL = "/api/v1/admin/system/users";

    @Test
    @DisplayName("사용자 상세 조회 성공")
    void getUser_Success() throws Exception {
        given(userManageService.selectUser(anyString())).willReturn(
                UserManageDto.builder().userId("user1").userNm("User One").build()
        );

        mockMvc.perform(get(BASE_URL + "/user1")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userNm").value("User One"));
    }
}
