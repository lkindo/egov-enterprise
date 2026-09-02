package nuri.business.service.log;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import nuri.business.domain.log.PrivacyLog;
import nuri.business.domain.log.PrivacyLogRepository;
import nuri.foundation.core.event.PrivacyAccessEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 🧾 개인정보 접근 증적 <b>적재 경로</b> 검증 — {@link PrivacyAccessLogListener}.
 *
 * <p>[왜 이 테스트가 필요한가] {@code tb_privacy_log} 에는 조회 서비스와 관리 화면이 있었지만
 * <b>쓰는 코드가 없었다</b>. 개인정보 접근 기록은 컴플라이언스 증적이라, 비어 있는 표는
 * "접근이 없었다"로 오독된다 — 없는 것보다 나쁘다.
 */
@DisplayName("PrivacyAccessLogListener — 개인정보 접근 증적 적재")
class PrivacyAccessLogListenerTest {

    private static final LocalDateTime ACCESSED_AT = LocalDateTime.of(2026, 9, 2, 10, 15);

    private static final PrivacyAccessEvent EVENT = new PrivacyAccessEvent(
            "사용자 상세(생년월일·휴대전화·이메일·주소)", "UserApiController", "admin", "10.0.0.9", ACCESSED_AT);

    private PrivacyAccessLogListener listener(PrivacyLogRepository repository, MeterRegistry registry) {
        @SuppressWarnings("unchecked")
        ObjectProvider<MeterRegistry> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(registry);
        return new PrivacyAccessLogListener(repository, provider);
    }

    @Test
    @DisplayName("조회자·시각·조회항목이 증적으로 남는다")
    void persistsAccessTrail() {
        PrivacyLogRepository repository = mock(PrivacyLogRepository.class);
        PrivacyAccessLogListener listener = listener(repository, new SimpleMeterRegistry());

        listener.onPrivacyAccess(EVENT);

        ArgumentCaptor<PrivacyLog> captor = ArgumentCaptor.forClass(PrivacyLog.class);
        verify(repository).save(captor.capture());
        PrivacyLog saved = captor.getValue();
        assertThat(saved.getDmndUserId()).isEqualTo("admin");
        assertThat(saved.getDmndUserIpAddr()).isEqualTo("10.0.0.9");
        assertThat(saved.getInqDt()).isEqualTo(ACCESSED_AT);
        assertThat(saved.getSrvcNm()).isEqualTo("UserApiController");
        assertThat(saved.getInqInfo()).isEqualTo("사용자 상세(생년월일·휴대전화·이메일·주소)");
        assertThat(saved.getDmndId()).hasSize(20);
    }

    @Test
    @DisplayName("조회 항목 서술이 컬럼 폭(255)을 넘으면 잘라 적재한다")
    void truncatesOverlongInquiryInfo() {
        PrivacyLogRepository repository = mock(PrivacyLogRepository.class);
        PrivacyAccessLogListener listener = listener(repository, new SimpleMeterRegistry());

        listener.onPrivacyAccess(new PrivacyAccessEvent(
                "가".repeat(400), "S".repeat(150), "admin", "10.0.0.9", ACCESSED_AT));

        ArgumentCaptor<PrivacyLog> captor = ArgumentCaptor.forClass(PrivacyLog.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getInqInfo()).hasSize(255);
        assertThat(captor.getValue().getSrvcNm()).hasSize(100);
    }

    @Test
    @DisplayName("적재 실패는 요청을 깨뜨리지 않고 유실 카운터와 메트릭으로 드러난다")
    void persistFailureIsCountedAndNotPropagated() {
        PrivacyLogRepository repository = mock(PrivacyLogRepository.class);
        when(repository.save(any(PrivacyLog.class)))
                .thenThrow(new DataIntegrityViolationException("unique violation"));
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        PrivacyAccessLogListener listener = listener(repository, registry);

        assertThatCode(() -> listener.onPrivacyAccess(EVENT)).doesNotThrowAnyException();

        assertThat(listener.getPersistFailureCount()).isEqualTo(1);
        assertThat(registry.find(PrivacyAccessLogListener.DROP_METRIC).counter()).isNotNull();
    }
}
