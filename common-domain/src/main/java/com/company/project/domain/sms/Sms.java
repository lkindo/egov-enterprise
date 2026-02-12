package com.company.project.domain.sms;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * SMS JPA Entity
 * 레거시 테이블: NSMS
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

    @OneToMany(mappedBy = "smsId", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SmsRecptn> recipients = new ArrayList<>();

    @Builder
    public Sms(String smsId, String trnsmitTelno, String trnsmitCn) {
        this.smsId = smsId;
        this.trnsmitTelno = trnsmitTelno;
        this.trnsmitCn = trnsmitCn;
    }
}
