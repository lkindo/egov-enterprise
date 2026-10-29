package nuri.business.service.system.signal;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.function.LongSupplier;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.log.SysLogRepository;
import nuri.business.domain.system.job.DurableJobRepository;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.security.util.SecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * 관리자 홈의 운영 신호 요약 — 실패한 후속 작업 수, 잠긴 계정 수, 오늘 실패 요청 수를 DB 에서 읽어 관측 시각과 함께 낸다.
 *
 * <p>[2026-10-20] 종전 관리자 홈은 목록 API 를 건수 1로 불러 화면이 합계를 조립했고, 운영 신호는 없었다. 숫자의 원천은 DB 하나이고
 * (인스턴스 메모리가 아니다), 이름은 원천과 같다 — 실패 요청은 {@code tb_sys_log}(4xx 이상 요청)이지 보안 감사가 아니다.
 *
 * <p><b>인가(H3)</b> — 엔드포인트는 관리자 홈 권한(DASHBOARD_ADMIN_READ)으로 들어오지만, 신호마다 그 원천을 조회하는 권한이 있을 때만
 * 싣는다: 후속 작업 DWORK_READ, 계정 USER_READ, 시스템 로그 SYS_LOG_READ. 권한이 없는 신호는 응답에서 빠진다 — 건수 하나라도 원천
 * 화면의 권한 없이 내보내지 않는다. 새 권한은 만들지 않는다.
 *
 * <p><b>셀 수 없는 값</b> — 조회가 실패한 신호는 {@code count} 가 null 이다(0 은 "없다" 는 사실 주장이다, unknownAsZero). 한 신호의
 * 실패가 다른 신호를 가리지 않는다. 요청마다 센다 — 관리자 홈만 부르고 세 COUNT 는 가볍다(재사용 캐시를 두지 않는다).
 * 각 COUNT와 그 트랜잭션 완료를 독립적으로 처리하여 PostgreSQL 오류 상태가 다음 COUNT로 전파되지 않게 한다.
 *
 * <p><b>오늘</b> — 시스템 로그의 발생일자({@code ocrn_ymd}, yyyyMMdd)는 기록할 때 서버 기본 시간대의 날짜로 쓴다
 * (OperationalAuditInterceptor 의 {@code LocalDateTime.now()}). 같은 시계로 오늘을 정해야 기록과 집계의 날짜가 같다.
 */
@Slf4j
@Service
@Transactional(readOnly = true)
public class OperationalSignalService {

    private static final DateTimeFormatter STORAGE_YMD = DateTimeFormatter.BASIC_ISO_DATE;

    private final DurableJobRepository durableJobs;
    private final UserRepository users;
    private final SysLogRepository sysLogs;
    private final Clock clock;
    private final TransactionTemplate countTransaction;

    @Autowired
    public OperationalSignalService(DurableJobRepository durableJobs, UserRepository users, SysLogRepository sysLogs,
            PlatformTransactionManager transactionManager) {
        this(durableJobs, users, sysLogs, transactionManager, Clock.systemDefaultZone());
    }

    OperationalSignalService(DurableJobRepository durableJobs, UserRepository users, SysLogRepository sysLogs,
            PlatformTransactionManager transactionManager, Clock clock) {
        this.durableJobs = Objects.requireNonNull(durableJobs);
        this.users = Objects.requireNonNull(users);
        this.sysLogs = Objects.requireNonNull(sysLogs);
        this.clock = Objects.requireNonNull(clock);
        this.countTransaction = new TransactionTemplate(Objects.requireNonNull(transactionManager));
        this.countTransaction.setReadOnly(true);
        this.countTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /** 보는 사람이 원천을 조회할 수 있는 신호만, 고정된 순서로 싣는다. */
    @Transactional(readOnly = true, propagation = Propagation.NOT_SUPPORTED)
    public OperationalSignals currentSignals() {
        Instant observedAt = clock.instant();
        List<OperationalSignal> signals = new ArrayList<>();
        for (Kind kind : Kind.values()) {
            if (SecurityUtil.hasPermission(kind.sourcePermission)) {
                signals.add(new OperationalSignal(kind, count(kind, observedAt)));
            }
        }
        return new OperationalSignals(observedAt, List.copyOf(signals));
    }

    private Long count(Kind kind, Instant observedAt) {
        LongSupplier query = switch (kind) {
            case FAILED_DURABLE_JOBS -> () -> durableJobs.countByPrcsSttsNm("FAILED");
            case LOCKED_ACCOUNTS -> () -> users.countByLckYn("Y");
            case FAILED_REQUESTS_TODAY -> () -> sysLogs.countByOcrnYmd(
                    LocalDate.ofInstant(observedAt, clock.getZone()).format(STORAGE_YMD));
        };
        try {
            return countTransaction.execute(status -> {
                long value = query.getAsLong();
                return value < 0 ? null : value;
            });
        } catch (RuntimeException unavailable) {
            log.warn("Operational signal {} could not be counted: {}", kind, unavailable.getClass().getSimpleName());
            return null;
        }
    }

    /** 신호 종류와 그 원천을 조회하는 권한. 순서가 화면의 순서다. */
    @Schema(description = "운영 신호 종류 — FAILED_DURABLE_JOBS 재시도 한도에 이른 후속 작업, LOCKED_ACCOUNTS 로그인 잠금 계정, "
            + "FAILED_REQUESTS_TODAY 오늘(서버 날짜) 기록된 실패 요청(4xx 이상, 시스템 로그)")
    public enum Kind {
        FAILED_DURABLE_JOBS("DWORK_READ"),
        LOCKED_ACCOUNTS("USER_READ"),
        FAILED_REQUESTS_TODAY("SYS_LOG_READ");

        private final String sourcePermission;

        Kind(String sourcePermission) {
            this.sourcePermission = sourcePermission;
        }
    }

    @Schema(description = "운영 신호 하나")
    public record OperationalSignal(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Kind kind,
            @Schema(description = "건수. 조회에 실패하면 null 이다(0 으로 채우지 않는다).",
                    requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0", nullable = true, types = {"integer", "null"})
            Long count) {
    }

    @Schema(description = "관리자 홈의 운영 신호 요약. 보는 사람이 원천을 조회할 수 있는 신호만 싣는다.")
    public record OperationalSignals(
            @Schema(description = "DB 에서 센 시각(UTC)", requiredMode = Schema.RequiredMode.REQUIRED) Instant observedAt,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<OperationalSignal> signals) {
    }
}
