package nuri.business.service.system.job;

import java.math.BigInteger;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.system.job.DurableJobRepository;
import nuri.foundation.core.job.DurableWork;
import nuri.foundation.core.job.DurableWorkHandler;
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
    private final DurableJobRepository repository;
    private final Map<String, DurableWorkHandler> handlers;
    private final TransactionTemplate transaction;
    private final boolean enabled;
    private static final int MAXIMUM_ATTEMPTS = 8;
    private static final long LEASE_SECONDS = 120;

    public DurableWorkDispatcher(DurableJobRepository repository, List<DurableWorkHandler> handlers,
            PlatformTransactionManager manager, @Value("${nuri.durable-work.enabled:true}") boolean enabled) {
        this.repository = repository;
        this.enabled = enabled;
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
        transaction.executeWithoutResult(status -> repository.findLocked(claim.id()).ifPresent(job -> {
            if (!job.ownsAttempt(claim.attempt())) return;
            if (delivered) job.succeeded(now());
            else job.failed(now(), MAXIMUM_ATTEMPTS);
        }));
        return true;
    }

    private static LocalDateTime now() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    private record Claim(BigInteger id, String attempt, DurableWork work) {}
}
