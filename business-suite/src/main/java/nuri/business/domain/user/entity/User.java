package nuri.business.domain.user.entity;

import nuri.business.domain.common.BaseEntity;
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
    @Column(nullable = false, length = 12)
    private String userTypeCd = "EMP";

    @Column(nullable = false, length = 100)
    @NonNull
    private String userNm;

    @Column(nullable = false, length = 300)
    @NonNull
    private String pswd;

    @Column(length = 300)
    private String pswdHint;

    @Column(name = "pswd_crans", length = 300)
    private String pswdCnsr;

    private LocalDateTime chgPswdLastDt;

    private Integer chgPwdCnt;

    @Builder.Default
    @Column(length = 1)
    private String lckYn = "N";

    private Integer lckCnt;

    private LocalDateTime lckLastPnttm;

    @Column(length = 32)
    private String otpSecret;

    @Column(name = "cert_dn_vl", length = 100)
    private String crtfcDnValue;

    // ■ 개인 정보
    @Column(length = 256)
    @Convert(converter = nuri.business.domain.common.RrnoEncryptionConverter.class)
    private String rrno;

    @Column(length = 30)
    private String gndrCd;

    @Column(length = 8)
    private String brthYmd;

    @Column(length = 50)
    private String emlAddr;

    @Column(length = 20)
    private String mblTelno;

    // ■ 주소 정보
    @Column(length = 5)
    private String zip;

    @Column(name = "home_addr", length = 300)
    private String baseAddr;

    @Column(name = "daddr", length = 300)
    private String dtlAddr;

    @Column(length = 4)
    private String areaNo;

    @Column(length = 4)
    private String middleTelno;

    @Column(length = 4)
    private String endTelno;

    @Column(length = 30)
    private String faxNo;

    @Column(length = 20)
    private String officeTelno;

    // ■ 조직 및 권한
    @Column(length = 30)
    private String groupId;

    @Column(length = 20)
    private String ognzId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "groupId", referencedColumnName = "group_id", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private nuri.business.domain.group.GroupManage groupManage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ognzId", referencedColumnName = "ognz_id", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private nuri.business.domain.organization.OrganizationManage organizationManage;

    @Column(length = 30)
    private String pstinstCd;

    @Column(length = 20)
    private String emplNo;

    @Column(length = 300)
    private String ofcpsNm;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private Role role = Role.USER;

    // ■ 기업 전용 (nullable)
    @Column(length = 10)
    private String bizrNo;

    @Column(length = 13)
    private String jurirNo;

    @Column(length = 300)
    private String cmpnyNm;

    @Column(length = 100)
    private String rprsvNm;

    @Column(length = 30)
    private String indutyCd;

    @Column(length = 12)
    private String entSeCd;

    // ■ 상태 및 감사
    @Builder.Default
    @Column(length = 12)
    private String userSttsCd = "P";

    @Column(updatable = false, length = 8)
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

    public void updateOgnzId(String ognzId) {
        this.ognzId = ognzId;
    }
}

