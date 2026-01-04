package com.company.project.domain.sms;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * SMS JPA Entity
 * 레거시 테이블: COMTNSMS
 */
@Entity
@Table(name = "COMTNSMS")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Sms {

    @Id
    @Column(name = "SMS_ID", length = 20)
    private String smsId;

    @Column(name = "TRNSMIT_TELNO", length = 20, nullable = false)
    private String trnsmitTelno;

    @Column(name = "TRNSMIT_CN", length = 2000)
    private String trnsmitCn;

    @Column(name = "RECPTN_CNT")
    private Integer recptnCnt;

    @Column(name = "UNIQ_ID", length = 20)
    private String uniqId;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGISTER_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @OneToMany(mappedBy = "smsId", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SmsRecptn> recipients = new ArrayList<>();

    @Builder
    public Sms(String smsId, String trnsmitTelno, String trnsmitCn, Integer recptnCnt,
            String uniqId, String frstRegisterId) {
        this.smsId = smsId;
        this.trnsmitTelno = trnsmitTelno;
        this.trnsmitCn = trnsmitCn;
        this.recptnCnt = recptnCnt;
        this.uniqId = uniqId;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }
}
