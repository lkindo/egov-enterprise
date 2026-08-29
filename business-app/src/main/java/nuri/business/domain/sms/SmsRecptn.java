package nuri.business.domain.sms;

import jakarta.persistence.*;
import lombok.*;
import nuri.foundation.domain.common.BaseEntity;

/**
 * SMS 수신 정보 엔티티.
 * 매핑 테이블: {@code tb_sms_rcptn}
 */
@Entity
@Table(name = "tb_sms_rcptn")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SmsRecptn extends BaseEntity {

    @EmbeddedId
    private SmsRecptnId id;

    @Column(length = 12)
    private String rsltCd;

    @Column(length = 4000)
    private String rsltMsg;

    @Builder
    public SmsRecptn(Long smsTrsmSn, String rcptnTelno, String rsltCd, String rsltMsg) {
        this.id = new SmsRecptnId(smsTrsmSn, rcptnTelno);
        this.rsltCd = rsltCd;
        this.rsltMsg = rsltMsg;
    }

    public Long getSmsTrsmSn() {
        return id != null ? id.getSmsTrsmSn() : null;
    }

    public String getRcptnTelno() {
        return id != null ? id.getRcptnTelno() : null;
    }

    public void updateResult(String rsltCd, String rsltMsg) {
        this.rsltCd = rsltCd;
        this.rsltMsg = rsltMsg;
    }

}
