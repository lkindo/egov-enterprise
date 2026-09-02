package nuri.business.service.log;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.log.SysLog;
import nuri.business.domain.log.SysLogRepository;
import nuri.foundation.core.event.AuditEvent;
import nuri.foundation.core.util.IdGenerationUtil;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;

/**
 * 실패한 API 요청을 {@code tb_sys_log}로 영속화하는 비동기 리스너.
 *
 * <p><b>왜 실패만 기록하나.</b> {@code tb_sys_log}에는 {@code rspns_cd}·{@code err_cd}·
 * {@code err_se_cd} 세 컬럼이 있다 — 전 요청을 담는 테이블이라면 이 컬럼들이 존재할 이유가 없다.
 * 전 요청 이력은 이미 {@code tb_web_log}가 갖고 있으므로, 같은 사실을 두 테이블에 복제하면
 * 쓰기량만 두 배가 되고 관리자는 "무엇이 잘못됐는가"를 여전히 못 찾는다.
 * 그래서 이 로그는 <b>4xx 이상</b>만 담아 장애 조사용 좁은 뷰가 된다.
 *
 * <p><b>⚠ 종전에는 이 테이블에 쓰는 코드가 저장소에 하나도 없었다.</b>
 * {@code LogManageService.logInsertSysLog}는 호출자가 0이었고, 조회 API·관리 화면·보존
 * 스케줄러만 존재해 {@code /admin/system/logs/system}은 <b>영원히 빈 표</b>를 보여 줬다.
 * 이 리스너가 그 공백을 닫는다.
 *
 * <p>[비파괴 원칙] {@code WebAuditLogListener}와 같은 규약을 따른다 — {@code auditExecutor}
 * 전용 풀에서 실행하고, {@code @Transactional}을 붙이지 않아 저장 실패가 이 메서드의 catch에
 * 잡히게 하며, 실패는 세되 원 요청에는 영향을 주지 않는다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SystemErrorLogListener {

    private static final DateTimeFormatter YMD = DateTimeFormatter.ofPattern("yyyyMMdd");

    /** {@code tb_sys_log.srvc_nm}·{@code mthd_nm} 컬럼 폭. 초과분은 잘라 넣는다(INSERT 실패 방지). */
    private static final int NAME_MAX = 100;

    /** 유실 카운터 메트릭 이름 — 대시보드·알람이 이 이름에 결속한다. 바꾸면 관측이 끊긴다. */
    public static final String DROP_METRIC = "audit.syslog.persist.failure";

    /** 서버 오류(5xx) 구분값. {@code err_se_cd} 폭은 12자다. */
    private static final String ERR_SE_SERVER = "SERVER";

    /** 클라이언트 오류(4xx) 구분값. */
    private static final String ERR_SE_CLIENT = "CLIENT";

    private final SysLogRepository sysLogRepository;

    private final org.springframework.beans.factory.ObjectProvider<
            io.micrometer.core.instrument.MeterRegistry> meterRegistryProvider;

    private final java.util.concurrent.atomic.AtomicLong persistFailureCount =
            new java.util.concurrent.atomic.AtomicLong();

    @Async("auditExecutor")
    @EventListener
    public void onAuditEvent(AuditEvent event) {
        if (!event.isFailure()) {
            return;
        }
        try {
            SysLog entity = SysLog.builder()
                    .dmndId(IdGenerationUtil.generateAuditRequestId())
                    .srvcNm(truncate(event.serviceName() != null ? event.serviceName() : event.url()))
                    .mthdNm(truncate(event.methodName() != null ? event.methodName() : event.httpMethod()))
                    .prcsSeCd(ProcessTypeCode.of(event.httpMethod()).code())
                    .prcsTm(event.durationMs())
                    .dmndUserId(event.userId())
                    .dmndUserIpAddr(event.clientIp())
                    .ocrnYmd(event.occurredAt().format(YMD))
                    .rspnsCd(String.valueOf(event.statusCode()))
                    .errSeCd(event.statusCode() >= 500 ? ERR_SE_SERVER : ERR_SE_CLIENT)
                    // errCd 는 채우지 않는다 — 인터셉터 계층에는 애플리케이션 오류 코드가 없다.
                    //   HTTP 상태를 err_cd 에 복제하면 rspns_cd 와 같은 값이 두 컬럼에 들어가
                    //   "오류 코드 체계가 있다"는 거짓 인상을 만든다.
                    .build();
            sysLogRepository.save(entity);
        } catch (Exception e) {
            long total = persistFailureCount.incrementAndGet();
            recordDropMetric();
            log.error("시스템 오류 로그 영속화 실패(요청 처리에는 영향 없음) — 누적 유실 {}건: {}", total, e.toString());
        }
    }

    private static String truncate(String value) {
        if (value == null) {
            return null;
        }
        return value.length() <= NAME_MAX ? value : value.substring(0, NAME_MAX);
    }

    private void recordDropMetric() {
        io.micrometer.core.instrument.MeterRegistry registry = meterRegistryProvider.getIfAvailable();
        if (registry != null) {
            registry.counter(DROP_METRIC).increment();
        }
    }

    /** 테스트·운영 점검용 유실 누계. 외부 관측은 {@link #DROP_METRIC} 메트릭을 쓴다. */
    public long getPersistFailureCount() {
        return persistFailureCount.get();
    }
}
