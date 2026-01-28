package com.company.project.domain.mail;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 발송메일 JPA Entity
 * 레거시 테이블: COMTNSNDNGMAIL
 */
@Entity
@Table(name = "HEMAILDSPTCHMANAGE")
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

    @Column(name = "SNDR", length = 100)
    private String dsptchPerson;

    @Column(name = "RCVER", length = 100)
    private String recptnPerson;

    @Column(name = "SNDNG_RESULT_CODE", length = 20)
    private String sndngResultCode;

    @Column(name = "DSPTCH_DT", length = 20)
    private String sndngDe;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Builder
    public SentMail(String mssageId, String sj, String emailCn, String dsptchPerson,
            String recptnPerson, String sndngResultCode, String atchFileId) {
        this.mssageId = mssageId;
        this.sj = sj;
        this.emailCn = emailCn;
        this.dsptchPerson = dsptchPerson;
        this.recptnPerson = recptnPerson;
        this.sndngResultCode = sndngResultCode;
        // Legacy format: yyyy-MM-dd HH:mm:ss
        this.sndngDe = java.time.LocalDateTime.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        this.atchFileId = atchFileId;
    }

    public void updateResult(String sndngResultCode) {
        this.sndngResultCode = sndngResultCode;
    }
}
