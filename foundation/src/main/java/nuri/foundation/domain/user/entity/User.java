package nuri.foundation.domain.user.entity;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import org.springframework.lang.NonNull;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * 통합 사용자 정보 엔티티
 * 테이블: TB_USER_INFO
 */
@Entity
@Table(name = "tb_user_info")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
public class User extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "esntl_id", length = 20)
    @NonNull
    private String esntlId;

    @Column(name = "user_id", nullable = false, length = 20, unique = true)
    @NonNull
    private String userId;

    @Builder.Default
    @Column(name = "user_type_cd", nullable = false, length = 10)
    private String userType = "EMP";

    @Column(name = "user_nm", nullable = false, length = 100)
    @NonNull
    private String userNm;

    @Column(name = "pswd", nullable = false, length = 300)
    @NonNull
    private String pswd;

    @Column(name = "pswd_hint", length = 300)
    private String pswdHint;

    @Column(name = "pswd_cnsr", length = 300)
    private String pswdCrans;

    @Column(name = "chg_pswd_last_dt")
    private LocalDateTime passwordUpdateDate;

    @Column(name = "chg_pwd_cnt")
    private Integer changePasswordCount;

    @Builder.Default
    @Column(name = "lck_yn", length = 1)
    private String lckYn = "N";

    @Column(name = "lck_cnt")
    private Integer lockCount;

    @Column(name = "lck_last_pnttm")
    private LocalDateTime lockLastDate;

    @Column(name = "otp_secret", length = 32)
    private String otpSecret;

    @Column(name = "crtfc_dn_value", length = 100)
    private String subDn;

    // ■ 개인 정보
    @Column(name = "rrno", length = 256)
    private String ihidnum;

    @Column(name = "gndr_cd", length = 30)
    private String gndrCd;

    @Column(name = "brth_ymd", length = 8)
    private String brthYmd;

    @Column(name = "eml_addr", length = 50)
    private String emlAddr;

    @Column(name = "mbl_telno", length = 20)
    private String mblTelno;

    // ■ 주소 정보
    @Column(name = "zip", length = 5)
    private String zip;

    @Column(name = "base_addr", length = 300)
    private String homeAddr;

    @Column(name = "dtl_addr", length = 300)
    private String daddr;

    @Column(name = "area_no", length = 4)
    private String areaNo;

    @Column(name = "middle_telno", length = 4)
    private String homemiddleTelno;

    @Column(name = "end_telno", length = 4)
    private String homeendTelno;

    @Column(name = "fax_no", length = 30)
    private String faxNo;

    @Column(name = "office_telno", length = 20)
    private String officeTelno;

    // ■ 조직 및 권한
    @Column(name = "group_id", length = 30)
    private String groupId;

    @Column(name = "ognz_id", length = 20)
    private String orgnztId;

    @Column(name = "pstinst_cd", length = 30)
    private String insttCode;

    @Column(name = "empl_no", length = 20)
    private String emplNo;

    @Column(name = "ofcps_nm", length = 300)
    private String ofcpsNm;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "role", length = 50)
    private Role role = Role.USER;

    // ■ 기업 전용 (nullable)
    @Column(name = "bizr_no", length = 10)
    private String bizrno;

    @Column(name = "jurir_no", length = 13)
    private String jurirno;

    @Column(name = "cmpny_nm", length = 300)
    private String cmpnyNm;

    @Column(name = "rprsv_nm", length = 100)
    private String cxfc;

    @Column(name = "induty_cd", length = 30)
    private String indutyCode;

    @Column(name = "ent_se_cd", length = 12)
    private String entrprsSeCode;

    // ■ 상태 및 감사
    @Builder.Default
    @Column(name = "user_stts_cd", length = 30)
    private String userSttsCd = "P";

    @Column(name = "sbscrb_ymd", updatable = false, length = 8)
    private String sbscrbYmd;

    public void update(String userNm, String pswdHint, String pswdCrans,
            String emplNo, String ihidnum, String gndrCd, String brthYmd,
            String areaNo, String homemiddleTelno, String homeendTelno,
            String faxNo, String homeAddr, String daddr, String zip,
            String officeTelno, String mblTelno, String emlAddr, String ofcpsNm,
            String groupId, String orgnztId, String insttCode, Role role, String subDn) {
        if (userNm != null)
            this.userNm = userNm;
        this.pswdHint = pswdHint;
        this.pswdCrans = pswdCrans;
        this.emplNo = emplNo;
        this.ihidnum = ihidnum;
        this.gndrCd = gndrCd;
        this.brthYmd = brthYmd;
        this.areaNo = areaNo;
        this.homemiddleTelno = homemiddleTelno;
        this.homeendTelno = homeendTelno;
        this.faxNo = faxNo;
        this.homeAddr = homeAddr;
        this.daddr = daddr;
        this.zip = zip;
        this.officeTelno = officeTelno;
        this.mblTelno = mblTelno;
        this.emlAddr = emlAddr;
        this.ofcpsNm = ofcpsNm;
        this.groupId = groupId;
        this.orgnztId = orgnztId;
        this.insttCode = insttCode;
        if (role != null)
            this.role = role;
        this.subDn = subDn;
    }

    public void updatePassword(String pswd) {
        this.pswd = Objects.requireNonNull(pswd);
        this.passwordUpdateDate = LocalDateTime.now();
    }

    public void unlock() {
        this.lckYn = "N";
        this.lockCount = 0;
        this.lockLastDate = null;
    }

    public void setAuthorCode(String authorCode) {
        if (authorCode != null) {
            try {
                String cleanRole = authorCode.startsWith("ROLE_") ? authorCode.substring(5) : authorCode;
                this.role = Role.USER;
                for (Role r : Role.values()) {
                    if (r.name().equalsIgnoreCase(cleanRole)) {
                        this.role = r;
                        break;
                    }
                }
            } catch (Exception e) {
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

    public void updateStatus(String status) {
        this.userSttsCd = status;
    }

    public void updateOrgnztId(String orgnztId) {
        this.orgnztId = orgnztId;
    }

    // ----- [Legacy Aliases] -----
    public String getPassword() { return pswd; }
    public String getPasswordHint() { return pswdHint; }
    public String getPasswordCnsr() { return pswdCrans; }
    public String getHomeadres() { return homeAddr; }
    public String getDetailAdres() { return daddr; }
    public String getMoblphonNo() { return mblTelno; }
    public String getEmailAdres() { return emlAddr; }
    public String getOffmTelno() { return officeTelno; }
    public String getSexdstnCode() { return gndrCd; }
    public String getBrth() { return brthYmd; }
    public String getFxnum() { return faxNo; }
    public String getLockAt() { return lckYn; }
    public String getStatusCode() { return userSttsCd; }
    
    public void setPassword(String v) { this.pswd = v; }
    public void setPasswordHint(String v) { this.pswdHint = v; }
    public void setPasswordCnsr(String v) { this.pswdCrans = v; }
    public void setHomeadres(String v) { this.homeAddr = v; }
    public void setDetailAdres(String v) { this.daddr = v; }
    public void setMoblphonNo(String v) { this.mblTelno = v; }
    public void setEmailAdres(String v) { this.emlAddr = v; }
    public void setOffmTelno(String v) { this.officeTelno = v; }
    public void setSexdstnCode(String v) { this.gndrCd = v; }
    public void setBrth(String v) { this.brthYmd = v; }
    public void setFxnum(String v) { this.faxNo = v; }
    public void setLockAt(String v) { this.lckYn = v; }
}
