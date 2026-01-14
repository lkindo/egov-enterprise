package com.company.project.domain.sms;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;

/**
 * SMS 수신 정보 JPA Entity
 * 레거시 테이블: COMTNSMSRECPTN
 */
@Entity
@Table(name = "NSMSRECPTN")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@IdClass(SmsRecptnId.class)
public class SmsRecptn {

    @Id
    @Column(name = "SMS_ID", length = 20)
    private String smsId;

    @Id
    @Column(name = "RECPTN_TELNO", length = 20)
    private String recptnTelno;

    @Column(name = "RESULT_CODE", length = 4)
    private String resultCode;

    @Column(name = "RESULT_MSSAGE", length = 4000)
    private String resultMssage;

    @Builder
    public SmsRecptn(String smsId, String recptnTelno, String resultCode, String resultMssage) {
        this.smsId = smsId;
        this.recptnTelno = recptnTelno;
        this.resultCode = resultCode;
        this.resultMssage = resultMssage;
    }
}

@Data
@NoArgsConstructor
@AllArgsConstructor
class SmsRecptnId implements Serializable {
    private String smsId;
    private String recptnTelno;
}
