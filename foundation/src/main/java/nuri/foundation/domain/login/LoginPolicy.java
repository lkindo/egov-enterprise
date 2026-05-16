package nuri.foundation.domain.login;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

/**
 * 로그인 정책 엔티티
 * 매핑 테이블: TB_LOGIN_POLICY
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_LOGIN_POLICY")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class LoginPolicy extends BaseEntity {

    @Id
    @Column(name = "USER_ID", length = 20)
    private String userId;

    @Column(name = "IP_ADDR", length = 30)
    private String ipAddr;

    @Column(name = "DPCN_PRM_YN", length = 1)
    private String dpcnPrmYn;

    @Column(name = "LMT_YN", length = 1)
    private String lmtYn;

    @Column(name = "BGNG_TM", length = 6)
    private String bgngTm; // HHmmss

    @Column(name = "END_TM", length = 6)
    private String endTm; // HHmmss

    @Column(name = "OTP_USE_YN", length = 1)
    private String otpUseYn;

    public void update(String ipAddr, String dpcnPrmYn, String lmtYn, String bgngTm, String endTm, String otpUseYn) {
        this.ipAddr = ipAddr;
        this.dpcnPrmYn = dpcnPrmYn;
        this.lmtYn = lmtYn;
        this.bgngTm = bgngTm;
        this.endTm = endTm;
        this.otpUseYn = otpUseYn;
    }

    // Legacy aliases
    public String getEmplyrId() { return userId; }
    public String getIpInfo() { return ipAddr; }
    public String getLmttAt() { return lmtYn; }
    public String getDplctPermAt() { return dpcnPrmYn; }
    public String getStartTime() { return bgngTm; }
    public String getEndTime() { return endTm; }
    public String getOtpEnabledAt() { return otpUseYn; }
    
    public void setEmplyrId(String v) { this.userId = v; }
    public void setIpInfo(String v) { this.ipAddr = v; }
    public void setLmttAt(String v) { this.lmtYn = v; }
    public void setDplctPermAt(String v) { this.dpcnPrmYn = v; }
}
