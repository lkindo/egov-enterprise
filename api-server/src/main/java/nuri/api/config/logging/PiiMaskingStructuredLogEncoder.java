package nuri.api.config.logging;

import ch.qos.logback.classic.spi.ILoggingEvent;
import org.springframework.boot.logging.logback.StructuredLogEncoder;

/**
 * {@code json-logs} 프로파일의 {@link StructuredLogEncoder}(ECS·Logstash·GELF)에
 * 전역 PII·토큰 마스킹을 적용한다.
 *
 * <p>{@link StructuredLogEncoder} 하위 타입을 유지하므로 JSON 구조·{@code ecs.version}·MDC 필드를
 * 깨뜨리지 않고 마스킹된 이벤트로 직렬화한다.
 */
public class PiiMaskingStructuredLogEncoder extends StructuredLogEncoder {

    @Override
    public byte[] encode(ILoggingEvent event) {
        return super.encode(PiiMaskingLoggingEvent.wrap(event));
    }
}
