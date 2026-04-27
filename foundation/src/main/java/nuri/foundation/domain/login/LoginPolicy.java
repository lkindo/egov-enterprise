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
@Table(name = "NLOGINPOLICY")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class LoginPolicy extends BaseEntity {

    @Id
    @Column(name = "EMPLYR_ID", length = 20)
    private String emplyrId;

    @Column(name = "IP_INFO", length = 23)
    private String ipInfo;

    @Column(name = "DPLCT_PERM_AT", length = 1)
    private String dplctPermAt;

    @Column(name = "LMTT_AT", length = 1)
    private String lmttAt;

    @Column(name = "STRT_TM", length = 5)
    private String startTime; // HH:mm

    @Column(name = "END_TM", length = 5)
    private String endTime; // HH:mm

    @Column(name = "OTP_ENABLED_AT", length = 1)
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
