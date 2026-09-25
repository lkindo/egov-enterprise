package nuri.business.service.board.stats;

import nuri.business.domain.board.BoardRepository;
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
@DisplayName("BoardPostStatisticsContributor 단위 테스트")
class BoardPostStatisticsContributorTest {

    @Mock
    private BoardRepository boardRepository;

    @InjectMocks
    private BoardPostStatisticsContributor contributor;

    @Test
    @DisplayName("전체 게시글 수는 게시판 저장소의 행 수다")
    void countsAllPosts() {
        given(boardRepository.count()).willReturn(41L);

        assertThat(contributor.countPosts()).isEqualTo(41L);
    }

    /** 경계만 옮긴 변경이므로 기간 문자열은 가공 없이 그대로 전달한다. */
    @Test
    @DisplayName("날짜별 집계는 받은 기간 문자열을 그대로 전달한다")
    void delegatesDateRangeVerbatim() {
        List<Object[]> rows = List.<Object[]>of(new Object[] { "2026-09-01", 3L });
        given(boardRepository.countPostsByDate("2026-09-01 00:00:00", "2026-10-01 00:00:00"))
                .willReturn(rows);

        assertThat(contributor.countPostsByDate("2026-09-01 00:00:00", "2026-10-01 00:00:00"))
                .isSameAs(rows);
    }

    @Test
    @DisplayName("기간 건수는 받은 기간 문자열을 그대로 전달한다")
    void delegatesBetweenCountVerbatim() {
        given(boardRepository.countPostsBetween("2026-09-25 00:00:00", "2026-09-26 00:00:00")).willReturn(6L);

        assertThat(contributor.countPostsBetween("2026-09-25 00:00:00", "2026-09-26 00:00:00")).isEqualTo(6L);
    }
}
