package nuri.api.config.logging;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.IThrowableProxy;
import ch.qos.logback.classic.spi.LoggerContextVO;
import ch.qos.logback.classic.spi.StackTraceElementProxy;
import ch.qos.logback.classic.spi.ThrowableProxy;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import nuri.foundation.core.util.PiiMaskUtil;
import org.slf4j.Marker;
import org.slf4j.event.KeyValuePair;

/**
 * Logback {@link ILoggingEvent} 래퍼 — 텍스트 콘솔·파일과 구조화 JSON 로그({@code StructuredLogEncoder})가
 * 공통으로 소비하는 메시지·예외 메시지·MDC·structured KeyValuePair 의 PII·토큰을 출력 직전에 가린다.
 *
 * <p>원본 이벤트를 변경하지 않으며, {@code traceId}·{@code spanId} MDC 키와 스택 트레이스 프레임은 보존한다.
 */
final class PiiMaskingLoggingEvent implements ILoggingEvent {

    private static final Set<String> PRESERVED_MDC_KEYS = Set.of("traceId", "spanId");

    private final ILoggingEvent delegate;
    private String maskedMessage;
    private boolean messageResolved;
    private String maskedFormattedMessage;
    private boolean formattedMessageResolved;
    private Object[] maskedArguments;
    private boolean argumentsResolved;
    private IThrowableProxy maskedThrowableProxy;
    private boolean throwableResolved;
    private Map<String, String> maskedMdcMap;
    private boolean mdcResolved;
    private List<KeyValuePair> maskedKeyValuePairs;
    private boolean kvpResolved;

    private PiiMaskingLoggingEvent(ILoggingEvent delegate) {
        this.delegate = Objects.requireNonNull(delegate, "delegate");
    }

    static ILoggingEvent wrap(ILoggingEvent event) {
        if (event == null || event instanceof PiiMaskingLoggingEvent) {
            return event;
        }
        return new PiiMaskingLoggingEvent(event);
    }

    @Override
    public String getThreadName() {
        return delegate.getThreadName();
    }

    @Override
    public Level getLevel() {
        return delegate.getLevel();
    }

    @Override
    public String getMessage() {
        if (!messageResolved) {
            maskedMessage = PiiMaskUtil.redactText(delegate.getMessage());
            messageResolved = true;
        }
        return maskedMessage;
    }

    @Override
    public Object[] getArgumentArray() {
        if (!argumentsResolved) {
            maskedArguments = maskArguments(delegate.getArgumentArray());
            argumentsResolved = true;
        }
        return maskedArguments;
    }

    @Override
    public String getFormattedMessage() {
        if (!formattedMessageResolved) {
            maskedFormattedMessage = PiiMaskUtil.redactText(delegate.getFormattedMessage());
            formattedMessageResolved = true;
        }
        return maskedFormattedMessage;
    }

    @Override
    public String getLoggerName() {
        return delegate.getLoggerName();
    }

    @Override
    public LoggerContextVO getLoggerContextVO() {
        return delegate.getLoggerContextVO();
    }

    @Override
    public IThrowableProxy getThrowableProxy() {
        if (!throwableResolved) {
            IThrowableProxy proxy = delegate.getThrowableProxy();
            if (proxy != null) {
                Map<IThrowableProxy, PiiMaskingThrowableProxy> seen = new IdentityHashMap<>();
                Map<IThrowableProxy, RedactedThrowable> redactedSeen = new IdentityHashMap<>();
                maskedThrowableProxy = PiiMaskingThrowableProxy.wrap(proxy, seen, redactedSeen);
            }
            throwableResolved = true;
        }
        return maskedThrowableProxy;
    }

    @Override
    public StackTraceElement[] getCallerData() {
        return delegate.getCallerData();
    }

    @Override
    public boolean hasCallerData() {
        return delegate.hasCallerData();
    }

    @Override
    public List<Marker> getMarkerList() {
        return delegate.getMarkerList();
    }

    @Override
    public Map<String, String> getMDCPropertyMap() {
        if (!mdcResolved) {
            maskedMdcMap = maskMdcMap(delegate.getMDCPropertyMap());
            mdcResolved = true;
        }
        return maskedMdcMap;
    }

    @Override
    @SuppressWarnings("deprecation")
    public Map<String, String> getMdc() {
        return getMDCPropertyMap();
    }

