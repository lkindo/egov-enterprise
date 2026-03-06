package com.company.project.domain.user.entity;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.envers.Audited;
import org.springframework.lang.NonNull;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * 사용자 정보 엔티티
 * 테이블: NEMPLYRINFO (전자정부 프레임워크 표준 기반)
 */
@Entity
@Table(name = "NEMPLYRINFO")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@Audited
public class User extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "EMPLYR_ID", length = 60)
    @NonNull
    private String userId;

    @Column(name = "ESNTL_ID", nullable = false, length = 20)
    @NonNull
    private String esntlId;

    @Column(name = "USER_NM", nullable = false, length = 180)
    @NonNull
    private String userNm;

    @Column(name = "PASSWORD", nullable = false, length = 600)
    @NonNull
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

    @Column(name = "FXNUM", length = 60)
    private String fxnum;

    @Column(name = "HOUSE_ADRES", length = 300)
    private String homeadres;

    @Column(name = "CHG_PWD_LAST_PNTTM", columnDefinition = "TIMESTAMP")
    private LocalDateTime passwordUpdateDate;

    @Column(name = "AREA_NO", length = 12)
    private String areaNo;

    @Column(name = "HOUSE_MIDDLE_TELNO", length = 12)
    private String homemiddleTelno;

    @Column(name = "HOUSE_END_TELNO", length = 12)
    private String homeendTelno;

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

    @Column(name = "PSTINST_CODE", length = 24)
    private String insttCode;

    @Column(name = "EMPLYR_STTUS_CODE", length = 45)
    private String empStatus;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "ROLE", length = 60)
    private Role role = Role.USER;

    @Column(name = "CHG_PWD_CNT")
    private Integer changePasswordCount;

    @Builder.Default
    @Column(name = "LOCK_AT", length = 1)
    private String lockAt = "N";

    @Column(name = "LOCK_CNT")
    private Integer lockCount;

    @Column(name = "LOCK_LAST_PNTTM")
    private LocalDateTime lockLastDate;

    @Column(name = "SBSCRB_DE")
    private LocalDateTime sbscrbDe;

    @Column(name = "CRTFC_DN_VALUE", length = 100)
    private String subDn;

    @PrePersist
    public void prePersist() {
        if (this.sbscrbDe == null) {
            this.sbscrbDe = LocalDateTime.now();
        }
    }

    public void update(String userNm, String passwordHint, String passwordCnsr,
            String emplNo, String ihidnum, String sexdstnCode, String brth,
            String areaNo, String homemiddleTelno, String homeendTelno,
            String fxnum, String homeadres, String detailAdres, String zip,
            String offmTelno, String moblphonNo, String emailAdres, String ofcpsNm,
            String groupId, String orgnztId, String insttCode, Role role, String subDn) {
        if (userNm != null) this.userNm = userNm;
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
        if (role != null) this.role = role;
        this.subDn = subDn;
    }

    public void updatePassword(String password) {
        this.password = Objects.requireNonNull(password);
        this.passwordUpdateDate = LocalDateTime.now();
    }

    public void unlock() {
        this.lockAt = "N";
        this.lockCount = 0;
        this.lockLastDate = null;
    }

    public void setAuthorCode(String authorCode) {
        if (authorCode != null) {
            try {
                String cleanRole = authorCode.startsWith("ROLE_") ? authorCode.substring(5) : authorCode;
                this.role = Role.valueOf(cleanRole);
            } catch (IllegalArgumentException e) {
                this.role = Role.USER;
            }
        }
    }

    public String getAuthorCode() {
        return this.role != null ? this.role.name() : null;
    }

    public void incrementLockCount() {
        if (this.lockCount == null) {
            this.lockCount = 1;
        } else {
            this.lockCount++;
        }
    }
}
