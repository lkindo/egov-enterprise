package nuri.foundation.domain.user.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
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
    @JsonProperty("esntlId")
    private String esntlId;

    @Column(name = "user_id", nullable = false, length = 20, unique = true)
    @NonNull
    @JsonProperty("userId")
    private String userId;

    @Builder.Default
    @Column(name = "user_type_cd", nullable = false, length = 10)
    @JsonProperty("userType")
    private String userTypeCd = "EMP";

    @Column(name = "user_nm", nullable = false, length = 100)
    @NonNull
    @JsonProperty("userNm")
    private String userNm;

    @Column(name = "pswd", nullable = false, length = 300)
    @NonNull
    @JsonProperty("pswd")
    private String pswd;

    @Column(name = "pswd_hint", length = 300)
    @JsonProperty("pswdHint")
    private String pswdHint;

    @Column(name = "pswd_cnsr", length = 300)
    @JsonProperty("passwordCnsr")
    private String pswdCnsr;

    @Column(name = "chg_pswd_last_dt")
    @JsonProperty("passwordUpdateDate")
    private LocalDateTime chgPswdLastDt;

    @Column(name = "chg_pwd_cnt")
    @JsonProperty("changePasswordCount")
    private Integer chgPwdCnt;

    @Builder.Default
    @Column(name = "lck_yn", length = 1)
    @JsonProperty("lckYn")
    private String lckYn = "N";

    @Column(name = "lck_cnt")
    @JsonProperty("lockCount")
    private Integer lckCnt;

    @Column(name = "lck_last_pnttm")
    @JsonProperty("lockLastDate")
    private LocalDateTime lckLastPnttm;

    @Column(name = "otp_secret", length = 32)
    @JsonProperty("otpSecret")
    private String otpSecret;

    @Column(name = "crtfc_dn_value", length = 100)
    @JsonProperty("subDn")
    private String crtfcDnValue;

    // ■ 개인 정보
    @Column(name = "rrno", length = 256)
    @JsonProperty("ihidnum")
    private String rrno;

    @Column(name = "gndr_cd", length = 30)
    @JsonProperty("gndrCd")
    private String gndrCd;

    @Column(name = "brth_ymd", length = 8)
    @JsonProperty("brthYmd")
    private String brthYmd;

    @Column(name = "eml_addr", length = 50)
    @JsonProperty("emlAddr")
    private String emlAddr;

    @Column(name = "mbl_telno", length = 20)
    @JsonProperty("mblTelno")
    private String mblTelno;

    // ■ 주소 정보
    @Column(name = "zip", length = 5)
    @JsonProperty("zip")
    private String zip;

    @Column(name = "base_addr", length = 300)
    @JsonProperty("homeAddr")
    private String baseAddr;

    @Column(name = "dtl_addr", length = 300)
    @JsonProperty("daddr")
    private String dtlAddr;

    @Column(name = "area_no", length = 4)
    @JsonProperty("areaNo")
    private String areaNo;

    @Column(name = "middle_telno", length = 4)
    @JsonProperty("homemiddleTelno")
    private String middleTelno;

    @Column(name = "end_telno", length = 4)
    @JsonProperty("homeendTelno")
    private String endTelno;

    @Column(name = "fax_no", length = 30)
    @JsonProperty("faxNo")
    private String faxNo;

    @Column(name = "office_telno", length = 20)
    @JsonProperty("officeTelno")
    private String officeTelno;

    // ■ 조직 및 권한
    @Column(name = "group_id", length = 30)
    @JsonProperty("groupId")
    private String groupId;

    @Column(name = "ognz_id", length = 20)
    @JsonProperty("orgnztId")
    private String ognzId;

    @Column(name = "pstinst_cd", length = 30)
    @JsonProperty("insttCode")
    private String pstinstCd;

    @Column(name = "empl_no", length = 20)
    @JsonProperty("emplNo")
    private String emplNo;

    @Column(name = "ofcps_nm", length = 300)
    @JsonProperty("ofcpsNm")
    private String ofcpsNm;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "role", length = 50)
    @JsonProperty("role")
    private Role role = Role.USER;

    // ■ 기업 전용 (nullable)
    @Column(name = "bizr_no", length = 10)
    @JsonProperty("bizrno")
    private String bizrNo;

    @Column(name = "jurir_no", length = 13)
    @JsonProperty("jurirno")
    private String jurirNo;

    @Column(name = "cmpny_nm", length = 300)
    @JsonProperty("cmpnyNm")
    private String cmpnyNm;

    @Column(name = "rprsv_nm", length = 100)
    @JsonProperty("cxfc")
    private String rprsvNm;

    @Column(name = "induty_cd", length = 30)
    @JsonProperty("indutyCode")
    private String indutyCd;

    @Column(name = "ent_se_cd", length = 12)
    @JsonProperty("entrprsSeCode")
    private String entSeCd;

    // ■ 상태 및 감사
    @Builder.Default
    @Column(name = "user_stts_cd", length = 30)
    @JsonProperty("userSttsCd")
    private String userSttsCd = "P";

    @Column(name = "sbscrb_ymd", updatable = false, length = 8)
    @JsonProperty("sbscrbYmd")
    private String sbscrbYmd;

    public void update(String userNm, String pswdHint, String pswdCnsr,
            String emplNo, String rrno, String gndrCd, String brthYmd,
            String areaNo, String middleTelno, String endTelno,
            String faxNo, String baseAddr, String dtlAddr, String zip,
            String officeTelno, String mblTelno, String emlAddr, String ofcpsNm,
            String groupId, String ognzId, String pstinstCd, Role role, String crtfcDnValue) {
        if (userNm != null)
            this.userNm = userNm;
        this.pswdHint = pswdHint;
        this.pswdCnsr = pswdCnsr;
        this.emplNo = emplNo;
        this.rrno = rrno;
        this.gndrCd = gndrCd;
        this.brthYmd = brthYmd;
        this.areaNo = areaNo;
        this.middleTelno = middleTelno;
        this.endTelno = endTelno;
        this.faxNo = faxNo;
        this.baseAddr = baseAddr;
        this.dtlAddr = dtlAddr;
        this.zip = zip;
        this.officeTelno = officeTelno;
        this.mblTelno = mblTelno;
        this.emlAddr = emlAddr;
        this.ofcpsNm = ofcpsNm;
        this.groupId = groupId;
        this.ognzId = ognzId;
        this.pstinstCd = pstinstCd;
        if (role != null)
            this.role = role;
        this.crtfcDnValue = crtfcDnValue;
    }

    public void updatePassword(String pswd) {
        this.pswd = Objects.requireNonNull(pswd);
        this.chgPswdLastDt = LocalDateTime.now();
    }

    public void unlock() {
        this.lckYn = "N";
        this.lckCnt = 0;
        this.lckLastPnttm = null;
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
        if (this.lckCnt == null) {
            this.lckCnt = 1;
        } else {
            this.lckCnt++;
        }
    }

    public void updateStatus(String status) {
        this.userSttsCd = status;
    }

    public void updateOrgnztId(String ognzId) {
        this.ognzId = ognzId;
    }

    // ----- [Legacy Aliases for Backwards Compatibility] -----
    public String getUserType() { return userTypeCd; }
    public void setUserType(String v) { this.userTypeCd = v; }
    public String getPassword() { return pswd; }
    public void setPassword(String v) { this.pswd = v; }
    public String getPasswordHint() { return pswdHint; }
    public void setPasswordHint(String v) { this.pswdHint = v; }
    public String getPasswordCnsr() { return pswdCnsr; }
    public void setPasswordCnsr(String v) { this.pswdCnsr = v; }
    public String getPswdCrans() { return pswdCnsr; }
    public void setPswdCrans(String v) { this.pswdCnsr = v; }
    public LocalDateTime getPasswordUpdateDate() { return chgPswdLastDt; }
    public void setPasswordUpdateDate(LocalDateTime v) { this.chgPswdLastDt = v; }
    public Integer getChangePasswordCount() { return chgPwdCnt; }
    public void setChangePasswordCount(Integer v) { this.chgPwdCnt = v; }
    public String getLockAt() { return lckYn; }
    public void setLockAt(String v) { this.lckYn = v; }
    public Integer getLockCount() { return lckCnt; }
    public void setLockCount(Integer v) { this.lckCnt = v; }
    public LocalDateTime getLockLastDate() { return lckLastPnttm; }
    public void setLockLastDate(LocalDateTime v) { this.lckLastPnttm = v; }
    public String getSubDn() { return crtfcDnValue; }
    public void setSubDn(String v) { this.crtfcDnValue = v; }
    public String getIhidnum() { return rrno; }
    public void setIhidnum(String v) { this.rrno = v; }
    public String getHomeadres() { return baseAddr; }
    public void setHomeadres(String v) { this.baseAddr = v; }
    public String getDetailAdres() { return dtlAddr; }
    public void setDetailAdres(String v) { this.dtlAddr = v; }
    public String getHomeAddr() { return baseAddr; }
    public void setHomeAddr(String v) { this.baseAddr = v; }
    public String getDaddr() { return dtlAddr; }
    public void setDaddr(String v) { this.dtlAddr = v; }
    public String getHomemiddleTelno() { return middleTelno; }
    public void setHomemiddleTelno(String v) { this.middleTelno = v; }
    public String getHomeendTelno() { return endTelno; }
    public void setHomeendTelno(String v) { this.endTelno = v; }
    public String getOrgnztId() { return ognzId; }
    public void setOrgnztId(String v) { this.ognzId = v; }
    public String getInsttCode() { return pstinstCd; }
    public void setInsttCode(String v) { this.pstinstCd = v; }
    public String getBizrno() { return bizrNo; }
    public void setBizrno(String v) { this.bizrNo = v; }
    public String getJurirno() { return jurirNo; }
    public void setJurirno(String v) { this.jurirNo = v; }
    public String getCxfc() { return rprsvNm; }
    public void setCxfc(String v) { this.rprsvNm = v; }
    public String getIndutyCode() { return indutyCd; }
    public void setIndutyCode(String v) { this.indutyCd = v; }
    public String getEntrprsSeCode() { return entSeCd; }
    public void setEntrprsSeCode(String v) { this.entSeCd = v; }
    public String getStatusCode() { return userSttsCd; }
    public void setStatusCode(String v) { this.userSttsCd = v; }
    public String getSexdstnCode() { return gndrCd; }
    public void setSexdstnCode(String v) { this.gndrCd = v; }
    public String getBrth() { return brthYmd; }
    public void setBrth(String v) { this.brthYmd = v; }
    public String getFxnum() { return faxNo; }
    public void setFxnum(String v) { this.faxNo = v; }
}
