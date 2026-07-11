package nuri.business.domain.log;

import jakarta.persistence.EntityManager;
import nuri.business.domain.user.entity.User;
import nuri.business.support.PersistenceTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;



import static org.assertj.core.api.Assertions.assertThat;

@Transactional
@DisplayName("사용자 로그 리포지토리 테스트")
class UserLogRepositoryTest extends PersistenceTestSupport {

    @Autowired
    private UserLogRepository userLogRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("DELETE FROM TB_SYS_LOG");
        jdbcTemplate.execute("DELETE FROM TB_USER_LOG");
    }

    @Test
    @DisplayName("사용자 로그 검색")
    void searchUserLogs() {
        // given
        User user = User.builder()
                .userId("user01")
                .userNm("Tester")
                .pswd("password")
                .esntlId("ESNTL_01")
                .build();
        entityManager.persist(user);

        UserLog log = UserLog.builder()
                .ocrnYmd("20240408")
                .dmndUserId("ESNTL_01")
                .srvcNm("TestService")
                .mthdNm("testMethod")
                .crtCnt(1)
                .build();
        userLogRepository.save(log);
        entityManager.flush();
        entityManager.clear();

        // when
        Page<UserLog> result = userLogRepository.searchUserLogs("Tester", "2024-04-01", "2024-04-30", PageRequest.of(0, 10));

        // then
        assertThat(result.getContent()).isNotEmpty();
        assertThat(result.getContent().get(0).getSrvcNm()).isEqualTo("TestService");
    }

    @Test
    @DisplayName("사용자 로그 검색 - 모든 조건이 null일 때")
    void searchUserLogs_NullConditions() {
        // given
        User user = User.builder()
                .userId("user02")
                .userNm("Tester2")
                .pswd("password")
                .esntlId("ESNTL_02")
                .build();
        entityManager.persist(user);

        UserLog log = UserLog.builder()
                .ocrnYmd("20240408")
                .dmndUserId("ESNTL_02")
                .srvcNm("TestService")
                .mthdNm("testMethod")
                .crtCnt(1)
                .build();
        userLogRepository.save(log);
        entityManager.flush();
        entityManager.clear();

        // when
        Page<UserLog> result = userLogRepository.searchUserLogs(null, null, null, PageRequest.of(0, 10));

        // then
        assertThat(result.getContent()).isNotEmpty();
        assertThat(result.getContent().get(0).getSrvcNm()).isEqualTo("TestService");
    }

    @Test
    @DisplayName("사용자 로그 검색 - 검색어만 있는 경우")
    void searchUserLogs_OnlySearchWrd() {
        // when
        Page<UserLog> result = userLogRepository.searchUserLogs("Tester", null, null, PageRequest.of(0, 10));
        
        // then
        assertThat(result).isNotNull();
    }

    @Test
    @DisplayName("사용자 로그 검색 - 날짜 조건 중 하나가 빈 문자열일 때")
    void searchUserLogs_EmptyDate() {
        // when
        Page<UserLog> result = userLogRepository.searchUserLogs(null, "", "2024-04-30", PageRequest.of(0, 10));
        
        // then
        assertThat(result).isNotNull();
    }

    @Test
    @DisplayName("오래된 로그 삭제 테스트")
    void deleteOldLogs() {
        // given
        User user = User.builder()
                .userId("user03")
                .userNm("Tester3")
                .pswd("password")
                .esntlId("ESNTL_03")
                .build();
        entityManager.persist(user);

        UserLog oldLog = UserLog.builder()
                .ocrnYmd("20000101") // 아주 오래된 날짜
                .dmndUserId("ESNTL_03")
                .srvcNm("OldService")
                .mthdNm("oldMethod")
                .crtCnt(1)
                .build();
        userLogRepository.save(oldLog);
        entityManager.flush();
        entityManager.clear();

        // when
        userLogRepository.deleteOldLogs(6); // 6개월 이전 데이터 삭제
        entityManager.flush();
        entityManager.clear();

        // then
        Page<UserLog> result = userLogRepository.searchUserLogs(null, null, null, PageRequest.of(0, 10));
        assertThat(result.getContent()).isEmpty(); // 전부 삭제되었어야 함
    }
}