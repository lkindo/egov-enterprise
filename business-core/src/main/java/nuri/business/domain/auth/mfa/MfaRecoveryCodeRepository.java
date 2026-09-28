package nuri.business.domain.auth.mfa;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MfaRecoveryCodeRepository extends JpaRepository<MfaRecoveryCode, Long> {
    Optional<MfaRecoveryCode> findByCredentialIdAndCodeDigest(Long credentialId, String codeDigest);
    long countByCredentialIdAndUsedAtIsNull(Long credentialId);

    @Modifying(flushAutomatically = true)
    @Query("DELETE FROM MfaRecoveryCode c WHERE c.credentialId = :credentialId")
    int deleteForCredential(@Param("credentialId") Long credentialId);
}
