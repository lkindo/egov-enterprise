package nuri.business.domain.log;

import jakarta.persistence.EntityManager;
import nuri.business.support.PersistenceTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Propagation;
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

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    @DisplayName("만료 로그 벌크 삭제는 호출자 트랜잭션 없이도 자체 쓰기 트랜잭션으로 실행된다")
    void deleteOldLogsStartsItsOwnWriteTransaction() {
        privacyLogRepository.deleteAll();
        try {
            PrivacyLog expired = PrivacyLog.builder()
                    .dmndId("RETENTION_OLD")
                    .inqDt(LocalDateTime.now().minusMonths(13))
                    .inqInfo("expired")
                    .build();
            PrivacyLog current = PrivacyLog.builder()
                    .dmndId("RETENTION_CURRENT")
                    .inqDt(LocalDateTime.now())
                    .inqInfo("current")
                    .build();
            privacyLogRepository.save(expired);
            privacyLogRepository.save(current);

            privacyLogRepository.deleteOldLogs(12);

            assertThat(privacyLogRepository.findAll())
                    .extracting(PrivacyLog::getDmndId)
                    .containsExactly("RETENTION_CURRENT");
        } finally {
            privacyLogRepository.deleteAll();
        }
    }
}
