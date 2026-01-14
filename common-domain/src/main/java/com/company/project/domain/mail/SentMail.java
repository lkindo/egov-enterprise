package com.company.project.domain.mail;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 발송메일 JPA Entity
 * 레거시 테이블: COMTNSNDNGMAIL
 */
@Entity
@Table(name = "NSNDNGMAIL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SentMail {

    @Id
    @Column(name = "MSSAGE_ID", length = 20)
    private String mssageId;

    @Column(name = "SJ", length = 255, nullable = false)
    private String sj;

    @Column(name = "EMAIL_CN", length = 4000)
    private String emailCn;

    @Column(name = "DSPTCH_PERSON", length = 100)
    private String dsptchPerson;

    @Column(name = "RECPTN_PERSON", length = 100)
    private String recptnPerson;

    @Column(name = "SNDNG_RESULT_CODE", length = 20)
    private String sndngResultCode;

    @Column(name = "SNDNG_DE", length = 20)
    private String sndngDe;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGISTER_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Builder
    public SentMail(String mssageId, String sj, String emailCn, String dsptchPerson,
            String recptnPerson, String sndngResultCode, String frstRegisterId) {
        this.mssageId = mssageId;
        this.sj = sj;
        this.emailCn = emailCn;
        this.dsptchPerson = dsptchPerson;
        this.recptnPerson = recptnPerson;
        this.sndngResultCode = sndngResultCode;
        this.sndngDe = java.time.LocalDate.now().toString().replace("-", "");
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void updateResult(String sndngResultCode) {
        this.sndngResultCode = sndngResultCode;
    }
}
