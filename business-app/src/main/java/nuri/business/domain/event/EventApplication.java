package nuri.business.domain.event;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.domain.common.BaseEntity;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * 행사 참가 신청(V2_152). 한 사람은 한 행사에 한 행이며(UK), 취소한 뒤 다시 신청하면 같은 행을 신청으로 되돌린다. 신청자
 * ({@code aplcntId})는 esntlId 이고 감사 컬럼은 공통 계약대로 로그인 ID 다. 상태 전이의 자격(정원·마감·소유·관리 권한)은 서비스가
 * 행사 행을 잠근 뒤 판정하고, 여기서는 상태 순서만 지킨다.
 */
@Entity
@Table(name = "tb_evnt_aply")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EventApplication extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "evnt_aply_sn")
    private Long evntAplySn;

    @Version
    private Integer version;

    @Column(name = "evnt_sn", nullable = false, updatable = false)
    private Long evntSn;

    @Column(length = 20, nullable = false, updatable = false)
    private String aplcntId;

    @Column(length = 12, nullable = false)
    private String aplySttsCd;

    @Column(nullable = false)
    private LocalDateTime aplyDt;

    private LocalDateTime aplyPrcsDt;

    private LocalDateTime aplyRtrcnDt;

    public static EventApplication apply(Long evntSn, String applicantId, LocalDateTime at) {
        EventApplication application = new EventApplication();
        application.evntSn = Objects.requireNonNull(evntSn);
        application.aplcntId = Objects.requireNonNull(applicantId);
        application.aplySttsCd = EventApplicationStatus.APPLIED.name();
        application.aplyDt = Objects.requireNonNull(at);
        return application;
    }

    public EventApplicationStatus status() {
        return EventApplicationStatus.valueOf(aplySttsCd);
    }

    /** 취소한 신청을 다시 신청으로 되돌린다. 신청·승인 중이거나 반려된 신청은 되돌리지 않는다. */
    public void reapply(LocalDateTime at) {
        if (status() != EventApplicationStatus.CANCELLED) throw invalidState("취소한 신청만 다시 신청할 수 있습니다.");
        this.aplySttsCd = EventApplicationStatus.APPLIED.name();
        this.aplyDt = at;
        this.aplyPrcsDt = null;
        this.aplyRtrcnDt = null;
    }

    /** 본인 취소 — 신청·승인된 신청만. 자리를 돌려준다. */
    public void cancel(LocalDateTime at) {
        if (!status().occupiesSeat()) throw invalidState("신청 중이거나 승인된 신청만 취소할 수 있습니다.");
        this.aplySttsCd = EventApplicationStatus.CANCELLED.name();
        this.aplyRtrcnDt = at;
    }

    /** 관리자 승인 — 신청 상태만. */
    public void approve(LocalDateTime at) {
        if (status() != EventApplicationStatus.APPLIED) throw invalidState("신청 상태인 신청만 승인할 수 있습니다.");
        this.aplySttsCd = EventApplicationStatus.APPROVED.name();
        this.aplyPrcsDt = at;
    }

    /** 관리자 반려 — 신청·승인된 신청만. 자리를 돌려준다. */
    public void reject(LocalDateTime at) {
        if (!status().occupiesSeat()) throw invalidState("신청 중이거나 승인된 신청만 반려할 수 있습니다.");
        this.aplySttsCd = EventApplicationStatus.REJECTED.name();
        this.aplyPrcsDt = at;
    }

    private static BusinessException invalidState(String message) {
        return new BusinessException(CommonErrorCode.CONCURRENT_MODIFICATION, message);
    }
}
