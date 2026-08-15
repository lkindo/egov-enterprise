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
    private final Long informalSanctionSn;
    private final String applicantId;
    private final String sanctionerId;
    private final SanctionStatus newStatus;
    private final String reason;
}
