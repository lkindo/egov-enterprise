package com.company.project.domain.vct;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository("commonUserAbsenceRepository")
public interface UserAbsenceDomainRepository extends JpaRepository<UserAbsenceVct, String> {
}
