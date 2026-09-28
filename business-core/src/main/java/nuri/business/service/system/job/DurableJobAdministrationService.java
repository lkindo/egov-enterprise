package nuri.business.service.system.job;

import java.math.BigInteger;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import lombok.RequiredArgsConstructor;
import nuri.business.domain.system.job.DurableJob;
import nuri.business.domain.system.job.DurableJobRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.foundation.core.audit.SensitiveAuditPort;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Operators see delivery state, never the payload. Retrying is explicit and audited. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DurableJobAdministrationService {
    private final DurableJobRepository repository;
    private final SensitiveAuditPort audit;

    public Page<Status> getJobs(int page, int size) {
        SecurityUtil.assertPermission("DWORK_READ");
        if (page < 0 || size < 1 || size > 100) throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
        return repository.findAll(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "jobSn"))).map(Status::from);
    }

    @Transactional
    public void retry(BigInteger jobSn) {
        SecurityUtil.assertPermission("DWORK_RETRY");
        DurableJob job = repository.findLocked(jobSn)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        if (!"FAILED".equals(job.getPrcsSttsNm())) throw new BusinessException(CommonErrorCode.INVALID_STATE);
        job.retry(LocalDateTime.now(ZoneOffset.UTC));
        audit.recordMutation("DURABLE_WORK_RETRY", jobSn.toString());
    }

    public record Status(String id, String type, String status, int attempts, LocalDateTime availableAt,
                         LocalDateTime completedAt) {
        static Status from(DurableJob job) {
            return new Status(job.getJobSn().toString(), job.getJobSeNm(), job.getPrcsSttsNm(),
                    job.getRtryNmtm().intValueExact(), job.getJobPrnmntDt(), job.getJobCmptnDt());
        }
    }
}
