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

    public SanctionStatusChangedEvent(Long informalSanctionSn, String applicantId, String sanctionerId,
            SanctionStatus newStatus, String reason) {
        this(informalSanctionSn, applicantId, sanctionerId, newStatus, reason, null);
    }
}
