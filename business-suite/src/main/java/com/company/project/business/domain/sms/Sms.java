package com.company.project.business.domain.sms;

import com.company.project.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * SMS JPA Entity
 * 매핑 테이블: NSMS
 */
@Entity
@Table(name = "NSMS")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class Sms extends BaseEntity {

    @Id
    @Column(name = "SMS_ID", length = 20)
    private String smsId;

    @Column(name = "TRNSMIS_TELNO", length = 20, nullable = false)
    private String trnsmitTelno;

    @Column(name = "TRNSMIS_CN", length = 2000)
    private String trnsmitCn;
}
