package nuri.business.domain.log;

import nuri.business.support.PersistenceTestSupport;
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
@DisplayName("로그인 로그 리포지토리 테스트")
class LoginLogRepositoryTest extends PersistenceTestSupport {

    @Autowired
    private LoginLogRepository loginLogRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @DisplayName("로그인 로그 검색")
    void searchLoginLogs() {
        // given
        LoginLog log = LoginLog.builder()
                .cntnMthdCd("LOGIN")
                .lgnIpAddr("127.0.0.1")
                .build();
        loginLogRepository.save(log);
        entityManager.flush();

        Long lgnSn = log.getLgnSn();
        entityManager.createNativeQuery("UPDATE TB_LOGIN_LOG SET CRT_DT = :createdDate WHERE LGN_SN = :lgnSn")
                .setParameter("createdDate", LocalDateTime.of(2024, 1, 1, 10, 0))
                .setParameter("lgnSn", lgnSn)
                .executeUpdate();

        entityManager.flush();
        entityManager.clear();

        // when
        Page<LoginLog> result = loginLogRepository.searchLoginLogs("LOG", "20240101", "20240131", PageRequest.of(0, 10));

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getLgnSn()).isEqualTo(lgnSn);
    }

    @Test
    @DisplayName("로그인 로그 삭제")
    void deleteOldLogs() {
        // given
        LoginLog oldLog = LoginLog.builder()
                .build();
        loginLogRepository.save(oldLog);
        entityManager.flush();

        Long lgnSn = oldLog.getLgnSn();
        entityManager.createNativeQuery("UPDATE TB_LOGIN_LOG SET CRT_DT = :createdDate WHERE LGN_SN = :lgnSn")
                .setParameter("createdDate", LocalDateTime.of(2020, 1, 1, 10, 0))
                .setParameter("lgnSn", lgnSn)
                .executeUpdate();

        entityManager.flush();
        entityManager.clear();

        // when
        loginLogRepository.deleteOldLogs(12);
        entityManager.flush();
        entityManager.clear();

        // then
        assertThat(loginLogRepository.findById(lgnSn)).isEmpty();
    }
}
