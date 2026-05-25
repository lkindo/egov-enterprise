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
    public SmsRecptn(String smsId, String recptnTelno, String resultCode, String resultMssage, String rsltCd, String rsltMsg) {
        this.id = new SmsRecptnId(smsId, recptnTelno);
        this.rsltCd = rsltCd != null ? rsltCd : resultCode;
        this.rsltMsg = rsltMsg != null ? rsltMsg : resultMssage;
    }

    public String getSmsId() {
        return id != null ? id.getSmsId() : null;
    }

    public String getRecptnTelno() {
        return id != null ? id.getRecptnTelno() : null;
    }

    public void updateResult(String rsltCd, String rsltMsg) {
        this.rsltCd = rsltCd;
        this.rsltMsg = rsltMsg;
    }

    // ----- [Legacy Aliases for Backward Compatibility] -----

    @Deprecated
    public String getResultCode() {
        return rsltCd;
    }

    @Deprecated
    public String getResultMssage() {
        return rsltMsg;
    }

}
