package nuri.business.domain.sms;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("SmsRecptn 엔티티 테스트")
class SmsRecptnTest {

    @Test
    @DisplayName("SmsRecptn 빌더 및 초기화 테스트")
    void builderTest() {
        SmsRecptn recptn = SmsRecptn.builder()
                .smsId("SMS_001")
                .recptnTelno("01011112222")
                .resultCode("1000")
                .resultMssage("SUCCESS")
                .build();

        assertThat(recptn.getSmsId()).isEqualTo("SMS_001");
        assertThat(recptn.getRecptnTelno()).isEqualTo("01011112222");
        assertThat(recptn.getResultCode()).isEqualTo("1000");
        assertThat(recptn.getResultMssage()).isEqualTo("SUCCESS");
    }

    @Test
    @DisplayName("SmsRecptn 결과 업데이트 테스트")
    void updateResultTest() {
        SmsRecptn recptn = SmsRecptn.builder()
                .smsId("SMS_001")
                .recptnTelno("01011112222")
                .build();

        recptn.updateResult("2000", "FAIL");
        assertThat(recptn.getResultCode()).isEqualTo("2000");
        assertThat(recptn.getResultMssage()).isEqualTo("FAIL");
    }

    @Test
    @DisplayName("SmsRecptnId 테스트")
    void smsRecptnIdTest() {
        SmsRecptnId id1 = new SmsRecptnId("SMS_001", "0101");
        SmsRecptnId id2 = new SmsRecptnId("SMS_001", "0101");
        SmsRecptnId id3 = new SmsRecptnId("SMS_001", "0102");

        assertThat(id1).isEqualTo(id2);
        assertThat(id1).isNotEqualTo(id3);
        assertThat(id1.hashCode()).isEqualTo(id2.hashCode());
        assertThat(id1.toString()).contains("SMS_001");
    }
}
