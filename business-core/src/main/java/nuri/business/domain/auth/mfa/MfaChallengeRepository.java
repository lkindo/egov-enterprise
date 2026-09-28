package nuri.business.domain.auth.mfa;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MfaChallengeRepository extends JpaRepository<MfaChallenge, Long> {
    Optional<MfaChallenge> findByTokenDigest(String tokenDigest);

    @Query("SELECT m.subject FROM MfaChallenge c, MfaCredential m WHERE c.credentialId = m.id AND c.tokenDigest = :digest")
    Optional<String> findSubjectByDigest(@Param("digest") String digest);

    @Modifying(flushAutomatically = true)
    @Query("DELETE FROM MfaChallenge c WHERE c.credentialId = :credentialId")
    int deleteForCredential(@Param("credentialId") Long credentialId);
}
