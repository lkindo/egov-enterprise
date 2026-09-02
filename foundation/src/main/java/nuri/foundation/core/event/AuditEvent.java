package nuri.foundation.core.event;

import java.time.LocalDateTime;

/**
 * API 접근 감사 이벤트.
 *
 * <p>{@code OperationalAuditInterceptor}가 요청 완료 시 발행하고, 감사 리스너들이 각 로그 테이블로
 * 비동기 영속화한다. 발행자(api-server)와 영속 구현(business-core)을 이 이벤트로 디커플링한다.
 *
 * <p><b>이 이벤트 하나가 로그 3종의 단일 원천이다.</b>
 * <ul>
 *   <li>{@code tb_web_log} — 전 요청 ({@code WebAuditLogListener})</li>
 *   <li>{@code tb_sys_log} — 실패 요청만 ({@code SystemErrorLogListener})</li>
 *   <li>{@code tb_user_log} — 인증 사용자의 일자별 활동 집계 ({@code UserActivityLogAggregator})</li>
 * </ul>
 * 같은 요청에 대해 세 로그가 서로 다른 사실을 말하지 않도록 원천을 쪼개지 않는다.
 *
 * <p><b>⚠ 식별자 두 개를 함께 나르는 이유.</b> {@code userId}는 <b>loginId</b>이고
 * {@code esntlId}는 사용자 고유 ID다. {@code tb_user_log.dmnd_user_id}에는
 * {@code tb_user_info(esntl_id)}로 향하는 FK({@code fk_tb_user_log_tb_user_info})가 걸려 있어
 * loginId를 넣으면 <b>모든 INSERT가 제약 위반으로 실패한다</b>. 반면 {@code tb_web_log}·
 * {@code tb_sys_log}에는 FK가 없고 종전부터 loginId를 기록해 왔다. 둘을 한 필드로 합치면
 * 어느 한쪽이 반드시 깨지므로 분리해서 나른다.
 *
 * @param url         요청 URI
 * @param httpMethod  HTTP 메서드(GET/POST/PUT/PATCH/DELETE 등). 판정 불가 시 {@code "UNKNOWN"}
 * @param statusCode  응답 상태 코드
 * @param userId      요청자 loginId. 미인증이면 {@code "ANONYMOUS"}
 * @param esntlId     요청자 고유 ID. <b>미인증이면 {@code null}</b> — FK 대상이라 지어내지 않는다
 * @param clientIp    신뢰 경계로 판정한 클라이언트 IP
 * @param durationMs  처리 소요시간(ms)
 * @param occurredAt  요청 완료 시각
 * @param serviceName 핸들러 클래스 단순명. 판정 불가 시 {@code null}
 * @param methodName  핸들러 메서드명. 판정 불가 시 {@code null}
 */
public record AuditEvent(
        String url,
        String httpMethod,
        int statusCode,
        String userId,
        String esntlId,
        String clientIp,
        long durationMs,
        LocalDateTime occurredAt,
        String serviceName,
        String methodName
) implements DomainEvent {

    /** 클라이언트 오류(4xx) 이상이면 실패로 본다 — {@code tb_sys_log} 적재 조건. */
    public boolean isFailure() {
        return statusCode >= 400;
    }

    /** 인증된 요청만 사용자 활동 집계 대상이다(FK 제약). */
    public boolean hasIdentifiedUser() {
        return esntlId != null && !esntlId.isBlank();
    }
}
