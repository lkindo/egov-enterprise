package nuri.business.domain.login;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 로그인 정책 엔티티
 * 매핑 테이블: TB_LOGIN_POLICY
 */
@Entity
@Table(name = "tb_login_policy")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LoginPolicy extends BaseEntity {

    @Id
    @Column(length = 20)
    private String userId;

    @Column(length = 30)
    private String ipAddr;

    @Column(length = 1)
    private String dpcnPrmYn;

    @Column(length = 1)
    private String lmtYn;

    @Column(length = 6)
    private String bgngTm; // HHmmss

    @Column(length = 6)
    private String endTm; // HHmmss

    @Column(length = 1)
    private String otpUseYn;

    private LoginPolicy(String userId, String ipAddr, String dpcnPrmYn, String lmtYn, String bgngTm, String endTm, String otpUseYn) {
        this.userId = userId;
        this.ipAddr = ipAddr;
        this.dpcnPrmYn = dpcnPrmYn;
        this.lmtYn = lmtYn;
        this.bgngTm = bgngTm;
        this.endTm = endTm;
        this.otpUseYn = otpUseYn;
    }

    @Builder
    public static LoginPolicy create(String userId, String ipAddr, String dpcnPrmYn, String lmtYn, String bgngTm, String endTm, String otpUseYn) {
        return new LoginPolicy(userId, ipAddr, dpcnPrmYn, lmtYn, bgngTm, endTm, otpUseYn);
    }

    public void update(String ipAddr, String dpcnPrmYn, String lmtYn, String bgngTm, String endTm, String otpUseYn) {
        this.ipAddr = ipAddr;
        this.dpcnPrmYn = dpcnPrmYn;
        this.lmtYn = lmtYn;
        this.bgngTm = bgngTm;
        this.endTm = endTm;
        this.otpUseYn = otpUseYn;
    }
}