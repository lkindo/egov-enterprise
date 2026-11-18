package nuri.business.service.system.job;

import java.math.BigInteger;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.system.job.DurableJobRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.Limit;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * 완료 상태({@code SUCCEEDED}) 영속 작업({@code tb_sys_job}) 보존·정리 스케줄러.
 *
 * <p>실패({@code FAILED})와 대기/실행({@code PENDING}/{@code RETRY}/{@code RUNNING}) 행은
 * 운영자 복구 및 실행 보장을 위해 절대 삭제하지 않는다. 기본값은 비활성({@code false})이며,
 * 활성화 시에도 보존일·배치 크기·실행당 최대 배치 수로 락 점유와 삭제량을 제한한다.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "nuri.durable-work.retention.enabled", havingValue = "true")
public class DurableJobRetentionScheduler {

    private static final int MAX_BATCH_SIZE = 5_000;
    private static final int MAX_BATCHES_PER_RUN = 1_000;

    private final DurableJobRepository repository;
    private final TransactionTemplate transactionTemplate;
    private final int retentionDays;
    private final int batchSize;
    private final int maxBatches;
    private final Clock clock;

    @Autowired
    public DurableJobRetentionScheduler(
            DurableJobRepository repository,
            PlatformTransactionManager transactionManager,
            @Value("${nuri.durable-work.retention.retention-days:30}") int retentionDays,
            @Value("${nuri.durable-work.retention.batch-size:500}") int batchSize,
            @Value("${nuri.durable-work.retention.max-batches-per-run:20}") int maxBatches) {
        this(repository, transactionManager, retentionDays, batchSize, maxBatches,
                Clock.system(ZoneId.of("Asia/Seoul")));
    }

    DurableJobRetentionScheduler(
            DurableJobRepository repository,
            PlatformTransactionManager transactionManager,
            int retentionDays,
            int batchSize,
            int maxBatches,
            Clock clock) {
        if (retentionDays < 1) {
            throw new IllegalArgumentException("nuri.durable-work.retention.retention-days must be >= 1");
        }
        if (batchSize < 1 || batchSize > MAX_BATCH_SIZE) {
            throw new IllegalArgumentException("nuri.durable-work.retention.batch-size must be between 1 and " + MAX_BATCH_SIZE);
        }
        if (maxBatches < 1 || maxBatches > MAX_BATCHES_PER_RUN) {
            throw new IllegalArgumentException("nuri.durable-work.retention.max-batches-per-run must be between 1 and " + MAX_BATCHES_PER_RUN);
        }
        this.repository = Objects.requireNonNull(repository, "repository must not be null");
        this.transactionTemplate = new TransactionTemplate(
                Objects.requireNonNull(transactionManager, "transactionManager must not be null"));
        this.retentionDays = retentionDays;
        this.batchSize = batchSize;
        this.maxBatches = maxBatches;
        this.clock = Objects.requireNonNull(clock, "clock must not be null");
    }

    @Scheduled(cron = "${nuri.durable-work.retention.cron:0 35 3 * * *}", zone = "Asia/Seoul")
    public int purgeExpiredSucceededJobs() {
        LocalDateTime cutoff = LocalDateTime.now(clock).minusDays(retentionDays);
        int totalDeleted = 0;
        for (int batch = 0; batch < maxBatches; batch++) {
            BatchResult result = transactionTemplate.execute(status -> {
                List<BigInteger> expiredIds = repository.findExpiredSucceededJobSns(cutoff, Limit.of(batchSize));
                if (expiredIds.isEmpty()) {
                    return new BatchResult(0, true);
                }
                int deleted = repository.deleteSucceededByJobSnIn(expiredIds);
                return new BatchResult(deleted, expiredIds.size() < batchSize);
            });
            if (result == null) {
                break;
            }
            totalDeleted += result.deleted();
            if (result.exhausted()) {
                break;
            }
        }
        if (totalDeleted > 0) {
            log.info("[durable-work-retention] {} 이전 완료(SUCCEEDED) 영속 작업 {}건 정리 (retention-days={})",
                    cutoff, totalDeleted, retentionDays);
        }
        return totalDeleted;
    }

    private record BatchResult(int deleted, boolean exhausted) {}
}
