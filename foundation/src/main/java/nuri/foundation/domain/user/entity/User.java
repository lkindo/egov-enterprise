package nuri.foundation.domain.user.entity;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import org.springframework.lang.NonNull;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * 통합 사용자 정보 엔티티
 * 테이블: NUSERINFO (업무/일반/기업 사용자 통합)
 * [Audit] BaseEntity 상속을 통해 일관된 감사 필드 제공
 */
@Entity
@Table(name = "TB_USER_INFO")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
public class User extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "ESNTL_ID", length = 20)
    @NonNull
    private String esntlId;

    @Column(name = "USER_ID", nullable = false, length = 30, unique = true)
    @NonNull
    private String userId;

    @Builder.Default
    @Column(name = "USER_TYPE_CD", nullable = false, length = 10)
    private String userType = "EMP";

    @Column(name = "USER_NM", nullable = false, length = 60)
    @NonNull
    private String userNm;

    @Column(name = "PSWD", nullable = false, length = 600)
    @NonNull
    private String password;

    @Column(name = "PSWD_HINT", length = 300)
    private String passwordHint;

    @Column(name = "PSWD_CNSR", length = 300)
    private String passwordCnsr;

    @Column(name = "CHG_PWD_LAST_PNTTM", columnDefinition = "TIMESTAMP")
    private LocalDateTime passwordUpdateDate;

    @Column(name = "CHG_PWD_CNT")
    private Integer changePasswordCount;

    @Builder.Default
    @Column(name = "LOCK_YN", length = 1)
    private String lockAt = "N";

    @Column(name = "LOCK_CNT")
    private Integer lockCount;

    @Column(name = "LOCK_LAST_PNTTM")
    private LocalDateTime lockLastDate;

    @Column(name = "OTP_SECRET", length = 32)
    private String otpSecret;

    @Column(name = "CRTFC_DN_VALUE", length = 100)
    private String subDn;

    // ■ 개인 정보
    @Column(name = "RRNO", length = 600)
    private String ihidnum;

    @Column(name = "GNDR_CD", length = 1)
    private String sexdstnCode;

    @Column(name = "BRTH_YMD", length = 20)
    private String brth;

    @Column(name = "EML_ADDR", length = 50)
    private String emailAdres;

    @Column(name = "MBL_TEL_NO", length = 20)
    private String moblphonNo;

    // ■ 주소 정보
    @Column(name = "ZIP", length = 6)
    private String zip;

    @Column(name = "BASE_ADDR", length = 300)
    private String homeadres;

    @Column(name = "DTL_ADDR", length = 300)
    private String detailAdres;

    @Column(name = "AREA_NO", length = 4)
    private String areaNo;

    @Column(name = "MIDDLE_TELNO", length = 4)
    private String homemiddleTelno;

    @Column(name = "END_TELNO", length = 4)
    private String homeendTelno;

    @Column(name = "FAX_NO", length = 20)
    private String fxnum;

    @Column(name = "OFFM_TELNO", length = 20)
    private String offmTelno;

    // ■ 조직 및 권한
    @Column(name = "GROUP_ID", length = 20)
    private String groupId;

    @Column(name = "OGNZ_ID", length = 20)
    private String orgnztId;

    @Column(name = "PSTINST_CD", length = 8)
    private String insttCode;

    @Column(name = "EMPL_NO", length = 20)
    private String emplNo;

    @Column(name = "OFCPS_NM", length = 60)
    private String ofcpsNm;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "ROLE", length = 50)
    private Role role = Role.USER;

    // ■ 기업 전용 (nullable)
    @Column(name = "BIZR_NO", length = 10)
    private String bizrno;

    @Column(name = "JURIR_NO", length = 13)
    private String jurirno;

    @Column(name = "CMPNY_NM", length = 50)
    private String cmpnyNm;

    @Column(name = "RPRSV_NM", length = 50)
    private String cxfc;

    @Column(name = "INDUTY_CD", length = 15)
    private String indutyCode;

    @Column(name = "ENT_SE_CD", length = 15)
    private String entrprsSeCode;

    // ■ 상태 및 감사
    @Builder.Default
    @Column(name = "USER_STTS_CD", length = 15)
    private String statusCode = "P";

    @Column(name = "SBSCRB_YMD", updatable = false, length = 8)
    private String sbscrbYmd;

    public void update(String userNm, String passwordHint, String passwordCnsr,
            String emplNo, String ihidnum, String sexdstnCode, String brth,
            String areaNo, String homemiddleTelno, String homeendTelno,
            String fxnum, String homeadres, String detailAdres, String zip,
            String offmTelno, String moblphonNo, String emailAdres, String ofcpsNm,
            String groupId, String orgnztId, String insttCode, Role role, String subDn) {
        if (userNm != null)
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
        if (role != null)
            this.role = role;
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

    public void updateStatus(String status) {
        this.statusCode = status;
    }

    public void updateOrgnztId(String orgnztId) {
        this.orgnztId = orgnztId;
    }
}
