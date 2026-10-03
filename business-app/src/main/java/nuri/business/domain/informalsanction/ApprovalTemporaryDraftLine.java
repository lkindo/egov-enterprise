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
 * 임시저장한 결재선의 한 사람(V2_122). 단계(결재순서)와 사람이 기본 키이고, 단계의 유형은 결재 표와 같이 합의 여부로
 * 둔다({@link InformalSanctionDetail} 과 같은 모양). 결재자가 없는 단계는 저장할 수 없다 — 화면이 저장 전에 그 단계를
 * 빼고 그 사실을 말한다. 결재자 자격은 저장할 때 보지 않고 다시 열 때 지금 자격으로 판정한다.
 */
@Entity
@Table(name = "tb_ifml_atrz_tmpr_strg_dtl")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ApprovalTemporaryDraftLine extends BaseEntity {
    @EmbeddedId
    private ApprovalTemporaryDraftLineId id;
    @Column(length = 1, nullable = false)
    private String acrdYn;

    public static ApprovalTemporaryDraftLine create(ApprovalTemporaryDraftLineId id, ApprovalStageKind kind) {
        ApprovalTemporaryDraftLine line = new ApprovalTemporaryDraftLine();
        line.id = Objects.requireNonNull(id);
        line.acrdYn = Objects.requireNonNull(kind) == ApprovalStageKind.AGREEMENT ? "Y" : "N";
        return line;
    }

    public ApprovalStageKind kind() {
        return "Y".equals(acrdYn) ? ApprovalStageKind.AGREEMENT : ApprovalStageKind.APPROVAL;
    }
}
