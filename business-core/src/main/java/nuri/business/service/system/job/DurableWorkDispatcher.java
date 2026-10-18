package nuri.business.service.system.job;

import java.math.BigInteger;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ScheduledFuture;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.system.job.DurableJobRepository;
import nuri.foundation.core.job.DurableWork;
import nuri.foundation.core.job.DurableWorkHandler;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.TaskScheduler;
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
     * 실행 중 발생한 전이를 세는 진단용 누적 counter다. 재기동 이전 FAILED와 대기 적체의 경보는
     * DurableWorkMetrics의 영속 DB 상태 gauge를 사용한다. type은 등록된 실행기 유형이라 값이 유한하다.
     */
    public static final String FAILED_METRIC = "nuri.durable.work.failed";
    public static final String TYPE_TAG = "type";

    private final DurableJobRepository repository;
    private final Map<String, DurableWorkHandler> handlers;
    private final Map<String, Integer> runningCounts = new LinkedHashMap<>();
    private final TransactionTemplate transaction;
    private final TransactionTemplate heartbeatTransaction;
    private final boolean enabled;
    private final ObjectProvider<MeterRegistry> meterRegistryProvider;
    private final Executor workers;
    private final TaskScheduler scheduler;
    private static final int MAXIMUM_ATTEMPTS = 8;
    private static final long LEASE_SECONDS = 120;
    private static final Duration HEARTBEAT_INTERVAL = Duration.ofSeconds(30);

    /** 메트릭은 선택 주입이다 — 레지스트리가 없는 컨텍스트에서도 실행기 생성이 실패하지 않는다(RateLimitFilter 와 같다). */
    @Autowired
    public DurableWorkDispatcher(DurableJobRepository repository, List<DurableWorkHandler> handlers,
            PlatformTransactionManager manager, @Value("${nuri.durable-work.enabled:true}") boolean enabled,
            ObjectProvider<MeterRegistry> meterRegistryProvider,
            @Qualifier(DurableWorkSchedulingConfig.EXECUTOR_BEAN) Executor workers,
            @Qualifier(DurableWorkSchedulingConfig.SCHEDULER_BEAN) TaskScheduler scheduler) {
        this.repository = repository;
        this.enabled = enabled;
        this.meterRegistryProvider = meterRegistryProvider;
        this.workers = workers;
        this.scheduler = scheduler;
        Map<String, DurableWorkHandler> index = new LinkedHashMap<>();
        for (var handler : handlers) {
            if (handler.maximumConcurrentExecutions() < 1) {
                throw new IllegalArgumentException("Durable work concurrency limit must be positive");
            }
            if (index.putIfAbsent(handler.type(), handler) != null) {
                throw new IllegalStateException("Duplicate durable work handler");
            }
        }
        this.handlers = Map.copyOf(index);
        transaction = new TransactionTemplate(manager);
        transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        heartbeatTransaction = new TransactionTemplate(manager);
        heartbeatTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        heartbeatTransaction.setTimeout(3);
    }

    /** Synchronous manual workers keep the existing crash/expired-lease rehearsal semantics. */
    public DurableWorkDispatcher(DurableJobRepository repository, List<DurableWorkHandler> handlers,
            PlatformTransactionManager manager, boolean enabled, ObjectProvider<MeterRegistry> meterRegistryProvider) {
        this(repository, handlers, manager, enabled, meterRegistryProvider, Runnable::run, null);
    }

    /** 메트릭 없이 쓰는 생성자(테스트·수동 재기동 시나리오). */
    public DurableWorkDispatcher(DurableJobRepository repository, List<DurableWorkHandler> handlers,
            PlatformTransactionManager manager, boolean enabled) {
        this(repository, handlers, manager, enabled, null);
    }

    @Scheduled(scheduler = DurableWorkSchedulingConfig.SCHEDULER_BEAN,
            fixedDelayString = "${nuri.durable-work.poll-ms:5000}", initialDelayString = "${nuri.durable-work.initial-delay-ms:10000}")
    public void dispatch() {
        if (!enabled) return;
        for (int index = 0; index < DurableWorkSchedulingConfig.WORKER_COUNT; index++) {
            try {
                // Submit before claiming. Saturation leaves the intent untouched for the next poll.
                workers.execute(this::dispatchAvailable);
            } catch (RejectedExecutionException saturated) {
                return;
            }
        }
    }

    private void dispatchAvailable() {
        try {
            for (int index = 0; index < 20 && !Thread.currentThread().isInterrupted() && dispatchOne(); index++) {
                // Keep each admitted drain finite while retaining throughput for short jobs.
            }
        } catch (RuntimeException failure) {
            log.warn("Durable worker deferred: failure={}", failure.getClass().getSimpleName());
        }
    }

    public boolean dispatchOne() {
        Claim claim = claimAvailable();
        if (claim == null) return false;
        if (claim.attempt() == null) return true;
        try {
            return executeAndAcknowledge(claim);
        } finally {
            releaseExecution(claim.work().type());
        }
    }

    /** Claim commit and local reservation are atomic; handler I/O and acknowledgement never hold this monitor. */
    private synchronized Claim claimAvailable() {
        List<String> eligibleTypes = handlers.entrySet().stream()
                .filter(entry -> runningCounts.getOrDefault(entry.getKey(), 0)
                        < entry.getValue().maximumConcurrentExecutions())
                .map(Map.Entry::getKey).toList();
        if (eligibleTypes.isEmpty()) return null;
        Claim claim = transaction.execute(status -> repository.claimNext(now(), eligibleTypes).map(job -> {
            DurableWork work = job.work();
            String attempt = job.claim(now(), MAXIMUM_ATTEMPTS, LEASE_SECONDS);
            if (attempt == null) completePayload(job, work, false);
            return new Claim(job.getJobSn(), attempt, work);
        }).orElse(null));
        if (claim != null && claim.attempt() != null) {
            runningCounts.merge(claim.work().type(), 1, Integer::sum);
        }
        return claim;
    }

    private synchronized void releaseExecution(String type) {
        int remaining = runningCounts.get(type) - 1;
        if (remaining == 0) runningCounts.remove(type);
        else runningCounts.put(type, remaining);
    }

    private boolean executeAndAcknowledge(Claim claim) {
        boolean success;
        ScheduledFuture<?> heartbeat = null;
        try {
            if (scheduler != null) {
                heartbeat = scheduler.scheduleWithFixedDelay(() -> renewLease(claim),
                        Instant.now().plus(HEARTBEAT_INTERVAL), HEARTBEAT_INTERVAL);
            }
            handlers.get(claim.work().type()).execute(claim.work());
            success = true;
        } catch (RuntimeException failure) {
            // Do not copy payloads, paths, identifiers, tokens, or exception messages into logs.
            log.warn("Durable delivery failed: type={}, failure={}", claim.work().type(), failure.getClass().getSimpleName());
            success = false;
        } finally {
            if (heartbeat != null) heartbeat.cancel(false);
        }
        boolean delivered = success;
        Boolean exhausted = transaction.execute(status -> repository.findLocked(claim.id()).map(job -> {
            if (!job.ownsAttempt(claim.attempt())) return false;
            if (delivered) {
                job.succeeded(now());
                completePayload(job, claim.work(), true);
                return false;
            }
            job.failed(now(), MAXIMUM_ATTEMPTS);
            if ("FAILED".equals(job.getPrcsSttsNm())) completePayload(job, claim.work(), false);
            return "FAILED".equals(job.getPrcsSttsNm());
        }).orElse(false));
        // 커밋된 전이만 센다 — 전이 트랜잭션이 롤백되면 execute 가 예외를 던져 여기에 오지 않는다.
        if (Boolean.TRUE.equals(exhausted)) recordExhausted(claim.work().type());
        return true;
    }

    private void renewLease(Claim claim) {
        try {
            // The same RUNNING + attempt token predicate as ownsAttempt fences stale heartbeats.
            // A dead process stops renewing; another worker can reclaim after the 120-second lease.
            heartbeatTransaction.executeWithoutResult(status -> repository.renewLease(
                    claim.id(), claim.attempt(), now().plusSeconds(LEASE_SECONDS)));
        } catch (RuntimeException failure) {
            log.warn("Durable lease renewal deferred: type={}, failure={}",
                    claim.work().type(), failure.getClass().getSimpleName());
        }
    }

    private void completePayload(nuri.business.domain.system.job.DurableJob job, DurableWork work, boolean succeeded) {
        DurableWorkHandler handler = handlers.get(work.type());
        handler.onTerminal(work, succeeded);
        if (handler.discardPayloadOnCompletion()) job.discardPayload();
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
