package nuri.business.service.file;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Clock;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Always present, aggregate-only gauges. Scrapes perform no storage I/O. */
@Component
public class AttachmentIntegrityMetrics {
    public static final String ENABLED = "nuri.attachment.integrity.enabled";
    public static final String HEALTHY_AGE = "nuri.attachment.integrity.healthy.age.seconds";
    public static final String LAST_RUN_UNHEALTHY = "nuri.attachment.integrity.last.run.unhealthy";
    public static final String OBSERVATION_HEALTHY = "nuri.attachment.integrity.observation.healthy";
    private static final Set<String> OUTCOMES = Set.of("PASS", "DRIFT", "INCOMPLETE", "FAILED", "REPORT_FAILED");
    private final AttachmentIntegrityReportStore store;
    private final boolean enabled;
    private final Clock clock;
    private volatile AttachmentIntegrityReportStore.HealthState state;
    private volatile boolean observationHealthy;

    @Autowired
    public AttachmentIntegrityMetrics(AttachmentIntegrityReportStore store, MeterRegistry registry,
            @Value("${nuri.attachment.integrity.enabled:false}") boolean enabled) {
        this(store, registry, enabled, Clock.systemUTC());
    }

    AttachmentIntegrityMetrics(AttachmentIntegrityReportStore store, MeterRegistry registry, boolean enabled, Clock clock) {
        this.store = store;
        this.enabled = enabled;
        this.clock = clock;
        state = new AttachmentIntegrityReportStore.HealthState(1, now(), 0, false);
        if (enabled) {
            try {
                var existing = store.loadHealth();
                if (existing.isPresent()) {
                    var restored = existing.get();
                    if (restored.observedSinceEpochSeconds() > now() || restored.lastHealthyEpochSeconds() > now()) {
                        throw new IllegalStateException("Integrity health anchors are in the future");
                    }
                    state = restored;
                }
                store.saveHealth(state);
                observationHealthy = true;
            } catch (Exception unavailable) {
                observationHealthy = false;
            }
        }
        Gauge.builder(ENABLED, this, value -> value.enabled ? 1 : 0).register(registry);
        Gauge.builder(HEALTHY_AGE, this, AttachmentIntegrityMetrics::healthyAgeSeconds).register(registry);
        Gauge.builder(LAST_RUN_UNHEALTHY, this, value -> value.enabled && value.state.lastRunUnhealthy() ? 1 : 0).register(registry);
        Gauge.builder(OBSERVATION_HEALTHY, this, value -> value.enabled && value.observationHealthy ? 1 : 0).register(registry);
    }

    public synchronized void recordOutcome(String outcome) {
        if (!enabled) return;
        if (!OUTCOMES.contains(outcome)) throw new IllegalArgumentException("Unknown integrity scan outcome");
        state = new AttachmentIntegrityReportStore.HealthState(1, state.observedSinceEpochSeconds(),
                "PASS".equals(outcome) ? now() : state.lastHealthyEpochSeconds(), !"PASS".equals(outcome));
        try {
            store.saveHealth(state);
            observationHealthy = !"REPORT_FAILED".equals(outcome);
        } catch (Exception unavailable) {
            observationHealthy = false;
        }
    }

    private double healthyAgeSeconds() {
        if (!enabled) return 0;
        var current = state;
        long anchor = current.lastHealthyEpochSeconds() == 0 ? current.observedSinceEpochSeconds() : current.lastHealthyEpochSeconds();
        return Math.max(0, now() - anchor);
    }

    private long now() { return clock.instant().getEpochSecond(); }
}