    @Override
    public long getTimeStamp() {
        return delegate.getTimeStamp();
    }

    @Override
    public int getNanoseconds() {
        return delegate.getNanoseconds();
    }

    @Override
    public Instant getInstant() {
        return delegate.getInstant();
    }

    @Override
    public long getSequenceNumber() {
        return delegate.getSequenceNumber();
    }

    @Override
    public List<KeyValuePair> getKeyValuePairs() {
        if (!kvpResolved) {
            maskedKeyValuePairs = maskKeyValuePairs(delegate.getKeyValuePairs());
            kvpResolved = true;
        }
        return maskedKeyValuePairs;
    }

    @Override
    public void prepareForDeferredProcessing() {
        delegate.prepareForDeferredProcessing();
    }

    private static Object[] maskArguments(Object[] args) {
        if (args == null || args.length == 0) {
            return args;
        }
        Object[] copy = null;
        for (int i = 0; i < args.length; i++) {
            Object arg = args[i];
            if (arg instanceof CharSequence cs) {
                String raw = cs.toString();
                String redacted = PiiMaskUtil.redactText(raw);
                if (!Objects.equals(raw, redacted)) {
                    if (copy == null) {
                        copy = args.clone();
                    }
                    copy[i] = redacted;
                }
            }
        }
        return copy != null ? copy : args;
    }

    private static Map<String, String> maskMdcMap(Map<String, String> mdc) {
        if (mdc == null || mdc.isEmpty()) {
            return mdc;
        }
        Map<String, String> copy = null;
        for (Map.Entry<String, String> entry : mdc.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue();
            if (value == null || PRESERVED_MDC_KEYS.contains(key)) {
                continue;
            }
            String redacted = PiiMaskUtil.redactText(value);
            if (!Objects.equals(value, redacted)) {
                if (copy == null) {
                    copy = new LinkedHashMap<>(mdc);
                }
                copy.put(key, redacted);
            }
        }
        return copy != null ? Collections.unmodifiableMap(copy) : mdc;
    }

    private static List<KeyValuePair> maskKeyValuePairs(List<KeyValuePair> pairs) {
        if (pairs == null || pairs.isEmpty()) {
            return pairs;
        }
        List<KeyValuePair> copy = null;
        for (int i = 0; i < pairs.size(); i++) {
            KeyValuePair kvp = pairs.get(i);
            if (kvp != null && kvp.value instanceof CharSequence cs) {
                String raw = cs.toString();
                String redacted = PiiMaskUtil.redactText(raw);
                if (!Objects.equals(raw, redacted)) {
                    if (copy == null) {
                        copy = new ArrayList<>(pairs);
                    }
                    copy.set(i, new KeyValuePair(kvp.key, redacted));
                }
            }
        }
        return copy != null ? Collections.unmodifiableList(copy) : pairs;
    }

    static final class PiiMaskingThrowableProxy extends ThrowableProxy {

        private static final IThrowableProxy[] EMPTY_SUPPRESSED = new IThrowableProxy[0];

        private final IThrowableProxy delegate;
        private final String maskedMessage;
        private final String maskedOverridingMessage;
        private final IThrowableProxy cause;
        private final IThrowableProxy[] suppressed;

        private PiiMaskingThrowableProxy(
                IThrowableProxy delegate,
                RedactedThrowable redactedThrowable,
                Map<IThrowableProxy, PiiMaskingThrowableProxy> seen,
                Map<IThrowableProxy, RedactedThrowable> redactedSeen) {
            super(redactedThrowable);
            this.delegate = delegate;
            seen.put(delegate, this);
            this.maskedMessage = redactedThrowable.getMessage();
            this.maskedOverridingMessage = redactedThrowable.redactedOverridingMessage;
            IThrowableProxy rawCause = delegate.getCause();
            this.cause = rawCause != null ? wrap(rawCause, seen, redactedSeen) : null;
            IThrowableProxy[] rawSuppressed = delegate.getSuppressed();
            if (rawSuppressed == null || rawSuppressed.length == 0) {
                this.suppressed = EMPTY_SUPPRESSED;
            } else {
                IThrowableProxy[] wrapped = new IThrowableProxy[rawSuppressed.length];
                for (int i = 0; i < rawSuppressed.length; i++) {
                    wrapped[i] = rawSuppressed[i] != null ? wrap(rawSuppressed[i], seen, redactedSeen) : null;
                }
                this.suppressed = wrapped;
            }
        }

