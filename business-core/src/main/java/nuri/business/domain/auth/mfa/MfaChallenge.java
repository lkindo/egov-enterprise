package nuri.business.domain.auth.mfa;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import nuri.foundation.domain.common.BaseEntity;
import nuri.foundation.security.mfa.MfaChallengePolicy.Purpose;

@Entity
@Table(name = "tb_auth_cert_dmnd", uniqueConstraints =
        @UniqueConstraint(name = "uk_tb_auth_cert_dmnd_hash_vl", columnNames = "hash_vl"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MfaChallenge extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "mfaChallengeSequence")
    @SequenceGenerator(name = "mfaChallengeSequence", sequenceName = "sq_auth_cert_dmnd", allocationSize = 1)
    @Column(name = "cert_dmnd_sn")
    private Long id;
    @Column(name = "otp_cert_sn", nullable = false)
    private Long credentialId;
    @Column(name = "hash_vl", nullable = false, length = 64)
    private String tokenDigest;
    @Enumerated(EnumType.STRING)
    @Column(name = "cert_type_cd", nullable = false, length = 10)
    private Purpose purpose;
    @Column(name = "cert_ver_no", nullable = false, length = 50)
    private String credentialVersion;
    @Column(name = "cert_bgng_dt", nullable = false)
    private LocalDateTime issuedAt;
    @Column(name = "cert_end_dt", nullable = false)
    private LocalDateTime expiresAt;
    @Column(name = "fail_nmtm", nullable = false, precision = 10, scale = 0)
    private BigDecimal failureCount;
    @Column(name = "use_dt")
    private LocalDateTime usedAt;

    public static MfaChallenge create(Long credentialId, String digest, Purpose purpose, String version,
            LocalDateTime issuedAt, LocalDateTime expiresAt) {
        MfaChallenge challenge = new MfaChallenge();
        challenge.credentialId = credentialId;
        challenge.tokenDigest = digest;
        challenge.purpose = purpose;
        challenge.credentialVersion = version;
        challenge.issuedAt = issuedAt;
        challenge.expiresAt = expiresAt;
        challenge.failureCount = BigDecimal.ZERO;
        return challenge;
    }

    public int failures() { return failureCount.intValueExact(); }
    public void fail() { failureCount = BigDecimal.valueOf(Math.min(5, failures() + 1)); }
    public void consume(LocalDateTime now) { usedAt = now; }
}
