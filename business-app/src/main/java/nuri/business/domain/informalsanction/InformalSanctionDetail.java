package nuri.business.domain.informalsanction;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.domain.common.BaseEntity;

import java.time.LocalDateTime;

@Entity
@Table(name = "tb_ifml_atrz_dtl")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InformalSanctionDetail extends BaseEntity {
    @EmbeddedId
    private InformalSanctionDetailId id;
    @Column(length = 1, nullable = false)
    private String acrdYn;
    @Column(length = 1, nullable = false)
    private String aprvYn;
    @Column(length = 4000)
    private String atrzOpnnCn;
    private LocalDateTime atrzDt;

    public static InformalSanctionDetail create(InformalSanctionDetailId id,
                                               ApprovalStageKind kind, boolean active) {
        InformalSanctionDetail detail = new InformalSanctionDetail();
        detail.id = id;
        detail.acrdYn = kind == ApprovalStageKind.AGREEMENT ? "Y" : "N";
        detail.aprvYn = (active ? ApprovalStatus.ACTIVE : ApprovalStatus.WAITING).getCode();
        return detail;
    }

    public ApprovalStatus status() { return ApprovalStatus.fromCode(aprvYn); }
    public ApprovalStageKind kind() {
        return "Y".equals(acrdYn) ? ApprovalStageKind.AGREEMENT : ApprovalStageKind.APPROVAL;
    }

    public void decide(boolean approved, String opinion, LocalDateTime decidedAt) {
        if (status() != ApprovalStatus.ACTIVE) throw new BusinessException(CommonErrorCode.INVALID_STATE);
        if (opinion != null && opinion.length() > 4000) throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
        if (!approved && (opinion == null || opinion.isBlank())) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "반려 사유는 필수입니다.");
        }
        this.aprvYn = (approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED).getCode();
        this.atrzOpnnCn = opinion;
        this.atrzDt = decidedAt;
    }

    /**
     * 같은 자리(차수·단계·유형·상태)를 다른 사람에게 넘긴 새 줄을 만든다(2026-10-03 D6). 기본 키에 사용자가 있어
     * 서비스가 이 줄을 지우고 새 줄을 넣는다. 이미 결정한 줄은 넘길 수 없다.
     */
    public InformalSanctionDetail reassignTo(String userId) {
        if (status() != ApprovalStatus.WAITING && status() != ApprovalStatus.ACTIVE) {
            throw new BusinessException(CommonErrorCode.INVALID_STATE, "이미 처리한 결재자는 바꿀 수 없습니다.");
        }
        InformalSanctionDetail replacement = new InformalSanctionDetail();
        replacement.id = new InformalSanctionDetailId(id.getIfmlAtrzSn(), id.getAtrzCycl(), id.getAtrzSeq(), userId);
        replacement.acrdYn = this.acrdYn;
        replacement.aprvYn = this.aprvYn;
        return replacement;
    }

    public void activate() {
        if (status() != ApprovalStatus.WAITING) throw new BusinessException(CommonErrorCode.INVALID_STATE);
        this.aprvYn = ApprovalStatus.ACTIVE.getCode();
    }

    public void cancel() {
        if (status() == ApprovalStatus.WAITING || status() == ApprovalStatus.ACTIVE) {
            this.aprvYn = ApprovalStatus.CANCELLED.getCode();
        }
    }
}
