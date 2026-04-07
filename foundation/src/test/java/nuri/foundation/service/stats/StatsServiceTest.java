package nuri.foundation.service.stats;

import nuri.foundation.service.stats.dto.StatsDto;
import nuri.foundation.support.PersistenceTestSupport;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Import(StatsService.class)
class StatsServiceTest extends PersistenceTestSupport {

    @Autowired
    private StatsService statsService;

    @Autowired
    private EntityManager entityManager;

    @Test
    @DisplayName("접속 통계 조회")
    void getConnectionStats() {
        // given
        String fromDate = "20240101";
        String toDate = "20240131";
        
        insertWebLogSummary("20240101", 10);
        insertWebLogSummary("20240102", 20);

        // when
        List<StatsDto> result = statsService.getConnectionStats(fromDate, toDate, "STK01");

        // then
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getStatsDate()).isEqualTo("20240101");
        assertThat(result.get(0).getStatsCo()).isEqualTo(10);
    }

    @Test
    @DisplayName("게시판 통계 조회")
    void getBoardStats() {
        // given
        String fromDate = "20240101";
        String toDate = "20240131";

        insertBbsSummary("20240101", 5);
        insertBbsSummary("20240102", 15);

        // when
        List<StatsDto> result = statsService.getBoardStats(fromDate, toDate, "STK01");

        // then
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getStatsDate()).isEqualTo("20240101");
        assertThat(result.get(0).getStatsCo()).isEqualTo(5);
    }

    @Test
    @DisplayName("사용자 통계 조회")
    void getUserStats() {
        // given
        String fromDate = "20240101";
        String toDate = "20240131";

        insertUserSummary("20240101", 3);
        insertUserSummary("20240102", 7);

        // when
        List<StatsDto> result = statsService.getUserStats(fromDate, toDate, "STK01");

        // then
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getStatsDate()).isEqualTo("20240101");
        assertThat(result.get(0).getStatsCo()).isEqualTo(3);
    }

    @Test
    @DisplayName("요청 통계 조회")
    void getRequestStats() {
        // given
        String fromDate = "20240101";
        String toDate = "20240131";

        insertWebLogSummary("20240101", 100);

        // when
        List<StatsDto> result = statsService.getRequestStats(fromDate, toDate, "STK01");

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStatsCo()).isEqualTo(100);
    }

    private void insertWebLogSummary(String date, int count) {
        entityManager.createNativeQuery("INSERT INTO SWEBLOGSUMMARY (OCCRRNC_DE, RDCNT, URL) VALUES (?, ?, ?)")
                .setParameter(1, date)
                .setParameter(2, count)
                .setParameter(3, "http://localhost/test")
                .executeUpdate();
    }

    private void insertBbsSummary(String date, int count) {
        entityManager.createNativeQuery("INSERT INTO SBBSSUMMARY (OCCRRNC_DE, CREAT_CO, STATS_SE, DETAIL_STATS_SE) VALUES (?, ?, ?, ?)")
                .setParameter(1, date)
                .setParameter(2, count)
                .setParameter(3, "STK01")
                .setParameter(4, "DET01")
                .executeUpdate();
    }

    private void insertUserSummary(String date, int count) {
        entityManager.createNativeQuery("INSERT INTO SUSERSUMMARY (OCCRRNC_DE, USER_CO, STATS_SE, DETAIL_STATS_SE) VALUES (?, ?, ?, ?)")
                .setParameter(1, date)
                .setParameter(2, count)
                .setParameter(3, "STK01")
                .setParameter(4, "DET01")
                .executeUpdate();
    }
}
