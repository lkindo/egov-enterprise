package com.company.project.foundation.domain.log;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("WebLog ?ÑÎ©î???®ÏúÑ ?åÏä§??)
class WebLogTest {

    @Test
    @DisplayName("WebLog ?ùÏÑ± Î∞??ÑÎìú ?ïÏù∏ ?åÏä§??)
    void webLogTest() {
        // given
        LocalDateTime now = LocalDateTime.now();
        WebLog log = WebLog.builder()
                .requstId("REQ-001")
                .url("/api/test")
                .rqesterId("user01")
                .rqesterIp("127.0.0.1")
                .occrrncDe(now)
                .build();

        // then
        assertThat(log.getRequstId()).isEqualTo("REQ-001");
        assertThat(log.getUrl()).isEqualTo("/api/test");
        assertThat(log.getRqesterId()).isEqualTo("user01");
        assertThat(log.getRqesterIp()).isEqualTo("127.0.0.1");
        assertThat(log.getOccrrncDe()).isEqualTo(now);

        // check custom constructor
        WebLog log2 = new WebLog("REQ-002", "/test", "id", "ip", now);
        assertThat(log2.getRequstId()).isEqualTo("REQ-002");
    }
}
