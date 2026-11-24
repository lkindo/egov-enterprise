package nuri.api.config.logging;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.IThrowableProxy;
import ch.qos.logback.classic.spi.LoggingEvent;
import ch.qos.logback.classic.spi.StackTraceElementProxy;
import ch.qos.logback.classic.spi.ThrowableProxy;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Marker;
import org.slf4j.MarkerFactory;
import org.slf4j.event.KeyValuePair;

@DisplayName("PiiMaskingLoggingEvent 단위 테스트")
class PiiMaskingLoggingEventTest {

    @Test
    @DisplayName("null 입력은 null 을, 이미 감싼 이벤트는 같은 인스턴스를 그대로 돌려준다")
    void wrapHandlesNullAndIdempotency() {
        assertThat(PiiMaskingLoggingEvent.wrap(null)).isNull();

        LoggerContext context = new LoggerContext();
        Logger logger = context.getLogger("test.wrap");
        LoggingEvent event = new LoggingEvent(getClass().getName(), logger, Level.INFO, "plain log", null, null);
        ILoggingEvent wrapped = PiiMaskingLoggingEvent.wrap(event);

        assertThat(PiiMaskingLoggingEvent.wrap(wrapped)).isSameAs(wrapped);
    }

    @Test
    @DisplayName("메시지·인자·예외 cause/suppressed·MDC·KeyValuePair 를 가리고 traceId/spanId 와 메타는 보존한다")
    void masksSensitiveFieldsWhilePreservingCorrelationAndNonStrings() {
        LoggerContext context = new LoggerContext();
        Logger logger = context.getLogger("test.mask");
        IllegalStateException rootCause = new IllegalStateException("cause 010-1234-5678");
        IllegalArgumentException suppressed = new IllegalArgumentException("suppressed hong@example.com");
        RuntimeException outer = new RuntimeException("outer 900101-1234567", rootCause);
        outer.addSuppressed(suppressed);

        Marker securityMarker = MarkerFactory.getMarker("SECURITY");
        LoggingEvent event = new LoggingEvent(
                getClass().getName(),
                logger,
                Level.WARN,
                "user={} token={}",
                outer,
                new Object[] { "010-9876-5432", 42 });
        event.addMarker(securityMarker);
        event.setThreadName("worker-1");
        event.setTimeStamp(1_700_000_000_123L);
        event.setSequenceNumber(77L);
        event.setMDCPropertyMap(Map.of(
                "traceId", "0af7651916cd43dd8448eb211c80319c",
                "spanId", "b7ad6b7169203331",
                "userEmail", "alice@example.com"));
        event.setKeyValuePairs(List.of(
                new KeyValuePair("mobile", "010-1234-5678"),
                new KeyValuePair("retryCount", 3)));

        ILoggingEvent wrapped = PiiMaskingLoggingEvent.wrap(event);

        assertThat(wrapped.getMessage()).isEqualTo("user={} token={}");
        assertThat(wrapped.getFormattedMessage()).isEqualTo("user=010-****-5432 token=42");
        assertThat(wrapped.getArgumentArray()).containsExactly("010-****-5432", 42);
        assertThat(wrapped.getThrowableProxy()).isInstanceOf(ThrowableProxy.class);
        assertThat(wrapped.getThrowableProxy().getMessage()).isEqualTo("outer 900101-*******");
        assertThat(wrapped.getThrowableProxy().getCause().getMessage()).isEqualTo("cause 010-****-5678");
        assertThat(wrapped.getThrowableProxy().getSuppressed()).hasSize(1);
        assertThat(wrapped.getThrowableProxy().getSuppressed()[0].getMessage()).isEqualTo("suppressed ho***@example.com");

        Throwable redacted = ((ThrowableProxy) wrapped.getThrowableProxy()).getThrowable();
        assertThat(redacted).isNotNull();
        assertThat(redacted.getMessage()).isEqualTo("outer 900101-*******");
        assertThat(redacted.toString()).isEqualTo("java.lang.RuntimeException: outer 900101-*******");
        assertThat(redacted.getCause().getMessage()).isEqualTo("cause 010-****-5678");
        assertThat(redacted.getSuppressed()).hasSize(1);
        assertThat(redacted.getSuppressed()[0].getMessage()).isEqualTo("suppressed ho***@example.com");
        assertThat(wrapped.getMDCPropertyMap())
                .containsEntry("traceId", "0af7651916cd43dd8448eb211c80319c")
                .containsEntry("spanId", "b7ad6b7169203331")
                .containsEntry("userEmail", "al***@example.com");
        assertThat(wrapped.getKeyValuePairs())
                .extracting(kvp -> kvp.key + "=" + kvp.value)
                .containsExactly("mobile=010-****-5678", "retryCount=3");
        assertThat(wrapped.getThreadName()).isEqualTo("worker-1");
        assertThat(wrapped.getLevel()).isEqualTo(Level.WARN);
        assertThat(wrapped.getLoggerName()).isEqualTo("test.mask");
        assertThat(wrapped.getLoggerContextVO()).isEqualTo(event.getLoggerContextVO());
        assertThat(wrapped.getMarkerList()).containsExactly(securityMarker);
        assertThat(wrapped.getTimeStamp()).isEqualTo(1_700_000_000_123L);
        assertThat(wrapped.getSequenceNumber()).isEqualTo(77L);
        assertThat(wrapped.getInstant()).isEqualTo(Instant.ofEpochMilli(1_700_000_000_123L));

        // 원 이벤트는 불변이다.
        assertThat(event.getMDCPropertyMap()).containsEntry("userEmail", "alice@example.com");
        assertThat(new ThrowableProxy(outer).getCause().getMessage()).isEqualTo("cause 010-1234-5678");
    }

