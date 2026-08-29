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

        Page<WebLog> result = webLogRepository.searchWebLogs("test", "2024-01-01", "2024-01-31", PageRequest.of(0, 10));
        assertThat(result.getContent()).extracting(WebLog::getWebLogSn)
                .containsExactly(newerLog.getWebLogSn(), log.getWebLogSn());

        /*
         * [2026-08-29] 화면은 'URL · IP' 로 두 축을 안내하고 표에 '요청자IP' 열을 함께 보여 주는데,
         * 종전 술어는 url 만 봤다. 관리자가 IP 를 붙여 넣으면 언제나 0건이라 "그 IP 의 접근 기록이
         * 없다" 로 잘못 읽힌다. 안내한 IP 축도 함께 검사한다.
         */
        assertThat(webLogRepository
                .searchWebLogs("127.0.0.2", "2024-01-01", "2024-01-31", PageRequest.of(0, 10)).getContent())
                .as("요청자IP 로 검색되지 않으면 화면 안내가 거짓이 된다")
                .extracting(WebLog::getWebLogSn)
                .containsExactly(newerLog.getWebLogSn());
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
