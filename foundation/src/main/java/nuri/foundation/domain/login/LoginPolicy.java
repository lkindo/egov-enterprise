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
import lombok.experimental.SuperBuilder;

/**
 * 로그인 정책 엔티티
 * 매핑 테이블: NLOGINPOLICY
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_LOGIN_POLICY")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class LoginPolicy extends BaseEntity {

    @Id
    @Column(name = "USER_ID", length = 20)
    private String emplyrId;

    @Column(name = "IP_ADDR", length = 30)
    private String ipInfo;

    @Column(name = "DPCN_PRM_YN", length = 1)
    private String dplctPermAt;

    @Column(name = "LMT_YN", length = 1)
    private String lmttAt;

    @Column(name = "BGNG_TM", length = 6)
    private String startTime; // HHmmss

    @Column(name = "END_TM", length = 6)
    private String endTime; // HHmmss

    @Column(name = "OTP_USE_YN", length = 1)
    private String otpEnabledAt;

    public void update(String ipInfo, String dplctPermAt, String lmttAt, String startTime, String endTime, String otpEnabledAt) {
        this.ipInfo = ipInfo;
        this.dplctPermAt = dplctPermAt;
        this.lmttAt = lmttAt;
        this.startTime = startTime;
        this.endTime = endTime;
        this.otpEnabledAt = otpEnabledAt;
    }
}
