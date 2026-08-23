package nuri.business.service.board;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.core.config.BoardIdProperties;
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

    private final BoardService boardService;
    /** 게시판 인스턴스 ID 설정({@code nuri.boards.*}) — 리터럴 하드코딩을 설정 소비로 역전(기본값=종전 리터럴). */
    private final BoardIdProperties boardIdProperties;

    @Override
    public void provideDashboardData(String userId, Map<String, Object> result) {
        try {
            Page<BoardDto> taskList = boardService.getBoardPosts(boardIdProperties.getTaskId(), PageRequest.of(0, 5));
            result.put("taskList", taskList.getContent());
        } catch (Exception e) {
            log.error("Failed to fetch task list", e);
            result.put("taskList", List.of());
        }
        try {
            Page<BoardDto> notiList = boardService.getBoardPosts(boardIdProperties.getNoticeId(), PageRequest.of(0, 5));
            result.put("notiList", notiList.getContent());
        } catch (Exception e) {
            log.error("Failed to fetch notice list", e);
            result.put("notiList", List.of());
        }
    }
}
