package nuri.business.domain.user.entity;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
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
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "esntl_id", length = 20)
    @NonNull
    private String esntlId;

    @Column(nullable = false, length = 20, unique = true)
    @NonNull
    private String userId;

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

    @Column(length = 300)
    private String pswdCrans;

    private LocalDateTime chgPswdLastDt;

    private Integer chgPwdCnt;

    @Column(length = 1)
    private String lckYn = "N";

    private Integer lckCnt;

    private LocalDateTime lckLastPnttm;

    @Column(length = 32)
    private String otpSecret;

    @Column(length = 100)
    private String certDnVl;

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

    @Column(length = 300)
    private String homeAddr;

    @Column(length = 300)
    private String daddr;

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
    // [V2_13] varchar(30)→20 정렬: 그룹 PK(group_id varchar(20))와 도메인 일치 (기존 값 0건 실측)
    @Column(name = "group_id", length = 20)
    private String groupId;

    @Column(name = "ognz_id", length = 20)
    private String ognzId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", referencedColumnName = "group_id", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private nuri.business.domain.group.GroupManage groupManage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ognz_id", referencedColumnName = "ognz_id", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private nuri.business.domain.organization.OrganizationManage organizationManage;

    @Column(length = 30)
    private String pstinstCd;

    @Column(length = 20)
    private String emplNo;

    @Column(length = 300)
    private String ofcpsNm;

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
    @Column(length = 12)
    private String userSttsCd = "P";

    @Column(updatable = false, length = 8)
    private String sbscrbYmd;

    public void update(String userNm, String pswdHint, String pswdCrans,
            String emplNo, String rrno, String gndrCd, String brthYmd,
            String areaNo, String middleTelno, String endTelno,
            String faxNo, String homeAddr, String daddr, String zip,
            String officeTelno, String mblTelno, String emlAddr, String ofcpsNm,
            String groupId, String ognzId, String pstinstCd, Role role, String certDnVl) {
        if (userNm != null)
            this.userNm = userNm;
        this.pswdHint = pswdHint;
        this.pswdCrans = pswdCrans;
        this.emplNo = emplNo;
        this.rrno = rrno;
        this.gndrCd = gndrCd;
        this.brthYmd = brthYmd;
        this.areaNo = areaNo;
        this.middleTelno = middleTelno;
        this.endTelno = endTelno;
        this.faxNo = faxNo;
        this.homeAddr = homeAddr;
        this.daddr = daddr;
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
        this.certDnVl = certDnVl;
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

    private User(String esntlId, String userId, String userTypeCd, String userNm, String pswd,
            String pswdHint, String pswdCrans, LocalDateTime chgPswdLastDt, Integer chgPwdCnt,
            String lckYn, Integer lckCnt, LocalDateTime lckLastPnttm, String otpSecret, String certDnVl,
            String rrno, String gndrCd, String brthYmd, String emlAddr, String mblTelno,
            String zip, String homeAddr, String daddr, String areaNo, String middleTelno, String endTelno,
            String faxNo, String officeTelno, String groupId, String ognzId, String pstinstCd,
            String emplNo, String ofcpsNm, Role role, String bizrNo, String jurirNo,
            String cmpnyNm, String rprsvNm, String indutyCd, String entSeCd, String userSttsCd, String sbscrbYmd) {
        this.esntlId = esntlId;
        this.userId = userId;
        this.userTypeCd = userTypeCd == null ? "EMP" : userTypeCd;
        this.userNm = userNm;
        this.pswd = pswd;
        this.pswdHint = pswdHint;
        this.pswdCrans = pswdCrans;
        this.chgPswdLastDt = chgPswdLastDt;
        this.chgPwdCnt = chgPwdCnt;
        this.lckYn = lckYn == null ? "N" : lckYn;
        this.lckCnt = lckCnt;
        this.lckLastPnttm = lckLastPnttm;
        this.otpSecret = otpSecret;
        this.certDnVl = certDnVl;
        this.rrno = rrno;
        this.gndrCd = gndrCd;
        this.brthYmd = brthYmd;
        this.emlAddr = emlAddr;
        this.mblTelno = mblTelno;
        this.zip = zip;
        this.homeAddr = homeAddr;
        this.daddr = daddr;
        this.areaNo = areaNo;
        this.middleTelno = middleTelno;
        this.endTelno = endTelno;
        this.faxNo = faxNo;
        this.officeTelno = officeTelno;
        this.groupId = groupId;
        this.ognzId = ognzId;
        this.pstinstCd = pstinstCd;
        this.emplNo = emplNo;
        this.ofcpsNm = ofcpsNm;
        this.role = role == null ? Role.USER : role;
        this.bizrNo = bizrNo;
        this.jurirNo = jurirNo;
        this.cmpnyNm = cmpnyNm;
        this.rprsvNm = rprsvNm;
        this.indutyCd = indutyCd;
        this.entSeCd = entSeCd;
        this.userSttsCd = userSttsCd == null ? "P" : userSttsCd;
        this.sbscrbYmd = sbscrbYmd;
    }

    @Builder
    public static User create(String esntlId, String userId, String userTypeCd, String userNm, String pswd,
            String pswdHint, String pswdCrans, LocalDateTime chgPswdLastDt, Integer chgPwdCnt,
            String lckYn, Integer lckCnt, LocalDateTime lckLastPnttm, String otpSecret, String certDnVl,
            String rrno, String gndrCd, String brthYmd, String emlAddr, String mblTelno,
            String zip, String homeAddr, String daddr, String areaNo, String middleTelno, String endTelno,
            String faxNo, String officeTelno, String groupId, String ognzId, String pstinstCd,
            String emplNo, String ofcpsNm, Role role, String bizrNo, String jurirNo,
            String cmpnyNm, String rprsvNm, String indutyCd, String entSeCd, String userSttsCd, String sbscrbYmd) {
        return new User(esntlId, userId, userTypeCd, userNm, pswd, pswdHint, pswdCrans, chgPswdLastDt, chgPwdCnt,
                lckYn, lckCnt, lckLastPnttm, otpSecret, certDnVl, rrno, gndrCd, brthYmd, emlAddr, mblTelno,
                zip, homeAddr, daddr, areaNo, middleTelno, endTelno, faxNo, officeTelno, groupId, ognzId, pstinstCd,
                emplNo, ofcpsNm, role, bizrNo, jurirNo, cmpnyNm, rprsvNm, indutyCd, entSeCd, userSttsCd, sbscrbYmd);
    }

    public void changeRole(Role role) {
        this.role = role;
    }

    public void lock() {
        this.lckYn = "Y";
    }

    public void changeUserId(String userId) {
        this.userId = userId;
    }

    public void changeUserTypeCd(String userTypeCd) {
        this.userTypeCd = userTypeCd;
    }

    public void changeOfficeTelno(String officeTelno) {
        this.officeTelno = officeTelno;
    }
}

