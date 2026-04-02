package com.company.project.foundation.domain.log;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("PrivacyLog ?ÑÎ©î???®ÏúÑ ?åÏä§??)
class PrivacyLogTest {

    @Test
    @DisplayName("PrivacyLog ?ùÏÑ± Î∞??ÑÎìú ?ïÏù∏ ?åÏä§??)
    void privacyLogTest() {
        // given
        LocalDateTime now = LocalDateTime.now();
        PrivacyLog log = PrivacyLog.builder()
                .requestId("REQ-001")
                .inquiryDatetime(now)
                .serviceName("PrivacyService")
                .inquiryInfo("PersonalData")
                .requesterId("admin")
                .requesterIp("127.0.0.1")
                .build();

        // then
        assertThat(log.getRequestId()).isEqualTo("REQ-001");
        assertThat(log.getInquiryDatetime()).isEqualTo(now);
        assertThat(log.getServiceName()).isEqualTo("PrivacyService");
        assertThat(log.getInquiryInfo()).isEqualTo("PersonalData");
        assertThat(log.getRequesterId()).isEqualTo("admin");
        assertThat(log.getRequesterIp()).isEqualTo("127.0.0.1");

        // when (Setter test since @Setter is present)
        log.setServiceName("ModifiedService");
        assertThat(log.getServiceName()).isEqualTo("ModifiedService");
    }
}
