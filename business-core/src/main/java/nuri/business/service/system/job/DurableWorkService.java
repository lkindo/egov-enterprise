package nuri.business.service.system.job;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Supplier;
import lombok.RequiredArgsConstructor;
import nuri.business.domain.system.job.DurableJob;
import nuri.business.domain.system.job.DurableJobRepository;
import nuri.foundation.core.job.DurableWork;
import nuri.foundation.core.job.DurableWorkPort;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DurableWorkService implements DurableWorkPort {
    private final DurableJobRepository repository;
    private final JdbcTemplate jdbc;

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void enqueue(DurableWork work) {
        DurableWork actual = enqueueOnce(work.key(), work.type(), work::payload);
        if (!actual.equals(work)) {
            throw new IllegalStateException("An existing intent key cannot be reused for different work");
        }
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public DurableWork enqueueOnce(UUID key, String type, Supplier<String> payloadFactory) {
        // Validate before executing a caller factory that can write domain data.
        new DurableWork(key, type, "");
        Objects.requireNonNull(payloadFactory, "payloadFactory");
        // PostgreSQL transaction locks share the caller's connection and release on commit/rollback.
        // The fixed namespace and UUID hash select a 64-bit lock; collisions only serialize work.
        jdbc.query("SELECT pg_advisory_xact_lock(?)", statement -> statement.setLong(1, lockKey(key)),
                (org.springframework.jdbc.core.RowCallbackHandler) row -> { });
        var existing = repository.findByJobMngNo(key.toString());
        if (existing.isPresent()) {
            DurableWork work = existing.get().work();
            if (!work.type().equals(type)) {
                throw new IllegalStateException("An existing intent key cannot change its work type");
            }
            return work;
        }
        DurableWork work = new DurableWork(key, type, payloadFactory.get());
        // Flush before the caller returns. A storage failure cannot be hidden by an after-commit callback.
        repository.saveAndFlush(DurableJob.pending(work, LocalDateTime.now(ZoneOffset.UTC)));
        return work;
    }

    private static long lockKey(UUID key) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(("nuri.durable-work.v1:" + key).getBytes(StandardCharsets.UTF_8));
            return ByteBuffer.wrap(digest).getLong();
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is required", impossible);
        }
    }
}
