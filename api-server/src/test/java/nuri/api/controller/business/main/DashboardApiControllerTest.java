package nuri.api.controller.business.main;

import nuri.business.service.board.BoardService;
import nuri.business.service.board.BoardDashboardProvider;
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
// 대시보드 위젯은 DashboardItemProvider 포트로만 수집(§2.B) → board(할 일/공지) provider 로드(mock 서비스 주입).
// (샘플 도메인 informalsanction 제거로 '결재대기' 위젯 provider 는 함께 삭제됨 — 재사용 base 는 board 위젯만 기본 탑재.)
@Import(BoardDashboardProvider.class)
class DashboardApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private BoardService boardService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("대시보드 조회 - 인증 실패 (401)")
    void getDashboardData_unauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockCustomUser(username = "testUser", esntlId = "testUser")
    @DisplayName("대시보드 조회 - 성공 (board 위젯 수집)")
    void getDashboardData_success() throws Exception {
        // given
        when(boardService.getBoardPosts(anyString(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));

        // when & then
        mockMvc.perform(get("/api/v1/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.taskList").isArray());
    }

    @Test
    @WithMockCustomUser(username = "testUser", esntlId = "testUser")
    @DisplayName("대시보드 조회 - 일부 provider 예외 발생 시 회복성 검증")
    void getDashboardData_partialFailures() throws Exception {
        // given: 할 일 board 는 실패, 공지 board 는 정상
        when(boardService.getBoardPosts(eq("BBSMSTR_CCCCCCCCCCCC"), any())).thenThrow(new RuntimeException("Task DB Down"));
        when(boardService.getBoardPosts(eq("BBSMSTR_AAAAAAAAAAAA"), any())).thenReturn(new PageImpl<>(Collections.emptyList()));

        // when & then: provider 예외가 전체 응답을 파괴하지 않음
        mockMvc.perform(get("/api/v1/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.taskList").isEmpty());

        verify(boardService, times(2)).getBoardPosts(anyString(), any());
    }
}
