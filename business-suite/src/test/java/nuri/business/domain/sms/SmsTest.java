package nuri.business.domain.sms;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Sms 엔티티 테스트")
class SmsTest {

    @Test
    @DisplayName("Sms 엔티티 빌더 및 초기화 테스트")
    void builderTest() {
        // 1. 신규 표준 필드 빌더 및 Getter 검증
        Sms sms = Sms.builder()
                .smsId("SMS_001")
                .sndngTelno("01012345678")
                .sndngCn("Test SMS Message")
                .build();

        assertThat(sms.getSmsId()).isEqualTo("SMS_001");
        assertThat(sms.getSndngTelno()).isEqualTo("01012345678");
        assertThat(sms.getSndngCn()).isEqualTo("Test SMS Message");

        // 2. 레거시 별칭 빌더 및 Getter 호환성 검증
        Sms legacySms = Sms.builder()
                .smsId("SMS_002")
                .sndngTelno("01087654321")
                .sndngCn("Legacy SMS Message")
                .build();

        assertThat(legacySms.getSmsId()).isEqualTo("SMS_002");
        assertThat(legacySms.getSndngTelno()).isEqualTo("01087654321");
        assertThat(legacySms.getSndngCn()).isEqualTo("Legacy SMS Message");

        // 상호 크로스 검증
        assertThat(legacySms.getSndngTelno()).isEqualTo("01087654321");
        assertThat(sms.getSndngCn()).isEqualTo("Test SMS Message");
    }
}
