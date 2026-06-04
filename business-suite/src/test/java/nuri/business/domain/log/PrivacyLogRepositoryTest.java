package nuri.business.domain.log;

import jakarta.persistence.EntityManager;
import nuri.business.support.PersistenceTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@Transactional
@DisplayName("개인정보 로그 리포지토리 테스트")
class PrivacyLogRepositoryTest extends PersistenceTestSupport {

    @Autowired
    private PrivacyLogRepository privacyLogRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @DisplayName("개인정보 로그 검색")
    void searchPrivacyLogs() {
        // given
        PrivacyLog log = PrivacyLog.builder()
                .dmndId("REQ_01")
                .inqDt(LocalDateTime.now())
                .inqInfo("Test Info")
                .dmndUserId("user01")
                .build();
        privacyLogRepository.save(log);
        entityManager.flush();
        entityManager.clear();

        // when
        Page<PrivacyLog> result = privacyLogRepository.searchPrivacyLogs("Test", null, null, PageRequest.of(0, 10));

        // then
        assertThat(result.getContent()).isNotEmpty();
        assertThat(result.getContent().get(0).getInqInfo()).contains("Test");
    }

    @Test
    @DisplayName("날짜 범위 검색")
    void searchByDateRange() {
        // given
        LocalDateTime targetDate = LocalDateTime.of(2024, 4, 8, 10, 0);
        PrivacyLog log = PrivacyLog.builder()
                .dmndId("REQ_02")
                .inqDt(targetDate)
                .inqInfo("Date Test")
                .build();
        privacyLogRepository.save(log);
        entityManager.flush();
        entityManager.clear();

        // when
        Page<PrivacyLog> result = privacyLogRepository.searchPrivacyLogs(null, "2024-04-01", "2024-04-30", PageRequest.of(0, 10));

        // then
        assertThat(result.getContent()).isNotEmpty();
    }
}