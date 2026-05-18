package nuri.business.domain.informalsanction;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import java.time.LocalDateTime;

/**
 * 비정형 결재 Entity
 */
@Entity
@Table(name = "TB_IFML_ATRZ_INFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class InformalSanction extends BaseEntity {

    @Id
    @Column(name = "IFML_ATRZ_ID", length = 20)
    private String informalSanctionId;

    @Column(name = "TASK_SE_CD", length = 3, nullable = false)
    private String jobSeCode;

    @Column(name = "APLCNT_ID", length = 20, nullable = false)
    private String applicantId;

    @Column(name = "REQ_YMD", length = 10)
    private String requestDe;

    @Column(name = "APRVR_ID", length = 20, nullable = false)
    private String sanctionerId;

    @Column(name = "APRV_YN", length = 1)
    private String confmAt;

    @Column(name = "ATRZ_DT")
    private LocalDateTime sanctionDt;

    @Column(name = "RJCT_RSN_CN", length = 1000)
    private String returnResn;

    public void update(String jobSeCode, String requestDe, String sanctionerId) {
        validateRequestedState();
        this.jobSeCode = jobSeCode;
        this.requestDe = requestDe;
        this.sanctionerId = sanctionerId;
    }

    /**
     * 승인 처리
     */
    public void approve() {
        validateRequestedState();
        this.confmAt = SanctionStatus.APPROVED.getCode();
        this.sanctionDt = LocalDateTime.now();
        this.returnResn = null;
    }

    /**
     * 반려 처리
     */
    public void reject(String reason) {
        validateRequestedState();
        if (reason == null || reason.trim().isEmpty()) {
            throw new nuri.foundation.core.exception.BusinessException(
                "반려 사유는 필수입니다.", nuri.foundation.core.exception.ErrorCode.INVALID_INPUT_VALUE);
        }
        this.confmAt = SanctionStatus.REJECTED.getCode();
        this.returnResn = reason;
        this.sanctionDt = LocalDateTime.now();
    }

    private void validateRequestedState() {
        if (!SanctionStatus.REQUESTED.getCode().equals(this.confmAt)) {
            throw new nuri.foundation.core.exception.BusinessException(
                "이미 처리가 완료된 결재 건입니다. (현재 상태: " + SanctionStatus.fromCode(this.confmAt).getDescription() + ")",
                nuri.foundation.core.exception.ErrorCode.INVALID_STATE);
        }
    }
}
