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
    /** 지운 내용의 표시. 컬럼이 NOT NULL 인데 Oracle 은 빈 문자열이 NULL 이다. 내용은 모두 필드가 있는 JSON 이라 겹치지 않는다. */
    private static final String DISCARDED_PAYLOAD = "{}";

    @Column(name = "job_cn", length = 4000, nullable = false)
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
        jobPrnmntDt = now.plusSeconds(retryDelaySeconds(attempts));
        jobNo = null;
    }

    /** 첫 재시도까지의 대기(초). 실패할 때마다 두 배가 된다. */
    static final long FIRST_RETRY_DELAY_SECONDS = 30;
    /** 한 번의 대기 상한(초). */
    static final long MAXIMUM_RETRY_DELAY_SECONDS = 1800;

    /**
     * {@code attempts} 번째 시도가 실패한 뒤 다음 시도까지 기다릴 시간.
     *
     * <p>[2026-11-21] 종전 간격(2·4·…·128초, 8회 합계 약 254초)은 메일 서버·저장소가 5분만 멈춰도 그동안 접수한 작업을
     * 모두 {@code FAILED} 로 만들었다 — 메일은 그때 수신 주소를 지워 다시 보낼 수 없다. 30초에서 두 배씩 늘려 30분에서
     * 멈추면 8회 시도가 약 1시간(30+60+120+240+480+960+1800초) 동안 이어진다.
     */
    static long retryDelaySeconds(int attempts) {
        int doublings = Math.max(0, Math.min(attempts, 7) - 1);
        return Math.min(MAXIMUM_RETRY_DELAY_SECONDS, FIRST_RETRY_DELAY_SECONDS << doublings);
    }

    /** Exhausted jobs resume only while their payload survives; erased snapshots need a new acceptance. */
    public boolean retryable() {
        return "FAILED".equals(prcsSttsNm) && !payloadDiscarded();
    }

    public void retry(LocalDateTime now) {
        if (!retryable()) {
            throw new IllegalStateException("Only exhausted jobs can be retried");
        }
        prcsSttsNm = "PENDING";
        rtryNmtm = BigInteger.ZERO;
        jobPrnmntDt = now;
    }

    /** Only terminal delivery can erase an approved sensitive snapshot. */
    public void discardPayload() {
        if (!"SUCCEEDED".equals(prcsSttsNm) && !"FAILED".equals(prcsSttsNm)) {
            throw new IllegalStateException("Only terminal payloads can be discarded");
        }
        jobCn = DISCARDED_PAYLOAD;
    }

    /** 빈 문자열은 이 표시를 쓰기 전에 지운 행이다. */
    public boolean payloadDiscarded() {
        return jobCn.isEmpty() || DISCARDED_PAYLOAD.equals(jobCn);
    }
}
