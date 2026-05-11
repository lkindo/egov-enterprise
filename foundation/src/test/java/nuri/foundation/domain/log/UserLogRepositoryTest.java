package nuri.foundation.domain.log;

import jakarta.persistence.EntityManager;
import nuri.foundation.domain.user.entity.User;
import nuri.foundation.support.PersistenceTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;


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
        jdbcTemplate.execute("DELETE FROM NSYSLOG");
        jdbcTemplate.execute("DELETE FROM NUSERLOG");
    }

    @Test
    @DisplayName("사용자 로그 검색")
    void searchUserLogs() {
        // given
        User user = User.builder()
                .userId("user01")
                .userNm("Tester")
                .password("password")
                .esntlId("ESNTL_01")
                .build();
        entityManager.persist(user);

        UserLog log = UserLog.builder()
                .occrrncDe("20240408")
                .rqesterId("ESNTL_01")
                .srvcNm("TestService")
                .methodNm("testMethod")
                .creatCo(1)
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

}