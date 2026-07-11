package nuri.business.service.log;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.log.WebLog;
import nuri.business.domain.log.WebLogRepository;
import nuri.foundation.core.event.AuditEvent;
import nuri.foundation.core.util.IdGenerationUtil;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;

/**
 * API 접근 감사 이벤트({@link AuditEvent})를 {@code tb_web_log}로 영속화하는 비동기 리스너.
 *
 * <p>[비파괴 원칙] {@code @Async} + try/catch 로, 영속화 실패가 원 요청 처리에 절대 영향을 주지 않는다
 * (별도 스레드에서 실행되며 예외는 흡수). 감사 로그 도메인({@code domain/log})과 API 경계 인터셉터를
 * 이벤트로 디커플링한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebAuditLogListener {

    private static final DateTimeFormatter YMD = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final WebLogRepository webLogRepository;

    @Async
    @EventListener
    @Transactional
    public void onAuditEvent(AuditEvent event) {
        try {
            WebLog webLog = WebLog.create(
                    IdGenerationUtil.generateId("WLOG_", 13),
                    event.url(),
                    event.userId(),
                    event.clientIp(),
                    event.occurredAt().format(YMD),
                    event.durationMs());
            webLogRepository.save(webLog);
        } catch (Exception e) {
            log.warn("웹 감사 로그 영속화 실패(요청 처리에는 영향 없음): {}", e.toString());
        }
    }
}
