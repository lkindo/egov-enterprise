package nuri.api.controller.business.main;

import nuri.business.service.board.BoardService;
import nuri.business.service.board.BoardDashboardProvider;
import nuri.business.service.informalsanction.InformalSanctionService;
import nuri.business.service.informalsanction.InformalSanctionDashboardProvider;
import org.springframework.context.annotation.Import;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.business.support.ControllerTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.domain.PageImpl;
import nuri.business.security.annotation.WithMockCustomUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DashboardApiController.class)
// 대시보드 위젯은 DashboardItemProvider 포트로만 수집(§2.B) → 슬라이스 테스트에 실 provider 로드(mock 서비스 주입).
// board(할 일/공지)도 BoardDashboardProvider 로 역전됐으므로 함께 import 해야 taskList/notiList 가 채워진다.
@Import({InformalSanctionDashboardProvider.class, BoardDashboardProvider.class})
class DashboardApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private BoardService boardService;

    @MockitoBean
    private InformalSanctionService approvalService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("대시보드 조회 - 인증 실패 (401은 Security 필터 레벨에서 처리됨을 가정하거나 standalone이 아닐 때의 동작 확인)")
    void getDashboardData_unauthorized() throws Exception {
        // WithMockUser가 없는 상태에서 호출 시 Security 상주 시 401 혹은 403 리턴 기대
        mockMvc.perform(get("/api/v1/dashboard"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockCustomUser(username = "testUser", esntlId = "testUser")
    @DisplayName("대시보드 조회 - 성공 (전체 데이터)")
    void getDashboardData_success() throws Exception {
        // given
        when(boardService.getBoardPosts(anyString(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));
        when(approvalService.getReceivedInformalSanctionList(anyString(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));

        // when & then
        mockMvc.perform(get("/api/v1/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.taskList").isArray())
                .andExpect(jsonPath("$.data.pendingApprovalCount").value(0));
    }

    @Test
    @WithMockCustomUser(username = "testUser", esntlId = "testUser")
    @DisplayName("대시보드 조회 - 일부 서비스 예외 발생 시 회복성 검증")
    void getDashboardData_partialFailures() throws Exception {
        // given
        // When task board service fails
        when(boardService.getBoardPosts(eq("BBSMSTR_CCCCCCCCCCCC"), any())).thenThrow(new RuntimeException("Task DB Down"));
        // When notice board service works
        when(boardService.getBoardPosts(eq("BBSMSTR_AAAAAAAAAAAA"), any())).thenReturn(new PageImpl<>(Collections.emptyList()));
        // When approval service fails
        when(approvalService.getReceivedInformalSanctionList(anyString(), any())).thenThrow(new RuntimeException("Approval API Error"));

        // when & then
        mockMvc.perform(get("/api/v1/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.taskList").isEmpty())
                .andExpect(jsonPath("$.data.pendingApprovalCount").value(0));
        
        verify(boardService, times(2)).getBoardPosts(anyString(), any());
        verify(approvalService).getReceivedInformalSanctionList(anyString(), any());
    }
}
