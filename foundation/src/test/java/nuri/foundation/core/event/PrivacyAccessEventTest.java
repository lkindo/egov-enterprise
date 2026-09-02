package nuri.foundation.core.event;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * {@link PrivacyAccessEvent} 단위 테스트.
 *
 * <p>이 이벤트는 컴플라이언스 증적의 입력이다. 필드가 조용히 비면 "누가 언제 무엇을 봤는가"
 * 중 한 축이 사라지는데, 증적은 한 축만 빠져도 증적 구실을 못 한다.
 */
@DisplayName("PrivacyAccessEvent 단위 테스트")
class PrivacyAccessEventTest {

    private static final LocalDateTime ACCESSED_AT = LocalDateTime.of(2026, 9, 2, 10, 15);

    @Test
    @DisplayName("조회자·시각·조회 항목·서비스·IP 를 손실 없이 보존한다")
    void preservesAccessContext() {
        PrivacyAccessEvent event = new PrivacyAccessEvent(
                "사용자 상세(생년월일·휴대전화·이메일·주소)", "UserApiController", "admin", "10.0.0.9", ACCESSED_AT);

        assertThat(event.inqInfo()).isEqualTo("사용자 상세(생년월일·휴대전화·이메일·주소)");
        assertThat(event.serviceName()).isEqualTo("UserApiController");
        assertThat(event.userId()).isEqualTo("admin");
        assertThat(event.clientIp()).isEqualTo("10.0.0.9");
        assertThat(event.occurredAt()).isEqualTo(ACCESSED_AT);
    }

    /**
     * 조회 항목 서술에는 <b>실제 개인정보 값을 넣지 않는다</b>(애노테이션 javadoc 규약).
     * 증적이 곧 유출이 되기 때문이다. 여기서는 서술이 항목 이름 수준임을 예시로 남긴다.
     */
    @Test
    @DisplayName("조회 항목 서술은 값이 아니라 항목 이름이다")
    void inquiryInfoDescribesFieldsNotValues() {
        PrivacyAccessEvent event = new PrivacyAccessEvent(
                "외부인사 목록(생년월일·전화번호·이메일)", "ExternalHrApiController", "admin", "10.0.0.9", ACCESSED_AT);

        assertThat(event.inqInfo()).doesNotContain("@").doesNotContainPattern("\\d{6}");
    }

    @Test
    @DisplayName("같은 접근 사실은 값으로 같다")
    void isValueEqual() {
        assertThat(new PrivacyAccessEvent("항목", "Svc", "admin", "10.0.0.9", ACCESSED_AT))
                .isEqualTo(new PrivacyAccessEvent("항목", "Svc", "admin", "10.0.0.9", ACCESSED_AT));
    }
}
