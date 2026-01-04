package com.company.project.domain.vacation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository("commonUserAbsenceRepository")
public interface UserAbsenceRepository extends JpaRepository<UserAbsence, String> {
}
