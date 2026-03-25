package com.company.project.foundation.domain.user.entity;

import com.company.project.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 기업회원 정보 Entity
 * 매핑 테이블: NENTRPRSMBER
 */
@Entity
@Table(name = "NENTRPRSMBER")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
@SuperBuilder
public class EnterpriseUser extends BaseEntity {

    @Column(name = "ESNTL_ID", nullable = false, length = 20)
    private String esntlId;

    @Id
    @Column(name = "ENTRPRS_MBER_ID", nullable = false, length = 20)
    private String entrprsmberId;

    @Column(name = "ENTRPRS_SE_CODE", length = 15)
    private String entrprsSeCode;

    @Column(name = "BIZRNO", length = 10)
    private String bizrno;

    @Column(name = "JURIRNO", length = 13)
    private String jurirno;

    @Column(name = "CMPNY_NM", length = 50)
    private String cmpnyNm;

    @Column(name = "CXFC", length = 50)
    private String cxfc;

    @Column(name = "ZIP", length = 6)
    private String zip;

    @Column(name = "ADRES", length = 100)
    private String adres;

    @Column(name = "ENTRPRS_MIDDLE_TELNO", length = 4)
    private String entrprsMiddleTelno;

    @Column(name = "FXNUM", length = 20)
    private String fxnum;

    @Column(name = "INDUTY_CODE", length = 15)
    private String indutyCode;

    @Column(name = "APPLCNT_NM", length = 50)
    private String applcntNm;

    @CreatedDate
    @Column(name = "SBSCRB_DE", updatable = false)
    private LocalDateTime sbscrbDe;

    @Column(name = "ENTRPRS_MBER_STTUS", length = 15)
    private String entrprsMberSttus;

    @Column(name = "ENTRPRS_MBER_PASSWORD", nullable = false, length = 600)
    private String entrprsMberPassword;

    @Column(name = "ENTRPRS_MBER_PASSWORD_HINT", length = 300)
    private String entrprsMberPasswordHint;

    @Column(name = "ENTRPRS_MBER_PASSWORD_CNSR", length = 300)
    private String entrprsMberPasswordCnsr;

    @Column(name = "GROUP_ID", length = 20)
    private String groupId;

    @Column(name = "DETAIL_ADRES", length = 100)
    private String detailAdres;

    @Column(name = "ENTRPRS_END_TELNO", length = 4)
    private String entrprsEndTelno;

    @Column(name = "AREA_NO", length = 4)
    private String areaNo;

    @Column(name = "APPLCNT_EMAIL_ADRES", length = 50)
    private String applcntEmailAdres;

    @Column(name = "APPLCNT_IHIDNUM", length = 600)
    private String applcntIhidnum;

    @Column(name = "LOCK_AT", length = 1)
    private String lockAt;

    @Column(name = "CHG_PWD_LAST_PNTTM")
    @Builder.Default
    private LocalDateTime chgPwdLastPnttm = LocalDateTime.now();

    public void update(String entrprsmberId, String entrprsSeCode, String bizrno, String jurirno, String cmpnyNm,
            String cxfc, String zip, String adres, String entrprsMiddleTelno, String fxnum,
            String indutyCode, String applcntNm, String entrprsMberSttus, String entrprsMberPasswordHint,
            String entrprsMberPasswordCnsr, String groupId, String detailAdres, String entrprsEndTelno,
            String areaNo, String applcntEmailAdres) {
        this.entrprsmberId = entrprsmberId;
        this.entrprsSeCode = entrprsSeCode;
        this.bizrno = bizrno;
        this.jurirno = jurirno;
        this.cmpnyNm = cmpnyNm;
        this.cxfc = cxfc;
        this.zip = zip;
        this.adres = adres;
        this.entrprsMiddleTelno = entrprsMiddleTelno;
        this.fxnum = fxnum;
        this.indutyCode = indutyCode;
        this.applcntNm = applcntNm;
        this.entrprsMberSttus = entrprsMberSttus;
        this.entrprsMberPasswordHint = entrprsMberPasswordHint;
        this.entrprsMberPasswordCnsr = entrprsMberPasswordCnsr;
        this.groupId = groupId;
        this.detailAdres = detailAdres;
        this.entrprsEndTelno = entrprsEndTelno;
        this.areaNo = areaNo;
        this.applcntEmailAdres = applcntEmailAdres;
    }

    public void updatePassword(String password) {
        this.entrprsMberPassword = password;
        this.chgPwdLastPnttm = LocalDateTime.now();
    }

    public void unlock() {
        this.lockAt = null;
    }
}
