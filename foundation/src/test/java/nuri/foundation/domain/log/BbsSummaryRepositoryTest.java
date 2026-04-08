package nuri.foundation.domain.log;

import jakarta.persistence.EntityManager;
import nuri.foundation.support.PersistenceTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Transactional
@DisplayName("게시판 요약 리포지토리 테스트")
class BbsSummaryRepositoryTest extends PersistenceTestSupport {

    @Autowired
    private BbsSummaryRepository bbsSummaryRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private EntityManager entityManager;

    @BeforeEach
    void setUp() {
        // NBBS 테이블이 없을 수도 있으므로 (다른 모듈 엔티티) 직접 생성
        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS NBBS (NTT_ID BIGINT PRIMARY KEY, BBS_ID VARCHAR(20), NTT_SJ VARCHAR(2000), NTT_CN VARCHAR(2000), RDCNT INT, USE_AT CHAR(1), CREAT_DT TIMESTAMP, NTCR_ID VARCHAR(20))");
        
        // 데이터 삽입 전 기존 데이터 삭제
        jdbcTemplate.execute("DELETE FROM NBBS");
        
        // NBBS 테스트 데이터 삽입
        jdbcTemplate.execute("INSERT INTO NBBS (NTT_ID, BBS_ID, NTT_SJ, NTT_CN, RDCNT, USE_AT, CREAT_DT) VALUES (1, 'BBS_01', 'Test Board 1', 'Content 1', 100, 'Y', CURRENT_TIMESTAMP)");
        jdbcTemplate.execute("INSERT INTO NBBS (NTT_ID, BBS_ID, NTT_SJ, NTT_CN, RDCNT, USE_AT, CREAT_DT) VALUES (2, 'BBS_01', 'Test Board 2', 'Content 2', 50, 'Y', CURRENT_TIMESTAMP)");
    }

    @Test
    @DisplayName("게시글 생성 통계 조회")
    void selectBbsCretCntStats() {
        // given
        BbsSummary summary = BbsSummary.builder()
                .occrrncDe("20240408")
                .statsKind("BBS")
                .detailStatsKind("BBS_01")
                .creatCo(10L)
                .totInqireCo(500L)
                .build();
        bbsSummaryRepository.save(summary);
        entityManager.flush();
        entityManager.clear();

        // when
        List<Object[]> result = bbsSummaryRepository.selectBbsCretCntStats("D", "BBS", "BBS_01", "20240401", "20240430");

        // then
        assertThat(result).isNotEmpty();
        assertThat(result.get(0)[0].toString()).isEqualTo("10"); // statsCo
        assertThat(result.get(0)[1].toString()).isEqualTo("2024-04-08"); // statsDate
    }

    @Test
    @DisplayName("게시글 조회수 통계 조회")
    void selectBbsTotCntStats() {
        // given
        BbsSummary summary = BbsSummary.builder()
                .occrrncDe("20240408")
                .statsKind("BBS")
                .detailStatsKind("BBS_01")
                .creatCo(10L)
                .totInqireCo(500L)
                .build();
        bbsSummaryRepository.save(summary);
        entityManager.flush();
        entityManager.clear();

        // when
        List<Object[]> result = bbsSummaryRepository.selectBbsTotCntStats("D", "BBS", "BBS_01", "20240401", "20240430");

        // then
        assertThat(result).isNotEmpty();
        assertThat(result.get(0)[0].toString()).isEqualTo("500"); // statsCo
    }

    @Test
    @DisplayName("최고 조회수 게시글 통계 조회")
    void selectBbsMaxCntStats() {
        // given
        BbsSummary summary = BbsSummary.builder()
                .occrrncDe("20240408")
                .statsKind("BBS")
                .detailStatsKind("BBS_01")
                .mxmmInqireBbsId("1") // NBBS NTT_ID
                .build();
        bbsSummaryRepository.save(summary);
        entityManager.flush();
        entityManager.clear();

        // when
        List<Object[]> result = bbsSummaryRepository.selectBbsMaxCntStats("BBS", "BBS_01", "20240401", "20240430");

        // then
        assertThat(result).isNotEmpty();
        assertThat(result.get(0)[2].toString()).isEqualTo("Test Board 1"); // mxmmInqireBbsNm
    }
}
