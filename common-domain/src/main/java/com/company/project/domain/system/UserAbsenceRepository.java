package com.company.project.domain.system;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserAbsenceRepository extends JpaRepository<UserAbsence, String> {
    Page<UserAbsence> findByUserNmContaining(String userNm, Pageable pageable);
}
