package nuri.foundation.domain.log;

import nuri.foundation.support.PersistenceTestSupport;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

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
                .dmndId("REQ_001")
                .ocrnYmd("20240103")
                .url("/test/url")
                .rqesterIp("127.0.0.1")
                .build();
        webLogRepository.save(log);

        // when
        Page<WebLog> result = webLogRepository.searchWebLogs("test", "2024-01-01", "2024-01-31", PageRequest.of(0, 10));

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getDmndId()).isEqualTo("REQ_001");
    }

    @Test
    @DisplayName("웹 로그 삭제")
    void deleteOldLogs() {
        // given
        WebLog oldLog = WebLog.builder()
                .dmndId("REQ_OLD")
                .ocrnYmd("20200101")
                .build();
        webLogRepository.save(oldLog);
        entityManager.flush();
        entityManager.clear();

        // when
        webLogRepository.deleteOldLogs(12);
        entityManager.flush();
        entityManager.clear();

        // then
        assertThat(webLogRepository.findById("REQ_OLD")).isEmpty();
    }
}