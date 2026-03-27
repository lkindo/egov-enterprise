package com.company.project.foundation.domain.log;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("LoginLog 도메인 단위 테스트")
class LoginLogTest {

    @Test
    @DisplayName("LoginLog 생성 및 필드 확인 테스트")
    void loginLogCreationTest() {
        // given
        LocalDateTime now = LocalDateTime.now();
        LoginLog log = LoginLog.builder()
                .logId("LOG-001")
                .loginId("user01")
                .loginIp("127.0.0.1")
                .loginMthd("LOGIN")
                .errOccrrAt("N")
                .errorCode("000")
                .creatDt(now)
                .build();

        // then
        assertThat(log.getLogId()).isEqualTo("LOG-001");
        assertThat(log.getLoginId()).isEqualTo("user01");
        assertThat(log.getLoginIp()).isEqualTo("127.0.0.1");
        assertThat(log.getLoginMthd()).isEqualTo("LOGIN");
        assertThat(log.getErrOccrrAt()).isEqualTo("N");
        assertThat(log.getErrorCode()).isEqualTo("000");
        assertThat(log.getCreatDt()).isEqualTo(now);
    }

    @Test
    @DisplayName("LoginLog 생성자 테스트")
    void loginLogConstructorTest() {
        // given
        LocalDateTime now = LocalDateTime.now();
        
        // when
        LoginLog log = new LoginLog("LOG-002", "user02", "192.168.0.1", "LOGOUT", "Y", "999", now);

        // then
        assertThat(log.getLogId()).isEqualTo("LOG-002");
        assertThat(log.getLoginId()).isEqualTo("user02");
    }
}