        static PiiMaskingThrowableProxy wrap(
                IThrowableProxy proxy,
                Map<IThrowableProxy, PiiMaskingThrowableProxy> seen,
                Map<IThrowableProxy, RedactedThrowable> redactedSeen) {
            PiiMaskingThrowableProxy existing = seen.get(proxy);
            if (existing != null) {
                return existing;
            }
            RedactedThrowable redactedThrowable = RedactedThrowable.buildRedactedThrowable(proxy, redactedSeen);
            return new PiiMaskingThrowableProxy(proxy, redactedThrowable, seen, redactedSeen);
        }

        @Override
        public String getOverridingMessage() {
            return maskedOverridingMessage;
        }

        @Override
        public String getMessage() {
            return maskedMessage;
        }

        @Override
        public String getClassName() {
            return delegate.getClassName();
        }

        @Override
        public StackTraceElementProxy[] getStackTraceElementProxyArray() {
            return delegate.getStackTraceElementProxyArray();
        }

        @Override
        public int getCommonFrames() {
            return delegate.getCommonFrames();
        }

        @Override
        public IThrowableProxy getCause() {
            return cause;
        }

        @Override
        public IThrowableProxy[] getSuppressed() {
            return suppressed;
        }

        @Override
        public boolean isCyclic() {
            return delegate.isCyclic();
        }
    }

    private static final class RedactedThrowable extends Throwable {

        private static final long serialVersionUID = 1L;
        private static final StackTraceElement[] EMPTY_FRAMES = new StackTraceElement[0];

        private final String originalClassName;
        private final String redactedOverridingMessage;
        private final StackTraceElement[] frames;
        private Throwable redactedCause;

        private RedactedThrowable(
                String originalClassName,
                String redactedMessage,
                String redactedOverridingMessage,
                StackTraceElement[] frames) {
            super(redactedMessage, null, true, false);
            this.originalClassName = originalClassName;
            this.redactedOverridingMessage = redactedOverridingMessage;
            this.frames = frames;
        }

        @Override
        public Throwable getCause() {
            return redactedCause;
        }

        @Override
        public StackTraceElement[] getStackTrace() {
            return frames.length == 0 ? EMPTY_FRAMES : frames.clone();
        }

        @Override
        public String toString() {
            if (redactedOverridingMessage != null) {
                return redactedOverridingMessage;
            }
            String message = getLocalizedMessage();
            return message != null ? originalClassName + ": " + message : originalClassName;
        }

        static RedactedThrowable buildRedactedThrowable(
                IThrowableProxy proxy,
                Map<IThrowableProxy, RedactedThrowable> seen) {
            RedactedThrowable existing = seen.get(proxy);
            if (existing != null) {
                return existing;
            }
            String className = Objects.requireNonNullElse(proxy.getClassName(), Throwable.class.getName());
            String redactedMessage = PiiMaskUtil.redactText(proxy.getMessage());
            String redactedOverriding = PiiMaskUtil.redactText(proxy.getOverridingMessage());
            StackTraceElement[] extracted = extractFrames(proxy.getStackTraceElementProxyArray());
            RedactedThrowable current = new RedactedThrowable(className, redactedMessage, redactedOverriding, extracted);
            seen.put(proxy, current);
            IThrowableProxy rawCause = proxy.getCause();
            if (rawCause != null) {
                current.redactedCause = buildRedactedThrowable(rawCause, seen);
            }
            IThrowableProxy[] rawSuppressed = proxy.getSuppressed();
            if (rawSuppressed != null) {
                for (IThrowableProxy item : rawSuppressed) {
                    if (item != null) {
                        RedactedThrowable child = buildRedactedThrowable(item, seen);
                        if (child != current) {
                            current.addSuppressed(child);
                        }
                    }
                }
            }
            return current;
        }

        private static StackTraceElement[] extractFrames(StackTraceElementProxy[] stepArray) {
            if (stepArray == null || stepArray.length == 0) {
                return EMPTY_FRAMES;
            }
            List<StackTraceElement> list = new ArrayList<>(stepArray.length);
            for (StackTraceElementProxy step : stepArray) {
                if (step != null && step.getStackTraceElement() != null) {
                    list.add(step.getStackTraceElement());
                }
            }
            return list.isEmpty() ? EMPTY_FRAMES : list.toArray(EMPTY_FRAMES);
        }
    }
}
