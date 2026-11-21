package nuri.business.service.system.job;

import java.math.BigInteger;
import java.time.LocalDateTime;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.system.job.DurableJobRepository;
import nuri.foundation.core.util.ServiceTime;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * 완료된 내구성 작업({@code tb_sys_job}, {@code prcs_stts_nm='SUCCEEDED'}) 보존·정리 스케줄러.
 *
 * <p>완료 이력은 재발행 중복 방지 근거이기도 하므로 기본 비활성({@code nuri.durable-work.retention.enabled=false})이며,
 * 활성화 시에도 보존일수({@code days}) 미만 또는 {@value #MIN_DAYS}일 미만 설정에서는 삭제하지 않는다.
 * {@code FAILED}·{@code PENDING}·{@code RETRY}·{@code RUNNING} 상태는 대상에서 제외한다.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "nuri.durable-work.retention.enabled", havingValue = "true")
public class DurableJobRetentionScheduler {
    /** 이 미만의 보존일은 미설정·오설정으로 본다 — 삭제하지 않는다. */
    static final int MIN_DAYS = 1;
    static final int BATCH_SIZE = 500;
    static final int MAX_BATCHES_PER_RUN = 20;

    private final DurableJobRepository durableJobRepository;
    private final TransactionTemplate transactionTemplate;
    private int retentionDays;

    @Autowired
    public DurableJobRetentionScheduler(
            DurableJobRepository durableJobRepository,
            PlatformTransactionManager transactionManager,
            @Value("${nuri.durable-work.retention.days:30}") int retentionDays) {
        this.durableJobRepository = durableJobRepository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.retentionDays = retentionDays;
    }

    /**
     * 매일 05:00(Asia/Seoul) — 알림(04:30)·SMS 이력 정리(04:45) 뒤에 돈다. cron 은 {@code nuri.durable-work.retention.cron} 으로 재정의 가능.
     */
    @Scheduled(cron = "${nuri.durable-work.retention.cron:0 0 5 * * *}", zone = "Asia/Seoul")
    public int purgeSucceededJobs() {
        if (retentionDays < MIN_DAYS) {
            log.warn("[durable-work-retention] days={} 가 {} 미만 → 완료 작업 정리를 건너뜀(전량파기 방지)",
                    retentionDays, MIN_DAYS);
            return 0;
        }
        LocalDateTime cutoff = ServiceTime.now().minusDays(retentionDays);
        int totalDeleted = 0;
        for (int batch = 0; batch < MAX_BATCHES_PER_RUN; batch++) {
            Integer deleted = transactionTemplate.execute(status -> {
                List<BigInteger> ids = durableJobRepository.findSucceededIdsCompletedBefore(
                        cutoff, PageRequest.of(0, BATCH_SIZE));
                if (ids.isEmpty()) {
                    return 0;
                }
                return durableJobRepository.deleteSucceededByIdIn(ids);
            });
            int batchCount = deleted != null ? deleted : 0;
            totalDeleted += batchCount;
            if (batchCount < BATCH_SIZE) {
                break;
            }
        }
        log.info("[durable-work-retention] {} 이전에 완료된 SUCCEEDED 작업 {}건 정리 (days={})",
                cutoff, totalDeleted, retentionDays);
        return totalDeleted;
    }
}
