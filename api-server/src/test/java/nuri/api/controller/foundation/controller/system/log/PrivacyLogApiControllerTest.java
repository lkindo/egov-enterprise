package nuri.api.controller.foundation.controller.system.log;

import nuri.business.service.log.PrivacyLogManageService;
import nuri.business.service.log.dto.PrivacyLogDto;
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
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("PrivacyLogApiController 테스트")
class PrivacyLogApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private PrivacyLogManageService privacyLogManageService;

    @InjectMocks
    private PrivacyLogApiController privacyLogApiController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(privacyLogApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    /**
     * 🔒 <b>이 테스트가 이 컨트롤러의 존재 이유를 지킨다.</b>
     *
     * <p>개인정보 조회 로그는 내용 자체가 개인정보라 열람 권한을 {@code @AdminOnly}(ADMIN 전용)로
     * 좁혔다 — 다른 로그 화면이 쓰는 {@code @AdminOrSystem} 보다 한 단계 좁다(2026-08-05 사용자 결정).
     *
     * <p>그 결정은 <b>애노테이션 한 줄</b>에 걸려 있고, 누군가 "다른 로그와 통일하자" 며
     * {@code @AdminOrSystem} 으로 바꾸면 <b>SYSTEM 롤에게 개인정보 접근 기록이 열린다</b> —
     * 그런데 기능 테스트는 전부 그대로 통과한다(standalone MockMvc 는 {@code @PreAuthorize} 를
     * 강제하지 않는다). 그래서 애노테이션의 존재를 리플렉션으로 직접 못 박는다.
     */
    @Test
    @DisplayName("🔒 개인정보 로그 열람은 @AdminOnly 다 — 완화(@AdminOrSystem/@Authenticated) 차단")
    void privacyLogListMustBeAdminOnly() throws Exception {
        Method handler = PrivacyLogApiController.class
                .getDeclaredMethod("getPrivacyLogList", nuri.business.domain.common.BaseSearchDto.class);

        assertThat(handler.isAnnotationPresent(AdminOnly.class))
                .as("개인정보 조회 로그는 ADMIN 전용이어야 한다 — 이 로그의 내용 자체가 개인정보다")
                .isTrue();
        assertThat(handler.isAnnotationPresent(AdminOrSystem.class))
                .as("@AdminOrSystem 은 SYSTEM 롤을 통과시킨다 — 개인정보 접근 기록에는 넓다")
                .isFalse();
        assertThat(handler.isAnnotationPresent(Authenticated.class))
                .as("@Authenticated 는 인증만 보면 되므로 일반 사용자에게 열린다")
                .isFalse();
    }

    @Test
    @DisplayName("개인정보 로그 목록 조회 성공 — 페이지 봉투와 항목이 그대로 실린다")
    void testGetPrivacyLogList() throws Exception {
        PrivacyLogDto dto = PrivacyLogDto.builder()
                .dmndId("REQ_001")
                .inqDt(LocalDateTime.of(2026, 8, 5, 10, 0))
                .srvcNm("UserService.getUser")
                .inqInfo("주민등록번호")
                .dmndUserId("admin")
                .dmndUserIpAddr("10.0.0.1")
                .build();
        when(privacyLogManageService.selectPrivacyLogList(any()))
                .thenReturn(new PageImpl<>(List.of(dto), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/v1/admin/system/logs/privacy").param("pageIndex", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].dmndId").value("REQ_001"))
                .andExpect(jsonPath("$.data.list[0].inqInfo").value("주민등록번호"));
    }

    /** 검색어가 서비스까지 도달하는지 — 목이 응답을 주므로 이 단언이 없으면 검색창이 죽어도 초록이다. */
    @Test
    @DisplayName("검색어가 서비스 계층까지 전달된다 — 파라미터 유실 차단")
    void testSearchKeywordReachesService() throws Exception {
        when(privacyLogManageService.selectPrivacyLogList(any()))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        mockMvc.perform(get("/api/v1/admin/system/logs/privacy")
                        .param("pageIndex", "1")
                        .param("searchKeyword", "주민등록번호"))
                .andExpect(status().isOk());

        var captor = ArgumentCaptor.forClass(nuri.business.domain.common.BaseSearchDto.class);
        verify(privacyLogManageService).selectPrivacyLogList(captor.capture());
        assertThat(captor.getValue().getSearchKeyword()).isEqualTo("주민등록번호");
    }
}
