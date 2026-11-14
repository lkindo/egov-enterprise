package nuri.business.service.log;

import nuri.business.core.service.BaseAbstractService;
import nuri.business.domain.log.LoginLog;
import nuri.business.domain.log.LoginLogRepository;
import nuri.business.service.log.dto.LogDto;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * JPA 기반 로그 관리 서비스 구현체
 * - 전자정부 프레임워크 5.0 호환성 인증 요건 충실
 * - BaseAbstractService 상속으로 중복 코드 제거
 */
@Service
@Transactional(readOnly = true)
public class LogService extends BaseAbstractService {

    private static final org.slf4j.Logger LOG = org.slf4j.LoggerFactory.getLogger(LogService.class);

    private final LoginLogRepository loginLogRepository;

    /** 유실 카운터 메트릭 이름 — 웹·시스템·개인정보·사용자 로그와 같은 계열이다. 바꾸면 관측이 끊긴다. */
    public static final String DROP_METRIC = "audit.loginlog.persist.failure";

    /** 레지스트리가 없는 컨텍스트(단위 시험 슬라이스)에서도 만들어지도록 지연 조회한다(WebAuditLogListener 와 같은 이유). */
    private final org.springframework.beans.factory.ObjectProvider<io.micrometer.core.instrument.MeterRegistry> meterRegistryProvider;

    private final java.util.concurrent.atomic.AtomicLong persistFailureCount = new java.util.concurrent.atomic.AtomicLong();

    public LogService(LoginLogRepository loginLogRepository) {
        this(loginLogRepository, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public LogService(LoginLogRepository loginLogRepository,
            org.springframework.beans.factory.ObjectProvider<io.micrometer.core.instrument.MeterRegistry> meterRegistryProvider) {
        this.loginLogRepository = required(loginLogRepository, "LoginLogRepository 는 null 일 수 없습니다");
        this.meterRegistryProvider = meterRegistryProvider;
    }

    /**
     * 로그인 로그 기록 (비동기 처리)
     */
    @Async("logExecutor")
    @Transactional
    public void logLogin(String userId, String ip, String mthd, String errAt, String errCode) {

        LoginLog log = LoginLog.builder()
                .userId(userId)
                .lgnIpAddr(ip)
                .cntnMthdCd(mthd)
                .errOcrnYn(errAt)
                .errCd(errCode)
                .build();
        try {
            loginLogRepository.save(required(log, "로그 엔티티는 null 일 수 없습니다"));
        } catch (RuntimeException e) {
            // [2026-11-14] 로그인 응답에는 영향을 주지 않되(비동기·best-effort) 유실을 셀 수 있게 남긴다. 종전에는 다른 로그와 달리
            //   로그인 로그만 실패가 비동기 예외 처리기의 로그 한 줄로 사라져, 얼마나 잃었는지 셀 수 없었다.
            long total = persistFailureCount.incrementAndGet();
            io.micrometer.core.instrument.MeterRegistry registry = meterRegistryProvider == null ? null : meterRegistryProvider.getIfAvailable();
            if (registry != null) {
                registry.counter(DROP_METRIC).increment();
            }
            LOG.error("로그인 로그 영속화 실패(로그인에는 영향 없음) — 누적 유실 {}건, 예외유형={}", total, e.getClass().getSimpleName());
        }
    }

    /** 시험·운영 점검용 유실 누계. 외부 관측은 {@link #DROP_METRIC} 메트릭을 쓴다. */
    public long getPersistFailureCount() {
        return persistFailureCount.get();
    }

    /**
     * 최근 로그인 로그 목록 조회
     */
    public List<LogDto> getRecentLoginLogs() {
        return loginLogRepository.findTop100ByOrderByCrtDtDesc().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    private LogDto convertToDto(LoginLog log) {
        return LogDto.builder()
                .lgnSn(log.getLgnSn())
                .conectMthd(log.getCntnMthdCd())
                .conectId(log.getUserId())
                .conectIp(log.getLgnIpAddr())
                .creatDt(log.getCrtDt())
                .errOccrrAt(log.getErrOcrnYn())
                .build();
    }
}
