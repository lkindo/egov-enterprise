package nuri.foundation.domain.user.repository;

import nuri.foundation.domain.user.entity.UserAbsence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserAbsenceRepository extends JpaRepository<UserAbsence, String> {
}
