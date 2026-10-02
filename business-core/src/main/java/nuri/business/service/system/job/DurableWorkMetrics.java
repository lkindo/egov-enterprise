package nuri.business.service.system.job;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.Duration;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.system.job.DurableJobRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Cached committed queue state; metrics scrapes never query the database. */
@Slf4j
@Component
public class DurableWorkMetrics {
    public static final String ENABLED = "nuri.durable.work.enabled";
    public static final String JOBS = "nuri.durable.work.jobs";
    public static final String OLDEST_DUE_AGE = "nuri.durable.work.oldest.due.age.seconds";
    public static final String OBSERVATION_HEALTHY = "nuri.durable.work.observation.healthy";
    public static final String OBSERVATION_AGE = "nuri.durable.work.observation.age.seconds";
    public static final String STATUS_TAG = "status";
    public static final List<String> STATUSES = List.of("PENDING", "RUNNING", "RETRY", "SUCCEEDED", "FAILED");
    private final DurableJobRepository repository;
    private final Clock clock;
    private volatile Snapshot snapshot;
    private volatile boolean observationHealthy;

    @Autowired
    public DurableWorkMetrics(DurableJobRepository repository, MeterRegistry registry,
            @Value("${nuri.durable-work.enabled:true}") boolean enabled) {
        this(repository, registry, enabled, Clock.systemUTC());
    }

    public DurableWorkMetrics(DurableJobRepository repository, MeterRegistry registry, boolean enabled, Clock clock) {
        this.repository = repository;
        this.clock = clock;
        snapshot = new Snapshot(Map.of(), clock.instant().getEpochSecond());
        Gauge.builder(ENABLED, () -> enabled ? 1 : 0).register(registry);
        for (String status : STATUSES) {
            Gauge.builder(JOBS, this, value -> value.state(status).count()).tag(STATUS_TAG, status).register(registry);
            Gauge.builder(OLDEST_DUE_AGE, this, value -> value.dueAge(status)).tag(STATUS_TAG, status).register(registry);
        }
        Gauge.builder(OBSERVATION_HEALTHY, this, value -> value.observationHealthy ? 1 : 0).register(registry);
        Gauge.builder(OBSERVATION_AGE, this, value -> Math.max(0, value.clock.instant().getEpochSecond() - value.snapshot.observedAt())).register(registry);
    }

    @Scheduled(fixedDelayString = "${nuri.durable-work.metrics-poll-ms:30000}", initialDelayString = "${nuri.durable-work.metrics-initial-delay-ms:1000}")
    public synchronized void refresh() {
        try {
            Map<String, State> next = new LinkedHashMap<>();
            for (var row : repository.summarizeQueue(LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC))) {
                String status = row.getStatus();
                if (!STATUSES.contains(status) || row.getJobCount() == null || row.getJobCount() < 0
                        || next.containsKey(status)) throw new IllegalStateException("Invalid durable queue aggregate");
                next.put(status, new State(row.getJobCount(), row.getOldestDueAt()));
            }
            snapshot = new Snapshot(Map.copyOf(next), clock.instant().getEpochSecond());
            observationHealthy = true;
        } catch (RuntimeException unavailable) {
            observationHealthy = false;
            log.warn("Durable queue metrics refresh failed: {}", unavailable.getClass().getSimpleName());
        }
    }

    private State state(String status) { return snapshot.states().getOrDefault(status, new State(0, null)); }
    private double dueAge(String status) {
        LocalDateTime due = state(status).oldestDue();
        return due == null ? 0 : Math.max(0, Duration.between(due.toInstant(ZoneOffset.UTC), clock.instant()).getSeconds());
    }
    private record State(long count, LocalDateTime oldestDue) { }
    private record Snapshot(Map<String, State> states, long observedAt) { }
}
