package com.company.project.domain.mail;
import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;

import jakarta.persistence.*;
import lombok.AccessLevel;

import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 獄쏆뮇?싷쭖遺우뵬 JPA Entity
 * ??뉕탢?????뵠?? COMTNSNDNGMAIL
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "HEMAILDSPTCHMANAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class SentMail extends BaseEntity {

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
