package com.company.project.domain.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository("userUserAbsenceRepository")
public interface UserAbsenceRepository extends JpaRepository<UserAbsence, String>, UserAbsenceRepositoryCustom {
}
