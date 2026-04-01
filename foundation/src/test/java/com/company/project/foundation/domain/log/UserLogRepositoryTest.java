package com.company.project.foundation.domain.log;

import com.company.foundation.support.IntegrationTest;
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
@DisplayName("UserLog 리포지토리 테스트")
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
        entityManager.createNativeQuery("INSERT INTO NEMPLYRINFO (EMPLYR_ID, ESNTL_ID, USER_NM, PASSWORD) VALUES ('MOCK-USER', 'USR-MOCK-001', '홍길동', 'pwd')")
                .executeUpdate();
    }

    @Test
    @DisplayName("사용자 로그 검색 테스트 (Native SQL Join)")
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

        // when (사용자명 검색)
        Page<UserLog> searchByName = repository.searchUserLogs("길동", "20241220", "20241230", PageRequest.of(0, 10));

        // then
        assertThat(searchByName.getContent()).hasSize(1);
        assertThat(searchByName.getContent().get(0).getRqesterId()).isEqualTo("USR-MOCK-001");

        // when (날짜 검색 - 하이픈 자동 제거 검증)
        Page<UserLog> searchByDate = repository.searchUserLogs(null, "2024-12-27", "2024-12-27", PageRequest.of(0, 10));
        assertThat(searchByDate.getContent()).hasSize(1);

        // when (Native Query Coverage)
        repository.insertLogSummary();
        repository.deleteOldLogs(6);
    }
}
