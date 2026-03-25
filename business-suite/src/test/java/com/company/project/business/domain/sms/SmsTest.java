package com.company.project.business.domain.sms;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Sms 엔티티 테스트")
class SmsTest {

    @Test
    @DisplayName("Sms 엔티티 빌더 및 초기화 테스트")
    void builderTest() {
        Sms sms = Sms.builder()
                .smsId("SMS_001")
                .trnsmitTelno("01012345678")
                .trnsmitCn("Test SMS Message")
                .build();

        assertThat(sms.getSmsId()).isEqualTo("SMS_001");
        assertThat(sms.getTrnsmitTelno()).isEqualTo("01012345678");
        assertThat(sms.getTrnsmitCn()).isEqualTo("Test SMS Message");
    }
}
