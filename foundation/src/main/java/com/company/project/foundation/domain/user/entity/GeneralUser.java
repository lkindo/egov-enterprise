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
 * 일반회원 정보 Entity
 * 매핑 테이블: NGNRLMBER
 */
@Entity
@Table(name = "NGNRLMBER")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
@SuperBuilder
public class GeneralUser extends BaseEntity {

    @Id
    @Column(name = "ESNTL_ID", length = 20)
    private String esntlId;

    @Column(name = "MBER_ID", nullable = false, length = 20)
    private String mberId;

    @Column(name = "MBER_NM", nullable = false, length = 50)
    private String mberNm;

    @Column(name = "PASSWORD", nullable = false, length = 600)
    private String password;

    @Column(name = "PASSWORD_HINT", length = 300)
    private String passwordHint;

    @Column(name = "PASSWORD_CNSR", length = 300)
    private String passwordCnsr;

    @Column(name = "IHIDNUM", length = 600)
    private String ihidnum;

    @Column(name = "SEXDSTN_CODE", length = 1)
    private String sexdstnCode;

    @Column(name = "ZIP", length = 6)
    private String zip;

    @Column(name = "ADRES", length = 300)
    private String adres;

    @Column(name = "AREA_NO", length = 4)
    private String areaNo;

    @Column(name = "MBER_STTUS", length = 15)
    private String mberSttus;

    @Column(name = "DETAIL_ADRES", length = 300)
    private String detailAdres;

    @Column(name = "END_TELNO", length = 4)
    private String endTelno;

    @Column(name = "MBTLNUM", length = 20)
    private String moblphonNo;

    @Column(name = "GROUP_ID", length = 20)
    private String groupId;

    @Column(name = "MBER_FXNUM", length = 20)
    private String mberFxnum;

    @Column(name = "MBER_EMAIL_ADRES", length = 50)
    private String mberEmailAdres;

    @Column(name = "MIDDLE_TELNO", length = 4)
    private String middleTelno;

    @CreatedDate
    @Column(name = "SBSCRB_DE", updatable = false)
    private LocalDateTime sbscrbDe;

    @Column(name = "LOCK_AT", length = 1)
    private String lockAt;

    @Column(name = "CHG_PWD_LAST_PNTTM")
    @Builder.Default
    private LocalDateTime chgPwdLastPnttm = LocalDateTime.now();

    public void update(String mberNm, String passwordHint, String passwordCnsr, String ihidnum, String sexdstnCode,
            String zip, String adres, String areaNo, String mberSttus, String detailAdres, String endTelno,
            String moblphonNo, String groupId, String mberFxnum, String mberEmailAdres, String middleTelno) {
        this.mberNm = mberNm;
        this.passwordHint = passwordHint;
        this.passwordCnsr = passwordCnsr;
        this.ihidnum = ihidnum;
        this.sexdstnCode = sexdstnCode;
        this.zip = zip;
        this.adres = adres;
        this.areaNo = areaNo;
        this.mberSttus = mberSttus;
        this.detailAdres = detailAdres;
        this.endTelno = endTelno;
        this.moblphonNo = moblphonNo;
        this.groupId = groupId;
        this.mberFxnum = mberFxnum;
        this.mberEmailAdres = mberEmailAdres;
        this.middleTelno = middleTelno;
    }

    public void updatePassword(String password) {
        this.password = password;
        this.chgPwdLastPnttm = LocalDateTime.now();
    }

    public void unlock() {
        this.lockAt = null;
    }
}
