package nuri.business.service.board.stats;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.board.BoardRepository;
import nuri.foundation.core.stats.PostStatisticsContributor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 통계 화면이 쓰는 게시글 집계를 게시판 도메인이 직접 센다.
 *
 * <p>종전에는 {@code ReportStatsService} 가 {@link BoardRepository} 를 인라인 FQN 으로 주입해
 * stats→board 결합을 만들었다(GAP-ARCH-001). 질의는 종전과 같은 두 개다 — 전체 행 수와
 * 날짜별 집계이며, 후자는 논리 삭제된 글을 제외한다({@code use_yn='Y'}). 이 변경은 경계만 옮기고
 * 세는 규칙을 바꾸지 않는다.
 */
@Component
@RequiredArgsConstructor
public class BoardPostStatisticsContributor implements PostStatisticsContributor {

    private final BoardRepository boardRepository;

    @Override
    public long countPosts() {
        return boardRepository.count();
    }

    @Override
    public List<Object[]> countPostsByDate(String from, String to) {
        return boardRepository.countPostsByDate(from, to);
    }
}
