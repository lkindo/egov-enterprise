package nuri.business.domain.log;

import java.time.LocalDateTime;

public interface SensitiveAuditLogRepositoryCustom {
    /**
     * 보존 기간이 지난 민감 작업 감사 행을 지운다. 호출 측(LogRetentionScheduler)이 보존 하한(24개월)을 지킨다.
     *
     * <p>[2026-10-18 V2_132] 이 표는 DB 트리거가 수정·삭제를 막는다. 이 정리만 같은 트랜잭션에서 삭제를 선언하고 지운다.
     *
     * @return 지운 행 수
     */
    int deleteBefore(LocalDateTime cutoff);
}
