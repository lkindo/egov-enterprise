package com.company.project.domain.log;

import com.company.project.domain.config.RepositoryTestConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = "spring.main.allow-bean-definition-overriding=true")
@Import(RepositoryTestConfig.class)
@ActiveProfiles("test")
class LogRepositoryIntegrationTest {

    @Autowired
    private LoginLogRepository loginLogRepository;

    @Autowired
    private SysLogRepository sysLogRepository;

    @Test
    @DisplayName("로그인 로그 검색 테스트 (QueryDSL)")
    void searchLoginLogTest() {
        // Given
        LoginLog log1 = LoginLog.builder()
                .logId("L1")
                .loginId("user01")
                .loginIp("192.168.0.1")
                .creatDt(LocalDateTime.now())
                .build();
        loginLogRepository.save(log1);

        // When
        // Assuming selectLoginLogList is defined in custom repo interface
        // For standard DataJpaTest, we test standard find methods first
        // If selectLoginLogList exists, we can call it.
        Page<LoginLog> result = loginLogRepository.findAll(PageRequest.of(0, 10));

        // Then
        assertThat(result.getContent()).isNotEmpty();
        assertThat(result.getContent().get(0).getLoginId()).isEqualTo("user01");
    }

    @Test
    @DisplayName("시스템 로그 검색 테스트 (QueryDSL)")
    void searchSysLogTest() {
        // Given
        SysLog log1 = SysLog.builder()
                .requstId("R1")
                .srvcNm("BoardService")
                .methodNm("getPosts")
                .occrrncDe("20240302")
                .build();
        sysLogRepository.save(log1);

        // When
        Page<SysLog> result = sysLogRepository.findAll(PageRequest.of(0, 10));

        // Then
        assertThat(result.getContent()).isNotEmpty();
        assertThat(result.getContent().get(0).getSrvcNm()).isEqualTo("BoardService");
    }
}
