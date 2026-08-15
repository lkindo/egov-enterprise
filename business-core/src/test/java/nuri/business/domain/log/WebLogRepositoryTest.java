package nuri.business.domain.log;

import nuri.business.support.PersistenceTestSupport;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;


import static org.assertj.core.api.Assertions.assertThat;

@Transactional
@DisplayName("웹 로그 리포지토리 테스트")
class WebLogRepositoryTest extends PersistenceTestSupport {

    @Autowired
    private WebLogRepository webLogRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @DisplayName("웹 로그 검색")
    void searchWebLogs() {
        // given
        WebLog log = WebLog.builder()
                .occrYmd("20240103")
                .url("/test/first")
                .dmndUserIpAddr("127.0.0.1")
                .build();
        webLogRepository.save(log);
        WebLog newerLog = WebLog.builder()
                .occrYmd("20240103")
                .url("/test/second")
                .dmndUserIpAddr("127.0.0.2")
                .build();
        webLogRepository.save(newerLog);

        // when
        Page<WebLog> result = webLogRepository.searchWebLogs("test", "2024-01-01", "2024-01-31", PageRequest.of(0, 10));

        // then
        assertThat(result.getContent()).extracting(WebLog::getWebLogSn)
                .containsExactly(newerLog.getWebLogSn(), log.getWebLogSn());
    }

    @Test
    @DisplayName("웹 로그 삭제")
    void deleteOldLogs() {
        // given
        WebLog oldLog = WebLog.builder()
                .occrYmd("20200101")
                .build();
        webLogRepository.save(oldLog);
        entityManager.flush();
        Long oldLogSn = oldLog.getWebLogSn();
        assertThat(oldLogSn).isPositive();
        entityManager.clear();

        // when
        webLogRepository.deleteOldLogs(12);
        entityManager.flush();
        entityManager.clear();

        // then
        assertThat(webLogRepository.findById(oldLogSn)).isEmpty();
    }
}
