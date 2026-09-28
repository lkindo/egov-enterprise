package nuri.business.domain.system.job;

import jakarta.persistence.LockModeType;
import java.math.BigInteger;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DurableJobRepository extends JpaRepository<DurableJob, BigInteger> {
    Optional<DurableJob> findByJobMngNo(String key);

    @Query(value = "SELECT * FROM tb_sys_job WHERE prcs_stts_nm IN ('PENDING','RETRY','RUNNING') "
            + "AND job_prnmnt_dt <= :now AND job_se_nm IN (:types) "
            + "ORDER BY job_prnmnt_dt,job_sn LIMIT 1 FOR UPDATE SKIP LOCKED", nativeQuery = true)
    Optional<DurableJob> claimNext(@Param("now") LocalDateTime now, @Param("types") Collection<String> types);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT j FROM DurableJob j WHERE j.jobSn = :id")
    Optional<DurableJob> findLocked(@Param("id") BigInteger id);
}
