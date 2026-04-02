package com.company.project.foundation.domain.log;

import com.company.project.foundation.support.IntegrationTest;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@IntegrationTest
@DisplayName("UserLog Î¶¨Ìè¨ÏßÄ?†Î¶¨ ?åÏä§??)
class UserLogRepositoryTest {

    @Autowired
    private UserLogRepository repository;

    @Autowired
    private EntityManager entityManager;

    @BeforeEach
    @Transactional
    void setupMockView() {
        // Create Mock table for NEMPLYRINFO (where User entity is mapped)
        entityManager.createNativeQuery("CREATE TABLE IF NOT EXISTS NEMPLYRINFO (" +
                "EMPLYR_ID VARCHAR(60) NOT NULL, " +
                "ESNTL_ID VARCHAR(20) NOT NULL UNIQUE, " +
                "USER_NM VARCHAR(180) NOT NULL, " +
                "PASSWORD VARCHAR(600) NOT NULL, " +
                "PRIMARY KEY (EMPLYR_ID))").executeUpdate();
        
        // Insert mock user
        entityManager.createNativeQuery("INSERT INTO NEMPLYRINFO (EMPLYR_ID, ESNTL_ID, USER_NM, PASSWORD) VALUES ('MOCK-USER', 'USR-MOCK-001', '?çÍ∏∏??, 'pwd')")
                .executeUpdate();
    }

    @Test
    @DisplayName("?¨Ïö©??Î°úÍ∑∏ Í≤Ä???åÏä§??(Native SQL Join)")
    void searchUserLogsTest() {
        // given
        UserLog log = UserLog.builder()
                .occrrncDe("20241227")
                .rqesterId("USR-MOCK-001") // Match mock user
                .srvcNm("UserService")
                .methodNm("updateUser")
                .creatCo(1).updtCo(0).rdCnt(0).deleteCo(0).outptCo(0).errorCo(0)
                .build();
        repository.save(log);

        // when (?¨Ïö©?êÎ™Ö Í≤Ä??
        Page<UserLog> searchByName = repository.searchUserLogs("Í∏∏Îèô", "20241220", "20241230", PageRequest.of(0, 10));

        // then
        assertThat(searchByName.getContent()).hasSize(1);
        assertThat(searchByName.getContent().get(0).getRqesterId()).isEqualTo("USR-MOCK-001");

        // when (?†Ïßú Í≤Ä??- ?òÏù¥???êÎèô ?úÍ±∞ Í≤ÄÏ¶?
        Page<UserLog> searchByDate = repository.searchUserLogs(null, "2024-12-27", "2024-12-27", PageRequest.of(0, 10));
        assertThat(searchByDate.getContent()).hasSize(1);

        // when (Native Query Coverage)
        repository.insertLogSummary();
        repository.deleteOldLogs(6);
    }
}
