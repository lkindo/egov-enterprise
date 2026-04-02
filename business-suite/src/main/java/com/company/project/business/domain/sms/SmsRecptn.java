package com.company.project.business.domain.sms;

import jakarta.persistence.*;
import lombok.*;

/**
 * SMS ??뤿뻿 類ｋ궖 JPA Entity
 * ??뉕탢?????뵠?? COMTNSMSRECPTN
 */
@Entity
@Table(name = "NSMSRECPTN")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SmsRecptn {

    @EmbeddedId
    private SmsRecptnId id;

    @Column(name = "RESULT_CODE", length = 4)
    private String resultCode;

    @Column(name = "RESULT_MSSAGE", length = 4000)
    private String resultMssage;

    @Builder
    public SmsRecptn(String smsId, String recptnTelno, String resultCode, String resultMssage) {
        this.id = new SmsRecptnId(smsId, recptnTelno);
        this.resultCode = resultCode;
        this.resultMssage = resultMssage;
    }

    public String getSmsId() {
        return id != null ? id.getSmsId() : null;
    }

    public String getRecptnTelno() {
        return id != null ? id.getRecptnTelno() : null;
    }

    public void updateResult(String resultCode, String resultMssage) {
        this.resultCode = resultCode;
        this.resultMssage = resultMssage;
    }

}
