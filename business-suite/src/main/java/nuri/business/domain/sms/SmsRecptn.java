package nuri.business.domain.sms;

import jakarta.persistence.*;
import lombok.*;

/**
 * SMS 수신 정보 JPA Entity
 * 매핑 테이블: NSMSRECPTN (레거시: COMTNSMSRECPTN)
 */
@Entity
@Table(name = "tb_sms_rcptn")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SmsRecptn {

    @EmbeddedId
    private SmsRecptnId id;

    @Column(length = 12)
    private String rsltCd;

    @Column(length = 4000)
    private String rsltMsg;

    @Builder
    public SmsRecptn(String smsId, String rcptnTelno, String rsltCd, String rsltMsg) {
        this.id = new SmsRecptnId(smsId, rcptnTelno);
        this.rsltCd = rsltCd;
        this.rsltMsg = rsltMsg;
    }

    public String getSmsId() {
        return id != null ? id.getSmsId() : null;
    }

    public String getRcptnTelno() {
        return id != null ? id.getRcptnTelno() : null;
    }

    public void updateResult(String rsltCd, String rsltMsg) {
        this.rsltCd = rsltCd;
        this.rsltMsg = rsltMsg;
    }

    // 레거시 별칭 완전 철폐 (표준화 동기화)

}
