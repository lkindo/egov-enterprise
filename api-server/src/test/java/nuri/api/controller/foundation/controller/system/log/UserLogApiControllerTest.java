package nuri.api.controller.foundation.controller.system.log;

import nuri.business.service.log.UserLogManageService;
import nuri.business.service.log.dto.UserLogDto;
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

    /** Permission is explicit; the SYSTEM privacy exclusion does not apply to activity counters. */
    @Test
    @DisplayName("사용자 활동 로그는 명시적 조회 권한으로 허용하고 무권한 그룹은 거부한다")
    void userLogListMustBeAdminOrSystem() throws Exception {
        nuri.security.support.MethodPermissionContract.assertOperation(UserLogApiController.class
                .getDeclaredMethod("getUserLogList", nuri.business.domain.common.BaseSearchDto.class), "USER_LOG_READ", false);
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
