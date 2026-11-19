package nuri.business.domain.system.job;

import jakarta.persistence.LockModeType;
import java.math.BigInteger;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Optional;
import java.util.List;
import jakarta.persistence.QueryHint;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

public interface DurableJobRepository extends JpaRepository<DurableJob, BigInteger> {
    Optional<DurableJob> findByJobMngNo(String key);

    /** 그 처리 상태인 작업 수 — 관리자 홈의 운영 신호(OperationalSignalService)가 FAILED 를 센다. 본문·식별자는 읽지 않는다. */
    long countByPrcsSttsNm(String prcsSttsNm);

    /** 잠긴 행은 건너뛴다. 페이징과 잠금 절은 Hibernate 가 벤더 문법으로 만든다(-2 는 SKIP LOCKED 다). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "-2"))
    @Query("SELECT j FROM DurableJob j WHERE j.prcsSttsNm IN ('PENDING','RETRY','RUNNING') "
            + "AND j.jobPrnmntDt <= :now AND j.jobSeNm IN :types "
            + "ORDER BY j.jobPrnmntDt, j.jobSn")
    List<DurableJob> findClaimable(@Param("now") LocalDateTime now, @Param("types") Collection<String> types, Limit limit);

    default Optional<DurableJob> claimNext(LocalDateTime now, Collection<String> types) {
        return findClaimable(now, types, Limit.of(1)).stream().findFirst();
    }

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT j FROM DurableJob j WHERE j.jobSn = :id")
    Optional<DurableJob> findLocked(@Param("id") BigInteger id);

    /** Same ownership predicate as DurableJob.ownsAttempt; renewal never consumes an attempt. */
    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE DurableJob j SET j.jobPrnmntDt = :leaseUntil "
            + "WHERE j.jobSn = :id AND j.prcsSttsNm = 'RUNNING' AND j.jobNo = :attempt")
    @QueryHints(@QueryHint(name = "jakarta.persistence.query.timeout", value = "2000"))
    int renewLease(@Param("id") BigInteger id, @Param("attempt") String attempt,
            @Param("leaseUntil") LocalDateTime leaseUntil);

    /** Read-only finite-state aggregation; payloads, identifiers and handler names never leave this query. */
    @Query(value = "SELECT prcs_stts_nm AS status, count(*) AS \"jobCount\", "
            + "min(CASE WHEN prcs_stts_nm IN ('PENDING','RETRY','RUNNING') AND job_prnmnt_dt <= :now "
            + "THEN job_prnmnt_dt ELSE NULL END) AS \"oldestDueAt\" FROM tb_sys_job GROUP BY prcs_stts_nm", nativeQuery = true)
    @QueryHints(@QueryHint(name = "jakarta.persistence.query.timeout", value = "3000"))
    @org.springframework.transaction.annotation.Transactional(readOnly = true, timeout = 5)
    List<QueueStateAggregate> summarizeQueue(@Param("now") LocalDateTime now);

    interface QueueStateAggregate {
        String getStatus();
        Long getJobCount();
        LocalDateTime getOldestDueAt();
    }
}
