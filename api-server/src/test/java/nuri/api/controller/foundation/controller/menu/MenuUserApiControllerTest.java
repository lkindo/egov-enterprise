package nuri.api.controller.foundation.controller.menu;

import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.business.service.menu.MenuService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.ArrayList;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("MenuUserApiController 테스트")
class MenuUserApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private MenuService menuService;

    @InjectMocks
    private MenuUserApiController menuUserApiController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(menuUserApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GNB 메인 메뉴 목록 조회 성공")
    void getHeadMenu_Success() throws Exception {
        given(menuService.getMenuHierarchy()).willReturn(new ArrayList<>());

        mockMvc.perform(get("/api/v1/menus/head"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list").exists());
    }

    @Test
    @DisplayName("특정 메뉴의 하위 메뉴 목록 조회 성공")
    void getLeftMenu_Success() throws Exception {
        given(menuService.getSubMenus(anyLong())).willReturn(new ArrayList<>());

        mockMvc.perform(get("/api/v1/menus/left").param("menuNo", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("[보안] 권한 필터를 우회하던 디버그 덤프 핸들러가 컨트롤러에 존재하지 않는다")
    void debugDumpEndpoints_Removed() {
        // /test/raw·/test/programs 는 인증만 통과하면 비활성 메뉴·관리자 전용 라우트와 전체 프로그램을
        // 그대로 덤프해 정찰 창구가 됐다. 재추가 방지 가드.
        // (standalone MockMvc 는 미매핑 경로에 404 가 아닌 500 을 내므로 요청이 아니라 매핑 자체를 검사한다)
        boolean hasDebugMapping = java.util.Arrays.stream(MenuUserApiController.class.getDeclaredMethods())
                .map(m -> m.getAnnotation(org.springframework.web.bind.annotation.GetMapping.class))
                .filter(java.util.Objects::nonNull)
                .flatMap(a -> java.util.Arrays.stream(a.value()))
                .anyMatch(path -> path.contains("/test"));

        org.assertj.core.api.Assertions.assertThat(hasDebugMapping)
                .as("컨트롤러 매핑 경로에 /test 세그먼트가 있으면 디버그 엔드포인트가 되살아난 것이다")
                .isFalse();
    }
}
