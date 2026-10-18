package nuri.api.controller.foundation.controller.system;

import nuri.business.test.BaseControllerTest;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import nuri.business.service.auth.AuthorManageService;
import nuri.business.service.auth.dto.AuthorManageDto;
import nuri.business.service.menu.MenuService;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("AuthorApiController 테스트")
class AuthorApiControllerTest extends BaseControllerTest {

    private AuthorManageService authorManageService;
    private MenuService menuService;

    @Override
    protected Object getController() {
        authorManageService = mock(AuthorManageService.class);
        menuService = mock(MenuService.class);
        return new AuthorApiController(authorManageService, menuService);
    }

    @Test
    @DisplayName("권한 그룹 목록 조회 성공")
    void testGetAuthors() throws Exception {
        // Given
        // 총건수는 목록과 같은 Page 에서 나온다. 검색을 무시하던 별도 count() 경로는 제거됐다.
        // ⚠ PageImpl 은 offset+pageSize > total 이면 total 을 content 기준으로 재계산하므로
        //   총건수를 페이지 크기보다 크게 잡아야 이 단언이 의미를 갖는다.
        when(authorManageService.selectAuthorList(any())).thenReturn(
                new org.springframework.data.domain.PageImpl<>(
                        java.util.List.of(new AuthorManageDto()),
                        org.springframework.data.domain.PageRequest.of(0, 10), 42));

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/authorities")
                .param("pageIndex", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.total").value(42));
    }

    @Test
    @DisplayName("권한 그룹 상세 조회 성공")
    void testGetAuthor() throws Exception {
        // Given
        AuthorManageDto dto = AuthorManageDto.builder()
                .authrtCd("ROLE_ADMIN")
                .authrtNm("관리자")
                .build();
        when(authorManageService.selectAuthor("ROLE_ADMIN")).thenReturn(dto);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/authorities/ROLE_ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.authrtCd").value("ROLE_ADMIN"));
    }

    @Test
    @DisplayName("권한별 메뉴 목록 조회")
    void testGetAuthorMenus() throws Exception {
        mockMvc.perform(get("/api/v1/admin/system/authorities/ROLE_USER/menus"))
                .andExpect(status().isOk());
    }
}