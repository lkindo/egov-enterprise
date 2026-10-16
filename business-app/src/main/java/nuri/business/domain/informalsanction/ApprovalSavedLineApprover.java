package nuri.business.domain.informalsanction;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import nuri.foundation.domain.common.BaseEntity;

import java.util.Objects;

/**
 * 나의 결재선의 한 사람(V2_129). 단계(결재순서)와 사람이 기본 키이고, 단계의 유형은 결재 표와 같이 합의 여부로 둔다
 * ({@link ApprovalTemporaryDraftLine} 과 같은 모양). 결재자 자격은 저장할 때와 불러올 때 지금 기준으로 판정한다.
 */
@Entity
@Table(name = "tb_ifml_atrz_indv_apln_dtl")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ApprovalSavedLineApprover extends BaseEntity {
    @EmbeddedId
    private ApprovalSavedLineApproverId id;
    @Column(length = 1, nullable = false)
    private String acrdYn;

    public static ApprovalSavedLineApprover create(ApprovalSavedLineApproverId id, ApprovalStageKind kind) {
        ApprovalSavedLineApprover approver = new ApprovalSavedLineApprover();
        approver.id = Objects.requireNonNull(id);
        approver.acrdYn = Objects.requireNonNull(kind) == ApprovalStageKind.AGREEMENT ? "Y" : "N";
        return approver;
    }

    public ApprovalStageKind kind() {
        return "Y".equals(acrdYn) ? ApprovalStageKind.AGREEMENT : ApprovalStageKind.APPROVAL;
    }
}
