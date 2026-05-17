package nuri.business.domain.sms;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * SMS JPA Entity
 * 매핑 테이블: NSMS
 */
@Entity
@Table(name = "TB_SMS_INFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class Sms extends BaseEntity {

    @Id
    @Column(name = "SMS_ID", length = 20)
    private String smsId;

    @Column(name = "SNDNG_TELNO", length = 20, nullable = false)
    private String trnsmitTelno;

    @Column(name = "SNDNG_CN", length = 2000)
    private String trnsmitCn;
}
