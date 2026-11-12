package nuri.business.domain.event;

/**
 * 행사 참가 신청 상태({@code tb_evnt_aply.aply_stts_cd}, V2_152 CHECK 와 같은 어휘).
 *
 * <ul>
 *   <li>{@code APPLIED} — 신청. 자리를 차지한다.</li>
 *   <li>{@code APPROVED} — 관리자가 승인. 자리를 차지한다.</li>
 *   <li>{@code REJECTED} — 관리자가 반려. 자리를 돌려준다. 다시 신청할 수 없다(반려 결정을 신청으로 덮지 않는다).</li>
 *   <li>{@code CANCELLED} — 본인 취소. 자리를 돌려준다. 마감 전이면 같은 행으로 다시 신청한다.</li>
 * </ul>
 */
public enum EventApplicationStatus {
    APPLIED, APPROVED, REJECTED, CANCELLED;

    /** 정원을 세는 상태인가. */
    public boolean occupiesSeat() {
        return this == APPLIED || this == APPROVED;
    }
}
