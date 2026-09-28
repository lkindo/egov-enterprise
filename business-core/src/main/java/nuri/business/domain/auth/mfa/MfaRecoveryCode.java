package nuri.business.domain.auth.mfa;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import nuri.foundation.domain.common.BaseEntity;

@Entity
@Table(name = "tb_auth_rstr_cd", uniqueConstraints =
        @UniqueConstraint(name = "uk_tb_auth_rstr_cd_hash_vl", columnNames = "hash_vl"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MfaRecoveryCode extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "mfaRecoveryCodeSequence")
    @SequenceGenerator(name = "mfaRecoveryCodeSequence", sequenceName = "sq_auth_rstr_cd", allocationSize = 1)
    @Column(name = "rstr_cd_sn")
    private Long id;
    @Column(name = "otp_cert_sn", nullable = false)
    private Long credentialId;
    @Column(name = "cert_ver_no", nullable = false, length = 50)
    private String credentialVersion;
    @Column(name = "hash_vl", nullable = false, length = 64)
    private String codeDigest;
    @Column(name = "use_dt")
    private LocalDateTime usedAt;

    public static MfaRecoveryCode create(Long credentialId, String version, String digest) {
        MfaRecoveryCode code = new MfaRecoveryCode();
        code.credentialId = credentialId;
        code.credentialVersion = version;
        code.codeDigest = digest;
        return code;
    }

    public void consume(LocalDateTime now) { usedAt = now; }
}
