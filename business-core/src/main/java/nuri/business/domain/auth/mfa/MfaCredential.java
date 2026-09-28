package nuri.business.domain.auth.mfa;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import nuri.foundation.domain.common.BaseEntity;

@Entity
@Table(name = "tb_auth_otp_cert", uniqueConstraints =
        @UniqueConstraint(name = "uk_tb_auth_otp_cert_user_insd_idntfr", columnNames = "user_insd_idntfr"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MfaCredential extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "mfaCredentialSequence")
    @SequenceGenerator(name = "mfaCredentialSequence", sequenceName = "sq_auth_otp_cert", allocationSize = 1)
    @Column(name = "otp_cert_sn")
    private Long id;
    @Column(name = "user_insd_idntfr", nullable = false, length = 20)
    private String subject;
    @Column(name = "otp_secret_encpt_cn", length = 4000)
    private String encryptedSecret;
    @Column(name = "cert_stts_cd", nullable = false, length = 10)
    private String state;
    @Column(name = "cert_ver_no", nullable = false, length = 50)
    private String credentialVersion;
    @Column(name = "otp_last_scs_sn")
    private Long lastAcceptedStep;
    @Column(name = "fail_nmtm", nullable = false, precision = 10, scale = 0)
    private BigDecimal failureCount;
    @Column(name = "lck_dt")
    private LocalDateTime lockedAt;
    @Column(name = "cert_dt")
    private LocalDateTime confirmedAt;

    public static MfaCredential create(String subject) {
        MfaCredential credential = new MfaCredential();
        credential.subject = subject;
        credential.state = "NONE";
        credential.credentialVersion = UUID.randomUUID().toString();
        credential.failureCount = BigDecimal.ZERO;
        return credential;
    }

    public boolean isActive() { return "ACTIVE".equals(state); }
    public boolean requiresEnrollment() { return "RECOVER".equals(state); }
    public int failures() { return failureCount.intValueExact(); }

    public void beginEnrollment(String encrypted, String version) {
        encryptedSecret = encrypted;
        credentialVersion = version;
        // 분실 복구의 재등록 의무는 새 비밀번호 로그인으로 없어지지 않는다.
        state = requiresEnrollment() ? "RECOVER" : "PENDING";
        lastAcceptedStep = null;
    }

    public void accept(long step, LocalDateTime now) {
        lastAcceptedStep = step;
        confirmedAt = now;
        clearFailures();
    }

    public void activate() { state = "ACTIVE"; }

    public void recordFailure(LocalDateTime now) {
        failureCount = BigDecimal.valueOf(Math.min(5, failures() + 1));
        if (failures() >= 5) lockedAt = now;
    }

    public void clearFailures() { failureCount = BigDecimal.ZERO; lockedAt = null; }

    public void rotate(String version, String encrypted) {
        credentialVersion = version;
        encryptedSecret = encrypted;
    }

    public void revoke(boolean recoveryRequired) {
        state = recoveryRequired ? "RECOVER" : "NONE";
        credentialVersion = UUID.randomUUID().toString();
        encryptedSecret = null;
        lastAcceptedStep = null;
        confirmedAt = null;
        clearFailures();
    }
}
