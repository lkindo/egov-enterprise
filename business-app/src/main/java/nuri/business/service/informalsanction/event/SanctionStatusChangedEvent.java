package nuri.business.service.informalsanction.event;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import nuri.business.domain.informalsanction.SanctionStatus;

/**
 * 결재 상태 변경 이벤트
 */
@Getter
@RequiredArgsConstructor
public class SanctionStatusChangedEvent {
    private final java.util.UUID eventId = java.util.UUID.randomUUID();
    private final Long informalSanctionSn;
    private final String applicantId;
    private final String sanctionerId;
    private final SanctionStatus newStatus;
    private final String reason;
    /** 문서 제목. 앱 내 알림이 '결재(번호 N)' 만이 아니라 어느 문서인지 말하는 데 쓴다. 없으면 번호만 말한다. */
    private final String documentTitle;
    /**
     * 결과가 난 차수(2026-11-25). 문자·메일 작업이 커밋 뒤 그 차수 이력에서 반려 사유를 읽는 데 쓴다 — 작업 원장에 사유를 복제하지
     * 않는다. 없으면 사유 없이 보낸다.
     */
    private final java.math.BigDecimal atrzCycl;

    public SanctionStatusChangedEvent(Long informalSanctionSn, String applicantId, String sanctionerId,
            SanctionStatus newStatus, String reason) {
        this(informalSanctionSn, applicantId, sanctionerId, newStatus, reason, null, null);
    }

    public SanctionStatusChangedEvent(Long informalSanctionSn, String applicantId, String sanctionerId,
            SanctionStatus newStatus, String reason, String documentTitle) {
        this(informalSanctionSn, applicantId, sanctionerId, newStatus, reason, documentTitle, null);
    }
}
