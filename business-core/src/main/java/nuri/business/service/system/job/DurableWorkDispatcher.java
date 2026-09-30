package nuri.business.service.system.job;

import java.math.BigInteger;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.system.job.DurableJobRepository;
import nuri.foundation.core.job.DurableWork;
import nuri.foundation.core.job.DurableWorkHandler;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/** Committed leases survive process death; side effects use stable identities and may be delivered again. */
@Slf4j
@Component
public class DurableWorkDispatcher {
    /**
     * 재시도 예산을 다 써서 FAILED 로 전이한 작업 수. FAILED 는 DWORK_RETRY 로 재처리하기 전까지 스스로 풀리지 않으므로
     * 경보의 원천이다(config/observability/prometheus-alert-rules.yml). type 은 등록된 실행기 유형이라 값이 유한하다.
     */
    public static final String FAILED_METRIC = "nuri.durable.work.failed";
    public static final String TYPE_TAG = "type";

    private final DurableJobRepository repository;
    private final Map<String, DurableWorkHandler> handlers;
    private final TransactionTemplate transaction;
    private final boolean enabled;
    private final ObjectProvider<MeterRegistry> meterRegistryProvider;
    private static final int MAXIMUM_ATTEMPTS = 8;
    private static final long LEASE_SECONDS = 120;

    /** 메트릭은 선택 주입이다 — 레지스트리가 없는 컨텍스트에서도 실행기 생성이 실패하지 않는다(RateLimitFilter 와 같다). */
    @Autowired
    public DurableWorkDispatcher(DurableJobRepository repository, List<DurableWorkHandler> handlers,
            PlatformTransactionManager manager, @Value("${nuri.durable-work.enabled:true}") boolean enabled,
            ObjectProvider<MeterRegistry> meterRegistryProvider) {
        this.repository = repository;
        this.enabled = enabled;
        this.meterRegistryProvider = meterRegistryProvider;
        Map<String, DurableWorkHandler> index = new LinkedHashMap<>();
        for (var handler : handlers) {
            if (index.putIfAbsent(handler.type(), handler) != null) {
                throw new IllegalStateException("Duplicate durable work handler");
            }
        }
        this.handlers = Map.copyOf(index);
        transaction = new TransactionTemplate(manager);
        transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /** 메트릭 없이 쓰는 생성자(테스트·수동 재기동 시나리오). */
    public DurableWorkDispatcher(DurableJobRepository repository, List<DurableWorkHandler> handlers,
            PlatformTransactionManager manager, boolean enabled) {
        this(repository, handlers, manager, enabled, null);
    }

    @Scheduled(fixedDelayString = "${nuri.durable-work.poll-ms:5000}", initialDelayString = "${nuri.durable-work.initial-delay-ms:10000}")
    public void dispatch() {
        if (!enabled) return;
        for (int index = 0; index < 20 && dispatchOne(); index++) {
            // Bounded work per poll prevents one queue from occupying this scheduler indefinitely.
        }
    }

    public boolean dispatchOne() {
        if (handlers.isEmpty()) return false;
        Claim claim = transaction.execute(status -> repository.claimNext(now(), handlers.keySet()).map(job -> {
            String attempt = job.claim(now(), MAXIMUM_ATTEMPTS, LEASE_SECONDS);
            return new Claim(job.getJobSn(), attempt, job.work());
        }).orElse(null));
        if (claim == null) return false;
        if (claim.attempt() == null) return true;
        boolean success;
        try {
            handlers.get(claim.work().type()).execute(claim.work());
            success = true;
        } catch (RuntimeException failure) {
            // Do not copy payloads, paths, identifiers, tokens, or exception messages into logs.
            log.warn("Durable delivery failed: type={}, failure={}", claim.work().type(), failure.getClass().getSimpleName());
            success = false;
        }
        boolean delivered = success;
        Boolean exhausted = transaction.execute(status -> repository.findLocked(claim.id()).map(job -> {
            if (!job.ownsAttempt(claim.attempt())) return false;
            if (delivered) {
                job.succeeded(now());
                return false;
            }
            job.failed(now(), MAXIMUM_ATTEMPTS);
            return "FAILED".equals(job.getPrcsSttsNm());
        }).orElse(false));
        // 커밋된 전이만 센다 — 전이 트랜잭션이 롤백되면 execute 가 예외를 던져 여기에 오지 않는다.
        if (Boolean.TRUE.equals(exhausted)) recordExhausted(claim.work().type());
        return true;
    }

    private void recordExhausted(String type) {
        MeterRegistry registry = meterRegistryProvider == null ? null : meterRegistryProvider.getIfAvailable();
        if (registry != null) {
            registry.counter(FAILED_METRIC, TYPE_TAG, type).increment();
        }
    }

    private static LocalDateTime now() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    private record Claim(BigInteger id, String attempt, DurableWork work) {}
}
