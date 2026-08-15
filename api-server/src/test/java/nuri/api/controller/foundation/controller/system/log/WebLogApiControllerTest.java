package nuri.api.controller.foundation.controller.system.log;

import nuri.business.service.log.WebLogManageService;
import nuri.business.service.log.dto.WebLogDto;
import nuri.foundation.core.exception.GlobalExceptionHandler;
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

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("WebLogApiController 테스트")
class WebLogApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private WebLogManageService webLogManageService;

    @InjectMocks
    private WebLogApiController webLogApiController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(webLogApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("웹 로그 목록 조회 성공 — 페이지 봉투와 항목이 그대로 실린다")
    void testGetWebLogList() throws Exception {
        WebLogDto dto = WebLogDto.builder()
                .webLogSn(101L)
                .url("/api/v1/boards")
                .dmndUserId("admin")
                .dmndUserIpAddr("10.0.0.1")
                .occrYmd("20260805")
                .prcsTm(42L)
                .build();
        when(webLogManageService.selectWebLogList(any()))
                .thenReturn(new PageImpl<>(List.of(dto), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/v1/admin/system/logs/web").param("pageIndex", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].webLogSn").value(101))
                .andExpect(jsonPath("$.data.list[0].url").value("/api/v1/boards"));
    }

    /**
     * 검색어가 서비스까지 도달하는지 본다.
     *
     * <p>이 단언이 없으면 컨트롤러가 파라미터를 흘려도 목록 조회는 성공하므로(목이 응답을 주니까)
     * 초록이 된다 — 화면의 검색창이 아무 일도 하지 않는 상태를 통과시키는 형태다.
     */
    @Test
    @DisplayName("검색어가 서비스 계층까지 전달된다 — 파라미터 유실 차단")
    void testSearchKeywordReachesService() throws Exception {
        when(webLogManageService.selectWebLogList(any()))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        mockMvc.perform(get("/api/v1/admin/system/logs/web")
                        .param("pageIndex", "1")
                        .param("searchKeyword", "/api/v1/boards"))
                .andExpect(status().isOk());

        var captor = ArgumentCaptor.forClass(nuri.business.domain.common.BaseSearchDto.class);
        verify(webLogManageService).selectWebLogList(captor.capture());
        assertThat(captor.getValue().getSearchKeyword()).isEqualTo("/api/v1/boards");
    }
}
