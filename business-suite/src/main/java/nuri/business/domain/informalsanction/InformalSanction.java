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
@Table(name = "tb_ifml_atrz_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class InformalSanction extends BaseEntity {

    @Id
    @Column(name = "ifml_atrz_id", length = 20)
    private String informalSanctionId;

    @Column(name = "task_se_cd", length = 12, nullable = false)
    private String jobSeCode;

    @Column(name = "aplcnt_id", length = 20, nullable = false)
    private String applicantId;

    @Column(name = "req_ymd", length = 8)
    private String requestDe;

    @Column(name = "aprvr_id", length = 20, nullable = false)
    private String sanctionerId;

    @Column(name = "aprv_yn", length = 1)
    private String confmAt;

    @Column(name = "atrz_dt")
    private LocalDateTime sanctionDt;

    @Column(name = "rjct_rsn_cn", length = 4000)
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
