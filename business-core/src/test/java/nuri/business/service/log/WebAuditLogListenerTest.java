package nuri.business.service.log;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import nuri.business.domain.log.WebLog;
import nuri.business.domain.log.WebLogRepository;
import nuri.foundation.core.event.AuditEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DataIntegrityViolationException;

import java.lang.reflect.Method;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 🧾 감사 로그 유실 <b>관측성</b> 검증 — {@link WebAuditLogListener}.
 *
 * <p>[왜 이 테스트가 필요한가] 감사 로그를 best-effort 로 두는 것은 정당한 설계 선택이지만,
 * <b>얼마나 잃었는지 셀 수 없는 것</b>은 정당하지 않다. 세지 못하면 "감사 로그가 있다" 는 진술
 * 자체를 신뢰할 수 없다. 그런데 이 클래스에는 테스트가 <b>하나도 없었다</b> — 유실 계수라는
 * 주장이 코드 주석으로만 존재했다.
 */
@DisplayName("WebAuditLogListener — 감사 유실 관측성")
class WebAuditLogListenerTest {

    private static final AuditEvent EVENT = new AuditEvent(
            "/api/v1/things", "webmaster", "10.0.0.1", 12L, LocalDateTime.of(2026, 8, 4, 12, 0));

    private WebAuditLogListener listener(WebLogRepository repository, MeterRegistry registry) {
        @SuppressWarnings("unchecked")
        ObjectProvider<MeterRegistry> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(registry);
        return new WebAuditLogListener(repository, provider);
    }

    @Test
    @DisplayName("정상 경로에서는 감사 행이 저장되고 유실 카운터가 오르지 않는다")
    void successPathPersistsAndDoesNotCount() {
        WebLogRepository repository = mock(WebLogRepository.class);
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        WebAuditLogListener listener = listener(repository, registry);

        listener.onAuditEvent(EVENT);

        verify(repository).save(any(WebLog.class));
        assertThat(listener.getPersistFailureCount()).isZero();
        assertThat(registry.find(WebAuditLogListener.DROP_METRIC).counter()).isNull();
    }

    @Test
    @DisplayName("🚨 영속화 실패는 요청 처리로 전파되지 않는다 — 비파괴 원칙")
    void persistFailureIsNotPropagated() {
        WebLogRepository repository = mock(WebLogRepository.class);
        when(repository.save(any(WebLog.class)))
                .thenThrow(new DataIntegrityViolationException("boom"));

        WebAuditLogListener listener = listener(repository, new SimpleMeterRegistry());

        assertThatCode(() -> listener.onAuditEvent(EVENT)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("🚨 유실은 Micrometer 카운터로 외부에 드러난다 — 프로세스 내부 값만으로는 관측 불가")
    void dropIsExposedAsMicrometerCounter() {
        WebLogRepository repository = mock(WebLogRepository.class);
        when(repository.save(any(WebLog.class)))
                .thenThrow(new DataIntegrityViolationException("boom"));
        SimpleMeterRegistry registry = new SimpleMeterRegistry();

        WebAuditLogListener listener = listener(repository, registry);
        listener.onAuditEvent(EVENT);
        listener.onAuditEvent(EVENT);

        assertThat(listener.getPersistFailureCount()).isEqualTo(2);
        assertThat(registry.counter(WebAuditLogListener.DROP_METRIC).count())
                .as("메트릭이 없으면 유실은 프로세스 밖에서 보이지 않는다 — 대시보드·알람이 결속할 지점이 사라진다")
                .isEqualTo(2.0);
    }

    @Test
    @DisplayName("MeterRegistry 가 없는 컨텍스트에서도 깨지지 않는다 — 계측 부재가 감사 자체를 죽이면 안 된다")
    void worksWithoutMeterRegistry() {
        WebLogRepository repository = mock(WebLogRepository.class);
        when(repository.save(any(WebLog.class)))
                .thenThrow(new DataIntegrityViolationException("boom"));

        // business-core 는 Micrometer 를 선택 의존으로 쓴다. 레지스트리를 강제 주입하면 그 빈이 없는
        // 슬라이스에서 리스너 생성이 실패하고, 감사 로깅이 통째로 빠진 채 테스트가 초록이 된다.
        WebAuditLogListener listener = listener(repository, null);

        assertThatCode(() -> listener.onAuditEvent(EVENT)).doesNotThrowAnyException();
        assertThat(listener.getPersistFailureCount()).isEqualTo(1);
    }

    /**
     * 🚨 회귀 방지 — 이 메서드에 {@code @Transactional} 이 붙으면 유실 계수가 다시 거짓이 된다.
     *
     * <p>선언적 트랜잭션이 있으면 INSERT 는 메서드 반환 <b>이후</b> 커밋 시점에 flush 되므로
     * 지배적 실패 모드(커밋 시 제약 위반·커넥션 실패)가 메서드 안의 catch 를 통과하지 못한다.
     * 예외는 프록시 밖으로 던져지고 카운터는 0 을 유지한다 — 세고 있다는 주장만 남는다.
     * 이 단언은 그 재발을 코드 구조 수준에서 막는다.
     */
    @Test
    @DisplayName("🚨 onAuditEvent 에 @Transactional 이 없다 — 있으면 커밋 시 실패를 세지 못한다")
    void auditListenerMustNotBeDeclarativelyTransactional() throws NoSuchMethodException {
        Method method = WebAuditLogListener.class.getMethod("onAuditEvent", AuditEvent.class);

        assertThat(method.getAnnotation(org.springframework.transaction.annotation.Transactional.class))
                .as("@Transactional 이 붙으면 flush 가 catch 밖(커밋 시점)으로 밀려 유실이 집계되지 않는다")
                .isNull();
        assertThat(WebAuditLogListener.class
                .getAnnotation(org.springframework.transaction.annotation.Transactional.class))
                .as("클래스 레벨 선언도 같은 결과를 낳는다")
                .isNull();
    }
}
