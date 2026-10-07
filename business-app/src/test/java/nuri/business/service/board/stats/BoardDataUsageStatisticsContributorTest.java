package nuri.business.service.board.stats;

import nuri.business.domain.board.DtaUseStatsRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
@DisplayName("BoardDataUsageStatisticsContributor 단위 테스트")
class BoardDataUsageStatisticsContributorTest {

    @Mock
    private DtaUseStatsRepository dtaUseStatsRepository;

    @InjectMocks
    private BoardDataUsageStatisticsContributor contributor;

    /** 경계만 옮긴 변경이므로 기간 문자열은 가공 없이 그대로 전달한다. */
    @Test
    @DisplayName("날짜별 자료 이용 집계는 받은 기간 문자열을 그대로 전달한다")
    void delegatesDateRangeVerbatim() {
        List<Object[]> rows = List.<Object[]>of(new Object[] { "2026-09-01", 3L });
        given(dtaUseStatsRepository.countByDate("2026-09-01 00:00:00", "2026-10-01 00:00:00"))
                .willReturn(rows);

        assertThat(contributor.countDataUsageByDate("2026-09-01 00:00:00", "2026-10-01 00:00:00"))
                .isSameAs(rows);
    }
}
