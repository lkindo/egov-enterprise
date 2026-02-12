package com.company.project.domain.user;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 업무 사용자 정보 Entity
 * 레거시 테이블: NEMPLYRINFO
 */
@Entity
@Table(name = "NEMPLYRINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseEntity implements Serializable {

    @Id
    @Column(name = "EMPLYR_ID", length = 60)
    private String userId;

    @Column(name = "ESNTL_ID", nullable = false, length = 20)
    private String esntlId;

    @Column(name = "USER_NM", nullable = false, length = 180)
    private String userNm;

    @Column(name = "PASSWORD", nullable = false, length = 600)
    private String password;

    @Column(name = "PASSWORD_HINT", length = 300)
    private String passwordHint;

    @Column(name = "PASSWORD_CNSR", length = 300)
    private String passwordCnsr;

    @Column(name = "EMPL_NO", length = 60)
    private String emplNo;

    @Column(name = "IHIDNUM", length = 600)
    private String ihidnum;

    @Column(name = "SEXDSTN_CODE", length = 3)
    private String sexdstnCode;

    @Column(name = "BRTHDY", length = 60)
    private String brth;

    @Column(name = "AREA_NO", length = 12)
    private String areaNo;

    @Column(name = "HOUSE_MIDDLE_TELNO", length = 12)
    private String homemiddleTelno;

    @Column(name = "HOUSE_END_TELNO", length = 12)
    private String homeendTelno;

    @Column(name = "FXNUM", length = 60)
    private String fxnum;

    @Column(name = "HOUSE_ADRES", length = 300)
    private String homeadres;

    @Column(name = "DETAIL_ADRES", length = 300)
    private String detailAdres;

    @Column(name = "ZIP", length = 18)
    private String zip;

    @Column(name = "OFFM_TELNO", length = 60)
    private String offmTelno;

    @Column(name = "MBTLNUM", length = 60)
    private String moblphonNo;

    @Column(name = "EMAIL_ADRES", length = 150)
    private String emailAdres;

    @Column(name = "OFCPS_NM", length = 180)
    private String ofcpsNm;

    @Column(name = "GROUP_ID", length = 60)
    private String groupId;

    @Column(name = "ORGNZT_ID", length = 60)
    private String orgnztId;

    @Column(name = "PSTINST_CODE", length = 60)
    private String insttCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "EMPLYR_STTUS_CODE", length = 45)
    private Role role;

    @Transient
    @Setter
    private String authorCode;

    @Column(name = "SBSCRB_DE")
    private LocalDateTime sbscrbDe;

    @Column(name = "CRTFC_DN_VALUE", length = 600)
    private String subDn;

    @Column(name = "LOCK_AT", length = 1)
    private String lockAt;

    @Column(name = "LOCK_CNT")
    private Integer lockCnt;

    @Column(name = "LOCK_LAST_PNTTM")
    private LocalDateTime lockLastPnttm;

    @Column(name = "CHG_PWD_LAST_PNTTM")
    private LocalDateTime chgPwdLastPnttm;

    @Builder
    public User(String userId, String esntlId, String userNm, String password, String passwordHint, String passwordCnsr,
            String emplNo, String ihidnum, String sexdstnCode, String brth, String areaNo, String homemiddleTelno,
            String homeendTelno, String fxnum, String homeadres, String detailAdres, String zip, String offmTelno,
            String moblphonNo, String emailAdres, String ofcpsNm, String groupId, String orgnztId, String insttCode,
            Role role, String subDn, String authorCode, String lockAt) {
        this.userId = userId;
        this.esntlId = esntlId;
        this.userNm = userNm;
        this.password = password;
        this.passwordHint = passwordHint;
        this.passwordCnsr = passwordCnsr;
        this.emplNo = emplNo;
        this.ihidnum = ihidnum;
        this.sexdstnCode = sexdstnCode;
        this.brth = brth;
        this.areaNo = areaNo;
        this.homemiddleTelno = homemiddleTelno;
        this.homeendTelno = homeendTelno;
        this.fxnum = fxnum;
        this.homeadres = homeadres;
        this.detailAdres = detailAdres;
        this.zip = zip;
        this.offmTelno = offmTelno;
        this.moblphonNo = moblphonNo;
        this.emailAdres = emailAdres;
        this.ofcpsNm = ofcpsNm;
        this.groupId = groupId;
        this.orgnztId = orgnztId;
        this.insttCode = insttCode;
        this.role = role != null ? role : Role.USER;
        this.sbscrbDe = LocalDateTime.now();
        this.subDn = subDn;
        this.authorCode = authorCode;
        this.lockAt = lockAt;
    }

    public void update(String userNm, String passwordHint, String passwordCnsr, String emplNo, String ihidnum,
            String sexdstnCode, String brth, String areaNo, String homemiddleTelno, String homeendTelno,
            String fxnum, String homeadres, String detailAdres, String zip, String offmTelno,
            String moblphonNo, String emailAdres, String ofcpsNm, String groupId, String orgnztId,
            String insttCode, Role role, String subDn) {
        this.userNm = userNm;
        this.passwordHint = passwordHint;
        this.passwordCnsr = passwordCnsr;
        this.emplNo = emplNo;
        this.ihidnum = ihidnum;
        this.sexdstnCode = sexdstnCode;
        this.brth = brth;
        this.areaNo = areaNo;
        this.homemiddleTelno = homemiddleTelno;
        this.homeendTelno = homeendTelno;
        this.fxnum = fxnum;
        this.homeadres = homeadres;
        this.detailAdres = detailAdres;
        this.zip = zip;
        this.offmTelno = offmTelno;
        this.moblphonNo = moblphonNo;
        this.emailAdres = emailAdres;
        this.ofcpsNm = ofcpsNm;
        this.groupId = groupId;
        this.orgnztId = orgnztId;
        this.insttCode = insttCode;
        this.role = role;
        this.subDn = subDn;
    }

    public void updatePassword(String password) {
        this.password = password;
        this.chgPwdLastPnttm = LocalDateTime.now();
    }

    public void unlock() {
        this.lockAt = "N";
        this.lockCnt = 0;
        this.lockLastPnttm = null;
    }
}
