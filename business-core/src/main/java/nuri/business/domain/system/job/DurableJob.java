package nuri.business.domain.system.job;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigInteger;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import nuri.foundation.core.job.DurableWork;
import nuri.foundation.domain.common.BaseEntity;

/** A durable intent and bounded delivery state, shared by file removal and notification delivery. */
@Entity
@Table(name = "tb_sys_job", uniqueConstraints = @UniqueConstraint(
        name = "uk_tb_sys_job_job_mng_no", columnNames = "job_mng_no"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DurableJob extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "durableJobSequence")
    @SequenceGenerator(name = "durableJobSequence", sequenceName = "sq_sys_job", allocationSize = 1)
    @Column(name = "job_sn", precision = 22, scale = 0)
    private BigInteger jobSn;

    @Column(name = "job_mng_no", length = 50, nullable = false, updatable = false)
    private String jobMngNo;
    @Column(name = "job_se_nm", length = 100, nullable = false, updatable = false)
    private String jobSeNm;
    @Column(name = "job_cn", length = 4000, nullable = false, updatable = false)
    private String jobCn;
    @Column(name = "prcs_stts_nm", length = 300, nullable = false)
    private String prcsSttsNm;
    @Column(name = "rtry_nmtm", precision = 10, scale = 0, nullable = false)
    private BigInteger rtryNmtm;
    /** An attempt identifier fences acknowledgements from a worker whose lease expired. */
    @Column(name = "job_no", length = 20)
    private String jobNo;
    @Column(name = "job_prnmnt_dt", nullable = false)
    private LocalDateTime jobPrnmntDt;
    @Column(name = "job_cmptn_dt")
    private LocalDateTime jobCmptnDt;

    public static DurableJob pending(DurableWork work, LocalDateTime now) {
        DurableJob job = new DurableJob();
        job.jobMngNo = work.key().toString();
        job.jobSeNm = work.type();
        job.jobCn = work.payload();
        job.prcsSttsNm = "PENDING";
        job.rtryNmtm = BigInteger.ZERO;
        job.jobPrnmntDt = now;
        return job;
    }

    public DurableWork work() {
        return new DurableWork(UUID.fromString(jobMngNo), jobSeNm, jobCn);
    }

    public String claim(LocalDateTime now, int maximumAttempts, long leaseSeconds) {
        if (rtryNmtm.intValueExact() >= maximumAttempts) {
            prcsSttsNm = "FAILED";
            jobNo = null;
            return null;
        }
        rtryNmtm = rtryNmtm.add(BigInteger.ONE);
        prcsSttsNm = "RUNNING";
        jobNo = UUID.randomUUID().toString().replace("-", "").substring(0, 20);
        jobPrnmntDt = now.plusSeconds(leaseSeconds);
        return jobNo;
    }

    public boolean ownsAttempt(String attempt) {
        return "RUNNING".equals(prcsSttsNm) && jobNo != null && jobNo.equals(attempt);
    }

    public void succeeded(LocalDateTime now) {
        prcsSttsNm = "SUCCEEDED";
        jobCmptnDt = now;
        jobNo = null;
    }

    public void failed(LocalDateTime now, int maximumAttempts) {
        int attempts = rtryNmtm.intValueExact();
        prcsSttsNm = attempts >= maximumAttempts ? "FAILED" : "RETRY";
        jobPrnmntDt = now.plusSeconds(Math.min(300, 1L << Math.min(attempts, 8)));
        jobNo = null;
    }

    public void retry(LocalDateTime now) {
        if (!"FAILED".equals(prcsSttsNm)) {
            throw new IllegalStateException("Only exhausted jobs can be retried");
        }
        prcsSttsNm = "PENDING";
        rtryNmtm = BigInteger.ZERO;
        jobPrnmntDt = now;
    }
}
