package com.company.project.domain.user.repository;

import com.company.project.domain.user.entity.UserAbsence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserAbsenceRepository extends JpaRepository<UserAbsence, String> {
}
