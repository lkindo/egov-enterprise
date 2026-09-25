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

    /**
     * 업무게시판·공지의 최근 5건과 게시판 전체 글 수를 싣는다.
     *
     * <p>[2026-09-26 DIP V1] 조회가 실패하면 목록은 비우되 전체 글 수는 {@code null} 로 둔다. 종전에는 실패를
     * 빈 목록으로만 삼켜 화면이 "등록된 글이 없습니다·0건" 이라는 사실 주장을 했다 — 조회 실패와 글 없음이
     * 같은 모양이었다. 전체 글 수는 목록 길이(늘 5 이하)가 아니라 게시판의 실제 글 수다.</p>
     */
    @Override
    public void provideDashboardData(String userId, Map<String, Object> result) {
        putRecentPosts(result, "taskList", "taskListTotal", boardIdProperties.getTaskId());
        putRecentPosts(result, "notiList", "notiListTotal", boardIdProperties.getNoticeId());
    }

    private void putRecentPosts(Map<String, Object> result, String listKey, String totalKey, String bbsId) {
        try {
            Page<BoardDto> page = boardService.getBoardPosts(bbsId, PageRequest.of(0, 5));
            result.put(listKey, page.getContent());
            result.put(totalKey, page.getTotalElements());
        } catch (Exception e) {
            log.error("Failed to fetch dashboard {}", listKey, e);
            result.put(listKey, List.of());
            result.put(totalKey, null);
        }
    }
}
