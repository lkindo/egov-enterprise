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
    private String ifmlAtrzId;

    @Column(name = "task_se_cd", length = 12, nullable = false)
    private String taskSeCd;

    @Column(name = "aplcnt_id", length = 20, nullable = false)
    private String aplcntId;

    @Column(name = "req_ymd", length = 8)
    private String reqYmd;

    @Column(name = "aprvr_id", length = 20, nullable = false)
    private String aprvrId;

    @Column(name = "aprv_yn", length = 1)
    private String aprvYn;

    @Column(name = "atrz_dt")
    private LocalDateTime atrzDt;

    @Column(name = "rjct_rsn_cn", length = 4000)
    private String rjctRsnCn;

    public void update(String taskSeCd, String reqYmd, String aprvrId) {
        validateRequestedState();
        this.taskSeCd = taskSeCd;
        this.reqYmd = reqYmd;
        this.aprvrId = aprvrId;
    }

    /**
     * 승인 처리
     */
    public void approve() {
        validateRequestedState();
        this.aprvYn = SanctionStatus.APPROVED.getCode();
        this.atrzDt = LocalDateTime.now();
        this.rjctRsnCn = null;
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
        this.aprvYn = SanctionStatus.REJECTED.getCode();
        this.rjctRsnCn = reason;
        this.atrzDt = LocalDateTime.now();
    }

    private void validateRequestedState() {
        if (!SanctionStatus.REQUESTED.getCode().equals(this.aprvYn)) {
            throw new nuri.foundation.core.exception.BusinessException(
                "이미 처리가 완료된 결재 건입니다. (현재 상태: " + SanctionStatus.fromCode(this.aprvYn).getDescription() + ")",
                nuri.foundation.core.exception.ErrorCode.INVALID_STATE);
        }
    }

    // legacy aliases
    public String getInformalSanctionId() { return ifmlAtrzId; }
    public String getJobSeCode() { return taskSeCd; }
    public String getApplicantId() { return aplcntId; }
    public String getRequestDe() { return reqYmd; }
    public String getSanctionerId() { return aprvrId; }
    public String getConfmAt() { return aprvYn; }
    public LocalDateTime getSanctionDt() { return atrzDt; }
    public String getReturnResn() { return rjctRsnCn; }
}
