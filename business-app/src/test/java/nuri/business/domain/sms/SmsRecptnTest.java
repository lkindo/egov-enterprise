package nuri.business.domain.sms;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("SmsRecptn 엔티티 테스트")
class SmsRecptnTest {

    @Test
    @DisplayName("SmsRecptn 빌더 및 초기화 테스트")
    void builderTest() {
        // 1. 신규 표준 필드 빌더 및 Getter 검증
        SmsRecptn recptn = SmsRecptn.builder()
                .smsId("SMS_001")
                .rcptnTelno("01011112222")
                .rsltCd("1000")
                .rsltMsg("SUCCESS")
                .build();

        assertThat(recptn.getSmsId()).isEqualTo("SMS_001");
        assertThat(recptn.getRcptnTelno()).isEqualTo("01011112222");
        assertThat(recptn.getRsltCd()).isEqualTo("1000");
        assertThat(recptn.getRsltMsg()).isEqualTo("SUCCESS");

        // 2. 레거시 호환용 빌더 및 Getter 검증
        SmsRecptn legacyRecptn = SmsRecptn.builder()
                .smsId("SMS_002")
                .rcptnTelno("01011112222")
                .rsltCd("1000")
                .rsltMsg("SUCCESS")
                .build();

        assertThat(legacyRecptn.getRsltCd()).isEqualTo("1000");
        assertThat(legacyRecptn.getRsltMsg()).isEqualTo("SUCCESS");
        assertThat(legacyRecptn.getRsltCd()).isEqualTo("1000");
        assertThat(recptn.getRsltCd()).isEqualTo("1000");
    }

    @Test
    @DisplayName("SmsRecptn 결과 업데이트 테스트")
    void updateResultTest() {
        SmsRecptn recptn = SmsRecptn.builder()
                .smsId("SMS_001")
                .rcptnTelno("01011112222")
                .build();

        recptn.updateResult("2000", "FAIL");
        assertThat(recptn.getRsltCd()).isEqualTo("2000");
        assertThat(recptn.getRsltCd()).isEqualTo("2000"); // 하위 호환 Getter
        assertThat(recptn.getRsltMsg()).isEqualTo("FAIL");
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

    @Test
    @DisplayName("SmsRecptn id가 null인 경우 getSmsId 및 getRcptnTelno 리턴 null 검증")
    void getSmsIdAndRcptnTelno_whenIdIsNull() {
        SmsRecptn recptn = new SmsRecptn();
        assertThat(recptn.getSmsId()).isNull();
        assertThat(recptn.getRcptnTelno()).isNull();
    }
}

