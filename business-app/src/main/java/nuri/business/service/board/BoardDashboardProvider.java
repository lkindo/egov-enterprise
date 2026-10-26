package nuri.business.service.board;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.core.config.BoardIdProperties;
import nuri.business.domain.board.exception.BoardErrorCode;
import nuri.business.service.board.dto.BoardDto;
import nuri.foundation.core.exception.BusinessException;
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
 * 이로써 board 도메인을 삭제해도
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
        putRecentPosts(result, "taskList", "taskListTotal", "taskListUnavailable", boardIdProperties.getTaskId());
        putRecentPosts(result, "notiList", "notiListTotal", "notiListUnavailable", boardIdProperties.getNoticeId());
    }

    /**
     * [2026-10-26 ADR-0043, SET-07] 지정 게시판을 사용 안 함으로 둔(또는 없는) 상태는 장애가 아니라 운영 상태다. 종전에는 조회 실패와
     * 같이 다뤄 카드가 '불러오지 못했습니다·잠시 후 다시'로 오안내했고 요청마다 오류 로그를 남겼다. 게시판 없음(BOARD_NOT_FOUND)만
     * 따로 잡아 목록을 비우고 '이용할 수 없음' 표지를 싣고 경고로만 남긴다. 전체 글 수는 비운다 — 0 은 '글이 없다'는 사실 주장이다.
     * 그 밖의 실패는 지금처럼 오류로 남기고 표지는 false 다(DEC-OPS-140 — 실패를 0건이나 운영 상태로 위장하지 않는다).
     */
    private void putRecentPosts(Map<String, Object> result, String listKey, String totalKey, String unavailableKey,
            String bbsId) {
        try {
            Page<BoardDto> page = boardService.getBoardPosts(bbsId, PageRequest.of(0, 5));
            result.put(listKey, page.getContent());
            result.put(totalKey, page.getTotalElements());
            result.put(unavailableKey, false);
        } catch (BusinessException e) {
            if (e.getErrorCode() != BoardErrorCode.BOARD_NOT_FOUND) {
                fail(result, listKey, totalKey, unavailableKey, e);
                return;
            }
            log.warn("업무 홈 {} 게시판을 지금 이용할 수 없습니다(사용 안 함이거나 없음).", listKey);
            result.put(listKey, List.of());
            result.put(totalKey, null);
            result.put(unavailableKey, true);
        } catch (Exception e) {
            fail(result, listKey, totalKey, unavailableKey, e);
        }
    }

    private static void fail(Map<String, Object> result, String listKey, String totalKey, String unavailableKey, Exception e) {
        log.error("Failed to fetch dashboard {}", listKey, e);
        result.put(listKey, List.of());
        result.put(totalKey, null);
        result.put(unavailableKey, false);
    }
}
