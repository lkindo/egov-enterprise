package nuri.business.domain.auth.mfa;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MfaCredentialRepository extends JpaRepository<MfaCredential, Long> {
    Optional<MfaCredential> findBySubject(String subject);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM MfaCredential c WHERE c.subject = :subject")
    Optional<MfaCredential> findBySubjectForUpdate(@Param("subject") String subject);
}
