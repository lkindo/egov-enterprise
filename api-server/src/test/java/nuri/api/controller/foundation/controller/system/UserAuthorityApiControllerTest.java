package nuri.api.controller.foundation.controller.system;

import nuri.business.domain.auth.AuthorGroupProjection;
import nuri.business.service.auth.UserAuthorityManageService;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import nuri.business.security.annotation.WithMockCustomUser;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.hamcrest.Matchers.nullValue;
import nuri.business.support.ControllerTestSupport;

@WebMvcTest(UserAuthorityApiController.class)
@DisplayName("UserAuthorityApiController 단위 테스트")
class UserAuthorityApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private UserAuthorityManageService userAuthorityManageService;

    @MockitoBean
    private JPAQueryFactory jpaQueryFactory;

    @Test
    @WithMockCustomUser(role = "ADMIN")
    @DisplayName("사용자별 권한 목록 조회 테스트")
    void getUserAuthoritiesTest() throws Exception {
        Page<AuthorGroupProjection> page = new PageImpl<>(List.of(
                AuthorGroupProjection.builder()
                        .userId("user1")
                        .userNm("홍길동")
                        .mbrTypeCd("USR03")
                        .authrtId(null)
                        .regYn("N")
                        .scrtyDcsnTrgtId("USR_0001")
                        .build()));
        given(userAuthorityManageService.selectUserAuthorityList(eq("ROLE_ADMIN"), any())).willReturn(page);

        mockMvc.perform(get("/api/v1/admin/system/user-authorities")
                        .param("authorCode", "ROLE_ADMIN")
                        .param("pageIndex", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list").isArray())
                .andExpect(jsonPath("$.data.list[0].authrtId").value(nullValue()));

        verify(userAuthorityManageService).selectUserAuthorityList(eq("ROLE_ADMIN"), any());
    }

    @Test
    @WithMockCustomUser(role = "ADMIN")
    @DisplayName("사용자 권한 할당 저장 테스트")
    void saveUserAuthoritiesTest() throws Exception {
        mockMvc.perform(post("/api/v1/admin/system/user-authorities")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[{\"scrtyDcsnTrgtId\":\"USER1\", \"authrtId\":\"ROLE_ADMIN\"}]"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockCustomUser(role = "ADMIN")
    @DisplayName("사용자 권한 할당 삭제 테스트")
    void deleteUserAuthoritiesTest() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/system/user-authorities")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[\"USER1\", \"USER2\"]"))
                .andExpect(status().isOk());
    }
}
