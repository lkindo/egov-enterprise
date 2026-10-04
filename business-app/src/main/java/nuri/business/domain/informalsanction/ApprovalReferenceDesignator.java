package nuri.business.domain.informalsanction;

/**
 * 참조자를 누가 지정했는가(2026-10-04 D4). 저장하지 않는 파생 값이다 — 참조 행의 지정한 사람(esntlId)이 문서의 신청자면
 * 기안자, 아니면 결재자다(결재자는 신청자 본인일 수 없다).
 */
public enum ApprovalReferenceDesignator {
    /** 기안자가 상신·재상신 때 지정했다. */
    DRAFTER,
    /** 기안자가 그 차수에 아무도 지정하지 않아 지금 차례인 결재자가 더했다. */
    APPROVER;

    public static ApprovalReferenceDesignator of(InformalSanctionReference reference, String applicantId) {
        return reference.designatedBy(applicantId) ? DRAFTER : APPROVER;
    }
}
