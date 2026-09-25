package nuri.business.domain.stats;

import jakarta.persistence.EntityManager;
import nuri.business.support.PersistenceTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("보고서 통계 날짜 범위 — 마이크로초 정밀도의 반개방 구간")
class ReportStatsDateRangeRepositoryTest extends PersistenceTestSupport {

    private static final LocalDateTime START = LocalDateTime.of(2024, 2, 29, 0, 0);
    private static final LocalDateTime END = START.plusDays(1);
    private static final String FROM = "2024-02-29 00:00:00";
    private static final String TO_EXCLUSIVE = "2024-03-01 00:00:00";

    @Autowired private ReprtStatsRepository reports;
    @Autowired private EntityManager em;

    @Test
    void reportQueriesIncludeFinalMicrosecondButExcludeNextMidnight() {
        List<LocalDateTime> times = List.of(START.minusNanos(1000), START,
                END.minusNanos(1000), END, END.plusNanos(1000));
        for (LocalDateTime time : times) {
            ReprtStats row = reports.saveAndFlush(ReprtStats.builder()
                    .reprtNm(time.toString()).reprtType("A").reprtSttus("B").build());
            // Set after auditing has run, so the persisted precision is exercised by the query.
            em.createNativeQuery("UPDATE tb_rptp_stats SET crt_dt = :time WHERE rptp_sn = :id")
                    .setParameter("time", time).setParameter("id", row.getRptpSn()).executeUpdate();
        }
        em.clear();

        assertThat(reports.findByConditions("A", FROM, TO_EXCLUSIVE, PageRequest.of(0, 10)))
                .extracting(ReprtStats::getCrtDt).containsExactly(END.minusNanos(1000), START);
        assertThat(reports.countByConditions("A", FROM, TO_EXCLUSIVE)).isEqualTo(2);
        assertThat(reports.countByConditions("Z", FROM, TO_EXCLUSIVE)).isZero();
        assertSingleBucket(reports.countByDate(FROM, TO_EXCLUSIVE), "2024-02-29");
        assertSingleBucket(reports.countByReprtType(FROM, TO_EXCLUSIVE), "A");
        assertSingleBucket(reports.countByReprtSttus(FROM, TO_EXCLUSIVE), "B");
    }

    private static void assertSingleBucket(List<Object[]> rows, String key) {
        assertThat(rows).hasSize(1);
        assertThat(String.valueOf(rows.get(0)[0])).isEqualTo(key);
        assertThat(((Number) rows.get(0)[1]).longValue()).isEqualTo(2);
    }
}