    @Test
    @DisplayName("순환 ThrowableProxy 와 나머지 위임 메서드를 무한 재귀 없이 처리한다")
    void handlesCyclicThrowableAndFullDelegation() {
        IThrowableProxy a = mock(IThrowableProxy.class);
        IThrowableProxy b = mock(IThrowableProxy.class);
        when(a.getMessage()).thenReturn("a hong@example.com");
        when(a.getOverridingMessage()).thenReturn("override 010-1234-5678");
        when(a.getClassName()).thenReturn("java.lang.IllegalStateException");
        when(a.getStackTraceElementProxyArray()).thenReturn(new StackTraceElementProxy[0]);
        when(a.getCommonFrames()).thenReturn(2);
        when(a.isCyclic()).thenReturn(true);
        when(a.getCause()).thenReturn(b);
        when(a.getSuppressed()).thenReturn(null);
        when(b.getMessage()).thenReturn("b 900101-1234567");
        when(b.getCause()).thenReturn(a);
        when(b.getSuppressed()).thenReturn(new IThrowableProxy[0]);

        ILoggingEvent raw = mock(ILoggingEvent.class);
        when(raw.getThrowableProxy()).thenReturn(a);
        when(raw.getCallerData()).thenReturn(new StackTraceElement[0]);
        when(raw.hasCallerData()).thenReturn(false);
        when(raw.getNanoseconds()).thenReturn(999);
        when(raw.getMDCPropertyMap()).thenReturn(Map.of("k", "plain"));
        when(raw.getKeyValuePairs()).thenReturn(List.of(new KeyValuePair("k", "plain")));

        ILoggingEvent wrapped = PiiMaskingLoggingEvent.wrap(raw);
        IThrowableProxy maskedA = wrapped.getThrowableProxy();
        IThrowableProxy maskedB = maskedA.getCause();

        assertThat(maskedA).isInstanceOf(ThrowableProxy.class);
        assertThat(maskedA.getMessage()).isEqualTo("a ho***@example.com");
        assertThat(maskedA.getOverridingMessage()).isEqualTo("override 010-****-5678");
        assertThat(maskedA.getClassName()).isEqualTo("java.lang.IllegalStateException");
        assertThat(maskedA.getStackTraceElementProxyArray()).isEmpty();
        assertThat(maskedA.getCommonFrames()).isEqualTo(2);
        assertThat(maskedA.isCyclic()).isTrue();
        assertThat(maskedB.getMessage()).isEqualTo("b 900101-*******");
        assertThat(maskedB.getCause()).isSameAs(maskedA);
        assertThat(maskedB.getSuppressed()).isEmpty();
        Throwable redactedA = ((ThrowableProxy) maskedA).getThrowable();
        assertThat(redactedA.getMessage()).isEqualTo("a ho***@example.com");
        assertThat(redactedA.toString()).isEqualTo("override 010-****-5678");
        assertThat(redactedA.getCause().getMessage()).isEqualTo("b 900101-*******");
        assertThat(redactedA.getCause().getCause()).isSameAs(redactedA);
        assertThat(wrapped.hasCallerData()).isFalse();
        assertThat(wrapped.getCallerData()).isEmpty();
        assertThat(wrapped.getNanoseconds()).isEqualTo(999);
        assertThat(wrapped.getMarkerList()).isEmpty();

        wrapped.prepareForDeferredProcessing();
        verify(raw).prepareForDeferredProcessing();
    }
}
