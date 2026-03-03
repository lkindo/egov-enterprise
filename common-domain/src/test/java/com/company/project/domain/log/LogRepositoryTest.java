package com.company.project.domain.log;

import com.company.project.TestJpaConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(TestJpaConfig.class)
@ActiveProfiles("test")
@DisplayName("Log Repository 테스트")
class LogRepositoryTest {

    @Autowired
    private LoginLogRepository loginLogRepository;

    @Autowired
    private SysLogRepository sysLogRepository;

    @Autowired
    private WebLogRepository webLogRepository;

    @Test
    @DisplayName("로그인 로그 저장 및 조회")
    void loginLogTest() {
        // Given
        LoginLog log = LoginLog.builder()
                .logId("LOG_001")
                .loginId("USER01")
                .loginIp("127.0.0.1")
                .creatDt(LocalDateTime.now())
                .build();

        // When
        loginLogRepository.save(log);
        Optional<LoginLog> found = loginLogRepository.findById("LOG_001");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getLoginId()).isEqualTo("USER01");
    }

    @Test
    @DisplayName("시스템 로그 저장 및 조회")
    void sysLogTest() {
        // Given
        SysLog log = SysLog.builder()
                .requstId("REQ_001")
                .srvcNm("TEST_SERVICE")
                .methodNm("testMethod")
                .build();

        // When
        sysLogRepository.save(log);
        Optional<SysLog> found = sysLogRepository.findById("REQ_001");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getSrvcNm()).isEqualTo("TEST_SERVICE");
    }

    @Test
    @DisplayName("웹 로그 저장 및 조회")
    void webLogTest() {
        // Given
        WebLog log = WebLog.builder()
                .requstId("WREQ_001")
                .url("/test/url")
                .rqesterIp("192.168.0.1")
                .build();

        // When
        webLogRepository.save(log);
        Optional<WebLog> found = webLogRepository.findById("WREQ_001");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getUrl()).isEqualTo("/test/url");
    }
}
