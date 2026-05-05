package nuri.foundation.api.controller.system;

import nuri.foundation.domain.auth.AuthorGroupProjection;
import nuri.foundation.service.auth.UserAuthorityManageService;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserAuthorityApiController.class)
@DisplayName("UserAuthorityApiController 단위 테스트")
class UserAuthorityApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserAuthorityManageService userAuthorityManageService;

    @MockitoBean
    private JPAQueryFactory jpaQueryFactory;

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("사용자별 권한 목록 조회 테스트")
    void getUserAuthoritiesTest() throws Exception {
        Page<AuthorGroupProjection> page = new PageImpl<>(List.of());
        given(userAuthorityManageService.selectUserAuthorityList(any())).willReturn(page);

        mockMvc.perform(get("/api/v1/admin/system/user-authorities")
                        .param("pageIndex", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list").isArray());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("사용자 권한 할당 저장 테스트")
    void saveUserAuthoritiesTest() throws Exception {
        mockMvc.perform(post("/api/v1/admin/system/user-authorities")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[{\"uniqId\":\"USER1\", \"authorCode\":\"ROLE_ADMIN\"}]"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("사용자 권한 할당 삭제 테스트")
    void deleteUserAuthoritiesTest() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/system/user-authorities")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[\"USER1\", \"USER2\"]"))
                .andExpect(status().isOk());
    }
}