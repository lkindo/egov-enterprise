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
    @DisplayName("로그인 로그 검색 — 화면이 안내한 사용자ID·접속IP 로 걸린다")
    void searchLoginLogs() {
        /*
         * [2026-08-29] 종전 이 테스트는 검색어 "LOG" 가 cntnMthdCd("LOGIN")에 걸리는 것을
         * 확인했다. 즉 **접속 방법 코드**를 검색 축으로 고정하고 있었다. 그런데 화면은
         * '사용자ID · 접속IP' 로 검색된다고 안내한다 — 두 축 모두 컬럼이 실재하는데 어느 쪽도
         * 걸리지 않아, 관리자가 계정이나 IP 를 넣으면 언제나 0건이었다. 오류가 아니라 빈
         * 결과라 "그 계정의 접속 기록이 없다" 로 잘못 읽힌다.
         *
         * 화면이 약속한 두 축을 검사하고, 옛 축이 되살아나면 red 가 되게 함께 고정한다.
         */
        LoginLog log = LoginLog.builder()
                .userId("kim01")
                .cntnMthdCd("LOGIN")
                .lgnIpAddr("192.168.10.7")
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

        assertThat(loginLogRepository
                .searchLoginLogs("kim01", "20240101", "20240131", PageRequest.of(0, 10)).getContent())
                .as("사용자ID 로 검색되지 않으면 화면 안내가 거짓이 된다")
                .extracting(LoginLog::getLgnSn)
                .containsExactly(lgnSn);

        assertThat(loginLogRepository
                .searchLoginLogs("192.168.10", "20240101", "20240131", PageRequest.of(0, 10)).getContent())
                .as("접속IP 로 검색되지 않으면 화면 안내가 거짓이 된다")
                .extracting(LoginLog::getLgnSn)
                .containsExactly(lgnSn);

        assertThat(loginLogRepository
                .searchLoginLogs("LOGIN", "20240101", "20240131", PageRequest.of(0, 10)).getContent())
                .as("접속 방법 코드는 화면에 검색 축으로 안내된 적이 없다 — 되살아나면 안내와 다시 어긋난다")
                .isEmpty();
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
