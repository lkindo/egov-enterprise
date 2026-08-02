package nuri.business.security.filter;

import io.micrometer.tracing.Tracer;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * 응답에 추적 ID를 실어 주는 필터.
 *
 * <p>[W1-10 재작성] 종전 구현에는 결함이 셋 있었다.
 * <ol>
 *   <li><b>MDC 키 충돌</b> — 8자 UUID 를 {@code traceId} MDC 키에 넣었는데, Micrometer/OTel 브리지가
 *       같은 키에 32-hex 를 넣는다. Boot 기본 로그 패턴은 {@code %correlationId}(= MDC 의
 *       traceId/spanId 를 읽는다)로 이미 출력 중이므로, <b>응답 헤더의 값과 로그에 찍히는 값이
 *       서로 달랐다</b>. 헤더로 문의를 받아도 그 값으로는 로그를 찾을 수 없었다.</li>
 *   <li><b>필터 순서</b> — {@code HIGHEST_PRECEDENCE} 라 관측 필터(ServerHttpObservationFilter,
 *       HIGHEST_PRECEDENCE+1)보다 바깥이었다. 즉 스팬이 열리기 전에 MDC 를 건드렸다.</li>
 *   <li><b>무검증 수신</b> — 클라이언트가 보낸 {@code X-Trace-Id} 를 길이·문자셋 검사 없이 그대로
 *       MDC 와 로그에 반영했다. 개행을 넣으면 로그 위조가 가능한 순수 주입 벡터다.</li>
 * </ol>
 *
 * <p>이제 이 필터는 <b>MDC 를 건드리지 않는다</b>. traceId 의 소유권은 OTel 브리지 단독이고,
 * 이 필터는 그 값을 응답 헤더로 <b>에코</b>하기만 한다. 헤더와 로그가 같은 값을 갖는다.
 *
 * <p>스팬이 없으면(관측 비활성 등) 헤더를 생략한다 — 없는 것을 있는 척 만들지 않는다.
 */
@Component
// 관측 필터(HIGHEST_PRECEDENCE + 1) **안쪽**이어야 스팬이 열린 뒤에 실행된다.
@Order(Ordered.HIGHEST_PRECEDENCE + 2)
public class MdcLoggingFilter extends OncePerRequestFilter {

    private static final String TRACE_HEADER = "X-Trace-Id";

    /** Tracer 는 관측 자동설정이 꺼진 컨텍스트(단위 테스트 등)에는 없을 수 있다. */
    private final ObjectProvider<Tracer> tracerProvider;

    public MdcLoggingFilter(ObjectProvider<Tracer> tracerProvider) {
        this.tracerProvider = tracerProvider;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        currentTraceId().ifPresent(traceId -> response.setHeader(TRACE_HEADER, traceId));
        filterChain.doFilter(request, response);
    }

    private java.util.Optional<String> currentTraceId() {
        Tracer tracer = tracerProvider.getIfAvailable();
        if (tracer == null) {
            return java.util.Optional.empty();
        }
        var span = tracer.currentSpan();
        if (span == null) {
            return java.util.Optional.empty();
        }
        return java.util.Optional.ofNullable(span.context().traceId());
    }
}
