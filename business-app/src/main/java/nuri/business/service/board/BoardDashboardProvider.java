package nuri.business.service.board;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.service.board.dto.BoardDto;
import nuri.foundation.core.dashboard.DashboardItemProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * 게시판(할 일/공지) 대시보드 위젯 데이터 프로바이더 어댑터 — §2.B 결합 역전.
 *
 * <p>종전 {@code DashboardApiController}(필수 메인 대시보드)가 {@code BoardService}(샘플 도메인)를
 * 직접 주입·호출하던 결합을, 이미 존재하는 {@link DashboardItemProvider} 포트(DIP)로 역전한다.
 * ({@code InformalSanctionDashboardProvider} 와 동일 패턴.) 이로써 board 도메인을 삭제해도
 * 필수 대시보드 컨트롤러가 컴파일 붕괴하지 않는다(프레임워크 재사용성).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BoardDashboardProvider implements DashboardItemProvider {

    /** 할 일 게시판(공통) 식별자. */
    private static final String TASK_BOARD_ID = "BBSMSTR_CCCCCCCCCCCC";
    /** 공지사항 게시판 식별자. */
    private static final String NOTICE_BOARD_ID = "BBSMSTR_AAAAAAAAAAAA";

    private final BoardService boardService;

    @Override
    public void provideDashboardData(String userId, Map<String, Object> result) {
        try {
            Page<BoardDto> taskList = boardService.getBoardPosts(TASK_BOARD_ID, PageRequest.of(0, 5));
            result.put("taskList", taskList.getContent());
        } catch (Exception e) {
            log.error("Failed to fetch task list", e);
            result.put("taskList", List.of());
        }
        try {
            Page<BoardDto> notiList = boardService.getBoardPosts(NOTICE_BOARD_ID, PageRequest.of(0, 5));
            result.put("notiList", notiList.getContent());
        } catch (Exception e) {
            log.error("Failed to fetch notice list", e);
            result.put("notiList", List.of());
        }
    }
}
