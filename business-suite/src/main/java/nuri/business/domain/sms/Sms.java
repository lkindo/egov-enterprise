package nuri.business.domain.sms;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * SMS JPA Entity
 * 매핑 테이블: NSMS
 */
@Entity
@Table(name = "tb_sms_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class Sms extends BaseEntity {

    @Id
    @Column(name = "sms_id", length = 20)
    private String smsId;

    @Column(length = 13, nullable = false)
    private String sndngTelno;

    @Column(length = 4000)
    private String sndngCn;

    // ----- [Legacy Aliases for Backward Compatibility] -----

    @Deprecated
    public String getTrnsmitTelno() {
        return sndngTelno;
    }

    @Deprecated
    public String getTrnsmitCn() {
        return sndngCn;
    }

    public static abstract class SmsBuilder<C extends Sms, B extends SmsBuilder<C, B>> extends BaseEntityBuilder<C, B> {
        private String sndngTelno;
        private String sndngCn;

        @Deprecated
        public B trnsmitTelno(String trnsmitTelno) {
            this.sndngTelno = trnsmitTelno;
            return self();
        }

        @Deprecated
        public B trnsmitCn(String trnsmitCn) {
            this.sndngCn = trnsmitCn;
            return self();
        }
    }
}
