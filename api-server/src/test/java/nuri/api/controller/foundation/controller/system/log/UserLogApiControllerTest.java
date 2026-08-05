package nuri.api.controller.foundation.controller.system.log;

import nuri.business.service.log.UserLogManageService;
import nuri.business.service.log.dto.UserLogDto;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.foundation.security.annotation.AdminOnly;
import nuri.foundation.security.annotation.AdminOrSystem;
import nuri.foundation.security.annotation.Authenticated;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.lang.reflect.Method;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("UserLogApiController 테스트")
class UserLogApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private UserLogManageService userLogManageService;

    @InjectMocks
    private UserLogApiController userLogApiController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(userLogApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    /**
     * 🔒 인가 등급을 <b>양방향</b>으로 못 박는다.
     *
     * <p>이 로그는 사용자 활동 집계라 웹·시스템·로그인 로그와 같은 {@code @AdminOrSystem} 등급이다.
     * 개인정보 로그({@code @AdminOnly})와 달리 내용이 개인정보가 아니므로 좁힐 이유가 없고,
     * 그렇다고 {@code @Authenticated} 로 열면 <b>일반 사용자가 타인의 활동 이력을 본다</b>.
     *
     * <p>standalone MockMvc 는 {@code @PreAuthorize} 를 강제하지 않으므로, 애노테이션을 지우거나
     * 바꿔도 기능 테스트는 전부 초록이다. 그래서 리플렉션으로 직접 단언한다.
     */
    @Test
    @DisplayName("🔒 사용자 로그 열람은 @AdminOrSystem 이다 — 완화(@Authenticated)·과잉협소(@AdminOnly) 양방향 차단")
    void userLogListMustBeAdminOrSystem() throws Exception {
        Method handler = UserLogApiController.class
                .getDeclaredMethod("getUserLogList", nuri.business.domain.common.BaseSearchDto.class);

        assertThat(handler.isAnnotationPresent(AdminOrSystem.class))
                .as("사용자 활동 로그는 웹·시스템·로그인 로그와 동일한 관리자/시스템 등급이다")
                .isTrue();
        assertThat(handler.isAnnotationPresent(Authenticated.class))
                .as("@Authenticated 는 인증만 보므로 일반 사용자가 타인의 활동 이력을 열람하게 된다")
                .isFalse();
        assertThat(handler.isAnnotationPresent(AdminOnly.class))
                .as("@AdminOnly 로 좁히면 SYSTEM 롤의 운영 모니터링이 막힌다 — 이 로그는 개인정보가 아니다")
                .isFalse();
    }

    /**
     * 이 테이블의 값은 식별자가 아니라 <b>행위 카운터</b>다. 카운터가 응답 봉투까지 실려 나오는지를
     * 단언한다 — 과거 화면이 존재하지도 않는 {@code creatDt} 를 그리고 카운터는 하나도 그리지 않았다.
     */
    @Test
    @DisplayName("사용자 로그 목록 조회 성공 — 행위 카운터 6종이 응답에 실린다")
    void testGetUserLogList() throws Exception {
        UserLogDto dto = UserLogDto.builder()
                .ocrnYmd("20260805")
                .dmndUserId("USRCNFRM_00000000001")
                .userNm("홍길동")
                .srvcNm("UserService")
                .mthdNm("selectUserList")
                .crtCnt(1).mdfcnCnt(2).inqCnt(30).delCnt(0).otptCnt(4).errCnt(5)
                .build();
        when(userLogManageService.selectUserLogList(any()))
                .thenReturn(new PageImpl<>(List.of(dto), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/v1/admin/system/logs/user").param("pageIndex", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].ocrnYmd").value("20260805"))
                .andExpect(jsonPath("$.data.list[0].userNm").value("홍길동"))
                .andExpect(jsonPath("$.data.list[0].inqCnt").value(30))
                .andExpect(jsonPath("$.data.list[0].errCnt").value(5));
    }

    /** 검색어가 서비스까지 도달하는지 — 목이 응답을 주므로 이 단언이 없으면 검색창이 죽어도 초록이다. */
    @Test
    @DisplayName("검색어가 서비스 계층까지 전달된다 — 파라미터 유실 차단")
    void testSearchKeywordReachesService() throws Exception {
        when(userLogManageService.selectUserLogList(any()))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        mockMvc.perform(get("/api/v1/admin/system/logs/user")
                        .param("pageIndex", "1")
                        .param("searchKeyword", "홍길동"))
                .andExpect(status().isOk());

        var captor = ArgumentCaptor.forClass(nuri.business.domain.common.BaseSearchDto.class);
        verify(userLogManageService).selectUserLogList(captor.capture());
        assertThat(captor.getValue().getSearchKeyword()).isEqualTo("홍길동");
    }
}
