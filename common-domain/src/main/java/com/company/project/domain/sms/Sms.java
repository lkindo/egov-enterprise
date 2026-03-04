package com.company.project.domain.sms;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * SMS JPA Entity
 * ??뉕탢?????뵠?? NSMS
 */
@Entity
@Table(name = "NSMS")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Sms extends BaseEntity {

    @Id
    @Column(name = "SMS_ID", length = 20)
    private String smsId;

    @Column(name = "TRNSMIS_TELNO", length = 20, nullable = false)
    private String trnsmitTelno;

    @Column(name = "TRNSMIS_CN", length = 2000)
    private String trnsmitCn;

    @Builder
    public Sms(String smsId, String trnsmitTelno, String trnsmitCn) {
        this.smsId = smsId;
        this.trnsmitTelno = trnsmitTelno;
        this.trnsmitCn = trnsmitCn;
    }
}