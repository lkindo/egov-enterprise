package nuri.api.config.logging;

import ch.qos.logback.classic.encoder.PatternLayoutEncoder;
import ch.qos.logback.classic.spi.ILoggingEvent;

/**
 * 텍스트 콘솔·파일 로그 인코더에 전역 PII·토큰 마스킹을 적용한다.
 *
 * <p>{@link PatternLayoutEncoder} 계층을 유지하므로 Spring Boot 기본 콘솔·파일 패턴
 * ({@code %correlationId}, 색상, 예외 스택 변환기)과 인코더 타입 계약을 그대로 보존한다.
 */
public class PiiMaskingPatternLayoutEncoder extends PatternLayoutEncoder {

    @Override
    public byte[] encode(ILoggingEvent event) {
        return super.encode(PiiMaskingLoggingEvent.wrap(event));
    }
}
