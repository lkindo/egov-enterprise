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
@Table(name = "tb_sms_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class Sms extends BaseEntity {

    @Id
    @Column(name = "sms_id", length = 20)
    private String smsId;

    @Column(name = "sndng_telno", length = 13, nullable = false)
    private String trnsmitTelno;

    @Column(name = "sndng_cn", length = 4000)
    private String trnsmitCn;
}
