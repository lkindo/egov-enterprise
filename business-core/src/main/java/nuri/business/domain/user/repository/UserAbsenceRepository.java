package nuri.business.domain.user.repository;

import nuri.business.domain.user.entity.UserAbsence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserAbsenceRepository extends JpaRepository<UserAbsence, String> {
}
