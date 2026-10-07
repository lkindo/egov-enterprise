package nuri.business.service.board.stats;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.board.DtaUseStatsRepository;
import nuri.foundation.core.stats.DataUsageStatisticsContributor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 통계 화면이 쓰는 자료 이용 집계를 게시판 도메인이 직접 센다.
 *
 * <p>종전에는 {@code ReportStatsService} 가 {@link DtaUseStatsRepository} 를 주입해, 게시판이 빠진 구성에서도
 * 통계가 게시판 데이터를 끌고 다녔다. 질의는 종전과 같다 — 날짜 내림차순, 반개방 구간이다. 이 변경은
 * 경계만 옮기고 세는 규칙을 바꾸지 않는다.
 *
 * <p>게시글 집계 포트 구현({@link BoardPostStatisticsContributor})과 파일을 나눈 것은 의도다 — 게시물 통계가
 * 자료 이용 질의를 다시 부르던 결함(2026-08-28)이 같은 파일 안에서 되살아나지 않게 계약이 그 파일을 따로 본다.
 */
@Component
@RequiredArgsConstructor
public class BoardDataUsageStatisticsContributor implements DataUsageStatisticsContributor {

    private final DtaUseStatsRepository dtaUseStatsRepository;

    @Override
    public List<Object[]> countDataUsageByDate(String from, String to) {
        return dtaUseStatsRepository.countByDate(from, to);
    }
}
