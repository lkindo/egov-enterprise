package nuri.business.domain.stats;

import jakarta.persistence.EntityManager;
import nuri.business.domain.board.BoardMaster;
import nuri.business.domain.board.BoardMasterRepository;
import nuri.business.support.PersistenceTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("자료 이용 통계 날짜 범위 — 마이크로초 정밀도의 반개방 구간")
class DtaUseStatsDateRangeRepositoryTest extends PersistenceTestSupport {

    private static final LocalDateTime START = LocalDateTime.of(2024, 2, 29, 0, 0);
    private static final LocalDateTime END = START.plusDays(1);
    private static final String FROM = "2024-02-29 00:00:00";
    private static final String TO_EXCLUSIVE = "2024-03-01 00:00:00";

    @Autowired private DtaUseStatsRepository usage;
    @Autowired private BoardMasterRepository boards;
    @Autowired private EntityManager em;

    @Test
    void usageQueriesShareTheSameHalfOpenBoundary() {
        boards.saveAndFlush(BoardMaster.builder().bbsId("BBS_STATS_RANGE").bbsTtl("Range board")
                .bbsTypeCd("COM004").bbsAtrbCd("COM009").useYn("Y").build());
        for (LocalDateTime time : List.of(START.minusNanos(1000), START,
                END.minusNanos(1000), END, END.plusNanos(1000))) {
            DtaUseStats row = usage.saveAndFlush(DtaUseStats.builder().bbsId("BBS_STATS_RANGE").build());
            em.createNativeQuery("UPDATE tb_dta_use_stats SET crt_dt = :time WHERE dta_use_stats_sn = :id")
                    .setParameter("time", time).setParameter("id", row.getDtaUseStatsSn()).executeUpdate();
        }
        em.clear();

        assertThat(usage.findByDateRange(FROM, TO_EXCLUSIVE, PageRequest.of(0, 10)))
                .extracting(DtaUseStats::getCrtDt).containsExactly(END.minusNanos(1000), START);
        assertThat(usage.countByDateRange(FROM, TO_EXCLUSIVE)).isEqualTo(2);
        assertSingleBucket(usage.countByDate(FROM, TO_EXCLUSIVE), "2024-02-29");
        assertSingleBucket(usage.countByBbsId(FROM, TO_EXCLUSIVE), "Range board");
    }

    private static void assertSingleBucket(List<Object[]> rows, String key) {
        assertThat(rows).hasSize(1);
        assertThat(rows.get(0)[0]).isEqualTo(key);
        assertThat(((Number) rows.get(0)[1]).longValue()).isEqualTo(2);
    }
}
